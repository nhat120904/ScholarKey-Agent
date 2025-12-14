"""Supervisor Agent - Central orchestrator for multi-agent system."""

import json
import logging
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from scholar_agent.agents.llm import LLMConfig, get_llm
from scholar_agent.agents.profile_agent import ProfileState
from scholar_agent.agents.state import (
    HandoffMessage,
    HandoffResponse,
    SupervisorState,
)
from scholar_agent.models import StudyLevel

logger = logging.getLogger(__name__)


# System prompts for the Supervisor
SUPERVISOR_SYSTEM_PROMPT = """You are ScholarKey AI, an intelligent scholarship search assistant.
You help students find scholarships, analyze their profiles, and create application plans.

Your role is to:
1. Understand what the user wants to do
2. Route tasks to specialized agents (profile, search, or plan)
3. Provide helpful responses and guide users through the process

You can help with:
- Analyzing CVs/resumes to extract student profiles
- Searching for scholarships matching their qualifications
- Creating personalized application plans with timelines

Be friendly, professional, and proactive in suggesting next steps."""


INTENT_CLASSIFICATION_PROMPT = """Analyze the user's message and determine their intent.

User message: {message}

Current context:
- Has profile: {has_profile}
- Has search results: {has_search_results}
- Has application plan: {has_plan}

Classify the intent into ONE of these categories:

1. "profile" - User wants to:
   - Upload or analyze their CV/resume
   - Update their profile information (GPA, test scores, etc.)
   - Get profile analysis or suggestions
   - Provide personal information

2. "search" - User wants to:
   - Search for scholarships
   - Find programs or universities
   - Filter or refine search results
   - Get more details about a scholarship

3. "plan" - User wants to:
   - Create an application plan
   - Get timeline for applications
   - Prioritize scholarships
   - Export their plan to Excel/PDF

4. "respond" - User is:
   - Asking a general question
   - Making small talk
   - Asking about what you can do
   - Confirming or acknowledging information

Respond with ONLY a JSON object:
{{"intent": "profile|search|plan|respond", "reasoning": "brief explanation"}}"""


class SupervisorGraph:
    """Main supervisor graph orchestrating all specialized agents."""

    def __init__(self) -> None:
        """Initialize the supervisor with LLM and agent references."""
        self.llm = get_llm(
            temperature=LLMConfig.CHAT_TEMPERATURE,
            max_tokens=LLMConfig.CHAT_MAX_TOKENS,
        )
        self.intent_llm = get_llm(
            temperature=LLMConfig.INTENT_TEMPERATURE,
            max_tokens=LLMConfig.INTENT_MAX_TOKENS,
        )
        self._graph: CompiledStateGraph | None = None

    def build_graph(self) -> CompiledStateGraph:
        """Build the LangGraph workflow for supervisor.

        Returns:
            Compiled StateGraph for the supervisor.
        """
        workflow = StateGraph(SupervisorState)

        # Add nodes
        workflow.add_node("analyze_intent", self._analyze_intent)
        workflow.add_node("profile_agent", self._run_profile_agent)
        workflow.add_node("search_agent", self._run_search_agent)
        workflow.add_node("plan_agent", self._run_plan_agent)
        workflow.add_node("respond_to_user", self._respond_to_user)

        # Entry point
        workflow.set_entry_point("analyze_intent")

        # Conditional routing based on intent
        workflow.add_conditional_edges(
            "analyze_intent",
            self._route_to_agent,
            {
                "profile": "profile_agent",
                "search": "search_agent",
                "plan": "plan_agent",
                "respond": "respond_to_user",
            },
        )

        # All agents return to supervisor for final response
        workflow.add_edge("profile_agent", "respond_to_user")
        workflow.add_edge("search_agent", "respond_to_user")
        workflow.add_edge("plan_agent", "respond_to_user")
        workflow.add_edge("respond_to_user", END)

        self._graph = workflow.compile()
        return self._graph

    @property
    def graph(self) -> CompiledStateGraph:
        """Get compiled graph, building if necessary."""
        if self._graph is None:
            self._graph = self.build_graph()
        return self._graph

    async def _analyze_intent(self, state: SupervisorState) -> SupervisorState:
        """Analyze user message and determine the appropriate action.

        Args:
            state: Current supervisor state.

        Returns:
            Updated state with intent classification.
        """
        logger.info("Analyzing user intent...")

        # Get the last user message
        messages = state.get("messages", [])
        last_message = ""
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage) or (
                hasattr(msg, "type") and msg.type == "human"
            ):
                last_message = msg.content if hasattr(msg, "content") else str(msg)
                break

        if not last_message:
            state["current_agent"] = "respond"
            return state

        # Check context
        has_profile = state.get("profile") is not None
        has_search_results = bool(state.get("search_results"))
        has_plan = state.get("application_plan") is not None

        # Use LLM to classify intent
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            message=last_message,
            has_profile=has_profile,
            has_search_results=has_search_results,
            has_plan=has_plan,
        )

        try:
            response = await self.intent_llm.ainvoke(
                [
                    SystemMessage(
                        content="You are an intent classifier. Respond only with JSON."
                    ),
                    HumanMessage(content=prompt),
                ]
            )

            # Parse response
            response_text = response.content
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                result = json.loads(response_text[json_start:json_end])
                intent = result.get("intent", "respond")
                logger.info(
                    f"Classified intent: {intent} - {result.get('reasoning', '')}"
                )
            else:
                intent = "respond"

        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            intent = "respond"

        state["current_agent"] = intent

        # Update dialog state
        dialog_state = state.get("dialog_state", [])
        if dialog_state is None:
            dialog_state = []
        state["dialog_state"] = dialog_state + ["supervisor"]

        return state

    def _route_to_agent(self, state: SupervisorState) -> str:
        """Route to the appropriate agent based on analyzed intent.

        Args:
            state: Current supervisor state.

        Returns:
            Name of the next node to route to.
        """
        return state.get("current_agent", "respond")

    async def _run_profile_agent(self, state: SupervisorState) -> SupervisorState:
        """Execute the Profile Agent workflow.

        Args:
            state: Current supervisor state.

        Returns:
            Updated state with profile agent results.
        """
        logger.info("Running Profile Agent...")

        from scholar_agent.agents.profile_agent import ProfileAgent

        # Create handoff message
        handoff = HandoffMessage(
            from_agent="supervisor",
            to_agent="profile",
            intent="analyze_profile",
            context={
                "profile": state.get("profile"),
                "messages": [str(m) for m in state.get("messages", [])[-5:]],
            },
            conversation_summary="User wants to update or analyze their profile.",
        )
        state["last_handoff"] = handoff

        # Initialize and run profile agent
        agent = ProfileAgent()

        # Get last user message for chat input
        last_message = ""
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or (
                hasattr(msg, "type") and msg.type == "human"
            ):
                last_message = msg.content if hasattr(msg, "content") else str(msg)
                break

        # Run the profile agent's workflow
        existing_profile = state.get("profile")
        profile_state: ProfileState = {
            "messages": [],
            "cv_text": None,
            "chat_input": last_message,
            "extracted_data": {},
            "profile": existing_profile,
            "target_country": existing_profile.target_country
            if existing_profile
            else "USA",
            "desired_field": existing_profile.desired_field if existing_profile else "",
            "level": existing_profile.level if existing_profile else StudyLevel.MASTER,
            "errors": [],
            "current_step": "start",
        }

        try:
            graph = agent._build_graph()
            result = await graph.ainvoke(profile_state)

            # Update supervisor state with results
            if result.get("profile"):
                state["profile"] = result["profile"]

            # Create handoff response
            response = HandoffResponse(
                from_agent="profile",
                to_agent="supervisor",
                status="completed",
                result={
                    "profile": result.get("profile"),
                    "extracted_data": result.get("extracted_data", {}),
                    "suggestions": result.get("suggestions", []),
                },
                messages_for_user=["Profile analysis completed."],
            )
            state["last_response"] = response

        except Exception as e:
            logger.error(f"Profile agent error: {e}")
            response = HandoffResponse(
                from_agent="profile",
                to_agent="supervisor",
                status="error",
                result={"error": str(e)},
                messages_for_user=[
                    f"I encountered an issue while processing your profile: {e}"
                ],
            )
            state["last_response"] = response

        # Update dialog state
        dialog_state = state.get("dialog_state", [])
        if dialog_state is None:
            dialog_state = []
        state["dialog_state"] = dialog_state + ["profile"]

        return state

    async def _run_search_agent(self, state: SupervisorState) -> SupervisorState:
        """Execute the Search Agent workflow.

        Args:
            state: Current supervisor state.

        Returns:
            Updated state with search agent results.
        """
        logger.info("Running Search Agent...")

        from scholar_agent.agents.scholarship_agent import ScholarshipAgent
        from scholar_agent.models import SearchMode

        # Create handoff message
        handoff = HandoffMessage(
            from_agent="supervisor",
            to_agent="search",
            intent="search_scholarships",
            context={
                "profile": state.get("profile"),
                "existing_results": len(state.get("search_results", []) or []),
            },
            conversation_summary="User wants to search for scholarships.",
        )
        state["last_handoff"] = handoff

        profile = state.get("profile")
        if not profile:
            # Need profile first
            response = HandoffResponse(
                from_agent="search",
                to_agent="supervisor",
                status="needs_clarification",
                result={},
                messages_for_user=[
                    "I need your profile information before searching for scholarships. "
                    "Please upload your CV or tell me about your academic background, "
                    "target country, and desired field of study."
                ],
                follow_up_actions=["upload_cv", "provide_profile"],
            )
            state["last_response"] = response
            return state

        # Initialize and run search agent
        agent = ScholarshipAgent()

        search_state = {
            "messages": [],
            "profile": profile,
            "search_mode": SearchMode.BY_SCHOLARSHIP,
            "school_name": None,
            "program_name": None,
            "scholarships": [],
            "programs": [],
            "crawled_urls": [],
            "current_step": "start",
            "hedera_tx_id": None,
        }

        try:
            graph = agent._build_graph()
            result = await graph.ainvoke(search_state)

            # Update supervisor state with results
            scholarships = result.get("scholarships", [])
            state["search_results"] = scholarships

            # Create handoff response
            response = HandoffResponse(
                from_agent="search",
                to_agent="supervisor",
                status="completed",
                result={
                    "scholarships_count": len(scholarships),
                    "scholarships": scholarships,
                },
                messages_for_user=[
                    f"Found {len(scholarships)} potential scholarships matching your profile."
                ],
                follow_up_actions=["view_details", "create_plan", "refine_search"],
            )
            state["last_response"] = response

        except Exception as e:
            logger.error(f"Search agent error: {e}")
            response = HandoffResponse(
                from_agent="search",
                to_agent="supervisor",
                status="error",
                result={"error": str(e)},
                messages_for_user=[f"I encountered an issue while searching: {e}"],
            )
            state["last_response"] = response

        # Update dialog state
        dialog_state = state.get("dialog_state", [])
        if dialog_state is None:
            dialog_state = []
        state["dialog_state"] = dialog_state + ["search"]

        return state

    async def _run_plan_agent(self, state: SupervisorState) -> SupervisorState:
        """Execute the Plan Agent workflow.

        Args:
            state: Current supervisor state.

        Returns:
            Updated state with plan agent results.
        """
        logger.info("Running Plan Agent...")

        # Create handoff message
        handoff = HandoffMessage(
            from_agent="supervisor",
            to_agent="plan",
            intent="create_plan",
            context={
                "profile": state.get("profile"),
                "scholarships": state.get("search_results"),
            },
            conversation_summary="User wants to create an application plan.",
        )
        state["last_handoff"] = handoff

        # Check prerequisites
        if not state.get("search_results"):
            response = HandoffResponse(
                from_agent="plan",
                to_agent="supervisor",
                status="needs_clarification",
                result={},
                messages_for_user=[
                    "I need to find scholarships before creating a plan. "
                    "Would you like me to search for scholarships first?"
                ],
                follow_up_actions=["search_scholarships"],
            )
            state["last_response"] = response
            return state

        # For now, create a basic plan response
        # Full implementation will be in Phase 4
        from scholar_agent.models import ApplicationPlan

        existing_profile = state.get("profile")
        plan = ApplicationPlan(
            user_id=existing_profile.user_id if existing_profile else uuid4(),
            profile=existing_profile,
        )

        state["application_plan"] = plan

        response = HandoffResponse(
            from_agent="plan",
            to_agent="supervisor",
            status="completed",
            result={"plan_id": str(plan.plan_id)},
            messages_for_user=[
                "I've created a preliminary application plan. "
                "Full planning features will be available soon!"
            ],
            follow_up_actions=["export_excel", "export_pdf", "view_timeline"],
        )
        state["last_response"] = response

        # Update dialog state
        dialog_state = state.get("dialog_state", [])
        if dialog_state is None:
            dialog_state = []
        state["dialog_state"] = dialog_state + ["plan"]

        return state

    async def _respond_to_user(self, state: SupervisorState) -> SupervisorState:
        """Generate final response to user.

        Args:
            state: Current supervisor state with agent results.

        Returns:
            Updated state with response message.
        """
        logger.info("Generating response to user...")

        # Get context for response
        last_response = state.get("last_response")
        profile = state.get("profile")
        search_results = state.get("search_results")

        # Build context for LLM
        context_parts = []

        if last_response and last_response.messages_for_user:
            context_parts.append(
                f"Agent result: {' '.join(last_response.messages_for_user)}"
            )

        if profile:
            context_parts.append(
                f"User profile: {profile.name or 'Unknown'}, "
                f"studying {profile.desired_field or 'unspecified field'}, "
                f"targeting {profile.target_country or 'unspecified country'}"
            )

        if search_results:
            context_parts.append(f"Found {len(search_results)} scholarships")

        # Get last user message
        last_message = ""
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or (
                hasattr(msg, "type") and msg.type == "human"
            ):
                last_message = msg.content if hasattr(msg, "content") else str(msg)
                break

        # Generate response using LLM
        system_context = SUPERVISOR_SYSTEM_PROMPT
        if context_parts:
            system_context += "\n\nCurrent context:\n" + "\n".join(context_parts)

        try:
            response = await self.llm.ainvoke(
                [
                    SystemMessage(content=system_context),
                    HumanMessage(content=last_message if last_message else "Hello"),
                ]
            )

            response_text = response.content

        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            # Fallback response
            if last_response and last_response.messages_for_user:
                response_text = " ".join(last_response.messages_for_user)
            else:
                response_text = "I'm here to help you find scholarships. How can I assist you today?"

        # Add response to messages
        state["messages"] = list(state.get("messages", [])) + [
            AIMessage(content=response_text)
        ]

        return state

    async def process_message(
        self,
        message: str,
        session_id: str | None = None,
        user_id: str | None = None,
        existing_state: SupervisorState | None = None,
    ) -> tuple[str, SupervisorState]:
        """Process a user message through the supervisor workflow.

        Args:
            message: User's message.
            session_id: Optional session ID for continuity.
            user_id: Optional user ID.
            existing_state: Optional existing state to continue from.

        Returns:
            Tuple of (response_text, updated_state).
        """
        # Initialize or restore state
        state: SupervisorState
        if existing_state:
            state = existing_state
            state["messages"] = list(state.get("messages", [])) + [
                HumanMessage(content=message)
            ]
        else:
            state = {
                "messages": [HumanMessage(content=message)],
                "session_id": session_id or str(uuid4()),
                "user_id": user_id or str(uuid4()),
                "current_agent": "supervisor",
                "profile": None,
                "search_results": None,
                "application_plan": None,
                "dialog_state": [],
                "pending_clarifications": [],
                "last_handoff": None,
                "last_response": None,
            }

        # Run the graph
        result = await self.graph.ainvoke(state)

        # Extract response
        response_text = ""
        for msg in reversed(result.get("messages", [])):
            if isinstance(msg, AIMessage) or (
                hasattr(msg, "type") and msg.type == "ai"
            ):
                response_text = msg.content if hasattr(msg, "content") else str(msg)
                break

        return response_text, result


# Singleton instance
_supervisor_instance: SupervisorGraph | None = None


def get_supervisor() -> SupervisorGraph:
    """Get or create the supervisor instance."""
    global _supervisor_instance
    if _supervisor_instance is None:
        _supervisor_instance = SupervisorGraph()
    return _supervisor_instance
