"""Profile analysis agent using LangGraph."""

import logging
from typing import Annotated, Any, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from scholar_agent.config import get_settings
from scholar_agent.models import StudentProfile, StudyLevel, TestScores

logger = logging.getLogger(__name__)


class ProfileState(TypedDict):
    """State for profile analysis workflow."""

    messages: Annotated[list[AnyMessage], add_messages]
    cv_text: str | None
    chat_input: str | None
    extracted_data: dict[str, Any]
    profile: StudentProfile | None
    target_country: str
    desired_field: str
    level: StudyLevel
    errors: list[str]
    current_step: str


class ProfileAgent:
    """Agent for analyzing and building student profiles."""

    def __init__(self) -> None:
        """Initialize the profile agent."""
        self.settings = get_settings()
        self._graph: StateGraph | None = None

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow.

        Returns:
            Compiled StateGraph.
        """
        workflow = StateGraph(ProfileState)

        # Add nodes
        workflow.add_node("analyze_input", self._analyze_input)
        workflow.add_node("extract_profile", self._extract_profile)
        workflow.add_node("validate_profile", self._validate_profile)
        workflow.add_node("enrich_profile", self._enrich_profile)

        # Define edges
        workflow.set_entry_point("analyze_input")
        workflow.add_edge("analyze_input", "extract_profile")
        workflow.add_edge("extract_profile", "validate_profile")
        workflow.add_conditional_edges(
            "validate_profile",
            self._should_enrich,
            {
                "enrich": "enrich_profile",
                "complete": END,
            },
        )
        workflow.add_edge("enrich_profile", END)

        return workflow.compile()

    async def _analyze_input(self, state: ProfileState) -> ProfileState:
        """Analyze the input (CV text or chat message).

        Args:
            state: Current workflow state.

        Returns:
            Updated state.
        """
        logger.info("Analyzing input...")
        state["current_step"] = "analyzing"

        # Determine input type
        if state.get("cv_text"):
            state["messages"].append(
                {
                    "role": "system",
                    "content": "Analyzing CV document...",
                }
            )
        elif state.get("chat_input"):
            state["messages"].append(
                {
                    "role": "system",
                    "content": "Processing user input...",
                }
            )

        return state

    async def _extract_profile(self, state: ProfileState) -> ProfileState:
        """Extract profile data from input.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with extracted data.
        """
        logger.info("Extracting profile data...")
        state["current_step"] = "extracting"

        from scholar_agent.services.cv_parser import get_cv_parser_service

        cv_parser = await get_cv_parser_service()

        extracted = {}

        cv_text = state.get("cv_text")
        chat_input = state.get("chat_input")

        if cv_text:
            # Parse CV text with AI
            extracted = await cv_parser.parse_cv_with_ai(
                cv_text,
                state.get("target_country", "USA"),
                state.get("desired_field", ""),
            )
        elif chat_input:
            # Parse chat message
            extracted = await cv_parser.parse_chat_message(
                chat_input,
                state.get("profile"),
            )

        state["extracted_data"] = extracted
        state["messages"].append(
            {
                "role": "system",
                "content": f"Extracted {len(extracted)} profile fields.",
            }
        )

        return state

    async def _validate_profile(self, state: ProfileState) -> ProfileState:
        """Validate extracted profile data.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with validation results.
        """
        logger.info("Validating profile...")
        state["current_step"] = "validating"

        extracted = state.get("extracted_data", {})
        errors = []

        # Check required fields
        if not extracted.get("gpa"):
            errors.append("GPA not found in profile")

        if not extracted.get("major"):
            errors.append("Major/field of study not found")

        state["errors"] = errors

        if errors:
            state["messages"].append(
                {
                    "role": "system",
                    "content": f"Validation warnings: {', '.join(errors)}",
                }
            )
        else:
            state["messages"].append(
                {
                    "role": "system",
                    "content": "Profile validation successful.",
                }
            )

        return state

    def _should_enrich(self, state: ProfileState) -> str:
        """Decide if profile needs enrichment.

        Args:
            state: Current workflow state.

        Returns:
            Next node name.
        """
        # If there are errors or missing data, try to enrich
        if state.get("errors"):
            return "enrich"
        return "complete"

    async def _enrich_profile(self, state: ProfileState) -> ProfileState:
        """Enrich profile with defaults and inferences.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with enriched profile.
        """
        logger.info("Enriching profile...")
        state["current_step"] = "enriching"

        extracted = state.get("extracted_data", {})

        # Set defaults for missing values
        if not extracted.get("gpa"):
            extracted["gpa"] = 3.0  # Default GPA

        if not extracted.get("major"):
            extracted["major"] = "General Studies"

        state["extracted_data"] = extracted
        state["errors"] = []  # Clear errors after enrichment

        return state

    async def analyze_profile(
        self,
        cv_text: str | None = None,
        chat_input: str | None = None,
        target_country: str = "USA",
        desired_field: str = "",
        level: StudyLevel = StudyLevel.MASTER,
        existing_profile: StudentProfile | None = None,
    ) -> tuple[StudentProfile, list[str]]:
        """Run the profile analysis workflow.

        Args:
            cv_text: Text extracted from CV.
            chat_input: User's chat message.
            target_country: Target country for study.
            desired_field: Desired field with focus.
            level: Study level.
            existing_profile: Existing profile to update.

        Returns:
            Tuple of (profile, messages).
        """
        if self._graph is None:
            self._graph = self._build_graph()

        initial_state: ProfileState = {
            "messages": [],
            "cv_text": cv_text,
            "chat_input": chat_input,
            "extracted_data": {},
            "profile": existing_profile,
            "target_country": target_country,
            "desired_field": desired_field,
            "level": level,
            "errors": [],
            "current_step": "start",
        }

        # Run the workflow
        final_state = await self._graph.ainvoke(initial_state)

        # Build profile from extracted data
        extracted = final_state.get("extracted_data", {})

        test_scores = TestScores(
            ielts=extracted.get("test_scores", {}).get("ielts"),
            toefl=extracted.get("test_scores", {}).get("toefl"),
            gre=extracted.get("test_scores", {}).get("gre"),
            gmat=extracted.get("test_scores", {}).get("gmat"),
        )

        profile = StudentProfile(
            name=extracted.get("name"),
            email=extracted.get("email"),
            gpa=extracted.get("gpa", 3.0),
            test_scores=test_scores,
            major=extracted.get("major", "Not specified"),
            desired_field=desired_field or extracted.get("major", ""),
            publications=extracted.get("publications", 0),
            work_experience_years=extracted.get("work_experience_years", 0),
            skills=extracted.get("skills", []),
            target_country=target_country,
            level=level,
        )

        messages = [m.get("content", "") for m in final_state.get("messages", [])]

        return profile, messages


# Singleton instance stored in a dict to avoid global statement
_state: dict[str, ProfileAgent | None] = {"agent": None}


async def get_profile_agent() -> ProfileAgent:
    """Get or create the profile agent singleton."""
    agent = _state["agent"]
    if agent is None:
        agent = ProfileAgent()
        _state["agent"] = agent
    return agent
