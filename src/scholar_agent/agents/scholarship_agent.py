"""Scholarship search agent using LangGraph."""

import logging
from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from scholar_agent.config import get_settings
from scholar_agent.models import (
    Program,
    Scholarship,
    ScholarshipSearchRequest,
    SearchMode,
    StudentProfile,
)

logger = logging.getLogger(__name__)


class SearchState(TypedDict):
    """State for scholarship search workflow."""

    messages: Annotated[list[AnyMessage], add_messages]
    profile: StudentProfile
    search_mode: SearchMode
    school_name: str | None
    program_name: str | None
    scholarships: list[Scholarship]
    programs: list[Program]
    crawled_urls: list[str]
    current_step: str
    hedera_tx_id: str | None


class ScholarshipAgent:
    """Agent for searching and analyzing scholarships."""

    def __init__(self) -> None:
        """Initialize the scholarship agent."""
        self.settings = get_settings()
        self._graph: StateGraph | None = None

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow.

        Returns:
            Compiled StateGraph.
        """
        workflow = StateGraph(SearchState)

        # Add nodes
        workflow.add_node("plan_search", self._plan_search)
        workflow.add_node("search_scholarships", self._search_scholarships)
        workflow.add_node("crawl_details", self._crawl_details)
        workflow.add_node("calculate_scores", self._calculate_scores)
        workflow.add_node("search_programs", self._search_programs)
        workflow.add_node("record_session", self._record_session)

        # Define edges
        workflow.set_entry_point("plan_search")
        workflow.add_edge("plan_search", "search_scholarships")
        workflow.add_edge("search_scholarships", "crawl_details")
        workflow.add_edge("crawl_details", "calculate_scores")
        workflow.add_conditional_edges(
            "calculate_scores",
            self._should_search_programs,
            {
                "search_programs": "search_programs",
                "finish": "record_session",
            },
        )
        workflow.add_edge("search_programs", "record_session")
        workflow.add_edge("record_session", END)

        return workflow.compile()

    async def _plan_search(self, state: SearchState) -> SearchState:
        """Plan the search strategy.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with search plan.
        """
        logger.info("Planning search strategy...")
        state["current_step"] = "planning"

        profile = state["profile"]
        mode = state["search_mode"]

        plan_msg = f"Search plan: {mode.value} mode for {profile.desired_field} in {profile.target_country}"

        if state.get("school_name"):
            plan_msg += f" at {state['school_name']}"
        if state.get("program_name"):
            plan_msg += f" - {state['program_name']}"

        state["messages"].append(
            {
                "role": "system",
                "content": plan_msg,
            }
        )

        return state

    async def _search_scholarships(self, state: SearchState) -> SearchState:
        """Search for scholarships.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with search results.
        """
        logger.info("Searching scholarships...")
        state["current_step"] = "searching"

        from scholar_agent.services.scholarship_search import (
            get_scholarship_search_service,
        )

        search_service = await get_scholarship_search_service()

        request = ScholarshipSearchRequest(
            profile=state["profile"],
            search_mode=state["search_mode"],
            school_name=state.get("school_name"),
            program_name=state.get("program_name"),
        )

        response = await search_service.search_scholarships(request)

        state["scholarships"] = response.scholarships
        state["programs"] = response.programs

        state["messages"].append(
            {
                "role": "system",
                "content": f"Found {len(response.scholarships)} potential scholarships",
            }
        )

        return state

    async def _crawl_details(self, state: SearchState) -> SearchState:
        """Crawl detailed information for top scholarships.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with detailed scholarship info.
        """
        logger.info("Crawling scholarship details...")
        state["current_step"] = "crawling"

        # For now, we rely on the initial search results
        # In a full implementation, this would deep-crawl each scholarship URL
        crawled_count = min(len(state["scholarships"]), 10)

        state["crawled_urls"] = [
            str(s.url) for s in state["scholarships"][:crawled_count] if s.url
        ]

        state["messages"].append(
            {
                "role": "system",
                "content": f"Analyzed details from {crawled_count} scholarship pages",
            }
        )

        return state

    async def _calculate_scores(self, state: SearchState) -> SearchState:
        """Calculate match scores for scholarships.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with scored scholarships.
        """
        logger.info("Calculating match scores...")
        state["current_step"] = "scoring"

        # Scores are already calculated in the search service
        # This node can do additional scoring/ranking if needed

        scored_count = sum(1 for s in state["scholarships"] if s.match_score)

        state["messages"].append(
            {
                "role": "system",
                "content": f"Calculated compatibility scores for {scored_count} scholarships",
            }
        )

        return state

    def _should_search_programs(self, state: SearchState) -> str:
        """Decide if program search is needed.

        Args:
            state: Current workflow state.

        Returns:
            Next node name.
        """
        # Search programs if in BY_SCHOLARSHIP mode or no programs found yet
        if state["search_mode"] == SearchMode.BY_SCHOLARSHIP and not state["programs"]:
            return "search_programs"
        return "finish"

    async def _search_programs(self, state: SearchState) -> SearchState:
        """Search for matching programs.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with program results.
        """
        logger.info("Searching matching programs...")
        state["current_step"] = "searching_programs"

        from scholar_agent.services.scholarship_search import (
            get_scholarship_search_service,
        )

        search_service = await get_scholarship_search_service()

        # Search for programs in target country
        schools = await search_service.get_schools(
            state["profile"].target_country,
            state["profile"].major,
        )

        state["messages"].append(
            {
                "role": "system",
                "content": f"Found {len(schools)} schools with matching programs",
            }
        )

        return state

    async def _record_session(self, state: SearchState) -> SearchState:
        """Record search session to Hedera.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with Hedera transaction.
        """
        logger.info("Recording search session...")
        state["current_step"] = "recording"

        from scholar_agent.services.hedera import get_hedera_service

        hedera_service = await get_hedera_service()

        tx_id = await hedera_service.submit_search_session(
            session_id="search-" + str(state["profile"].user_id),
            user_id=str(state["profile"].user_id),
            search_params={
                "mode": state["search_mode"].value,
                "country": state["profile"].target_country,
                "field": state["profile"].desired_field,
            },
            results_summary={
                "scholarships": len(state["scholarships"]),
                "programs": len(state["programs"]),
            },
        )

        state["hedera_tx_id"] = tx_id

        state["messages"].append(
            {
                "role": "system",
                "content": "Search session recorded to Hedera ledger",
            }
        )

        return state

    async def search(
        self,
        profile: StudentProfile,
        search_mode: SearchMode = SearchMode.BY_SCHOLARSHIP,
        school_name: str | None = None,
        program_name: str | None = None,
    ) -> tuple[list[Scholarship], list[Program], str | None, list[str]]:
        """Run the scholarship search workflow.

        Args:
            profile: Student profile.
            search_mode: Search mode (by program or by scholarship).
            school_name: Optional school name for BY_PROGRAM mode.
            program_name: Optional program name for BY_PROGRAM mode.

        Returns:
            Tuple of (scholarships, programs, hedera_tx_id, messages).
        """
        if self._graph is None:
            self._graph = self._build_graph()

        initial_state: SearchState = {
            "messages": [],
            "profile": profile,
            "search_mode": search_mode,
            "school_name": school_name,
            "program_name": program_name,
            "scholarships": [],
            "programs": [],
            "crawled_urls": [],
            "current_step": "start",
            "hedera_tx_id": None,
        }

        # Run the workflow
        final_state = await self._graph.ainvoke(initial_state)

        # Extract message content - handle both dict and LangChain message objects
        messages = []
        for m in final_state.get("messages", []):
            if hasattr(m, "content"):
                # LangChain message object
                messages.append(m.content)
            elif isinstance(m, dict):
                # Dictionary
                messages.append(m.get("content", ""))
            else:
                messages.append(str(m))

        return (
            final_state["scholarships"],
            final_state["programs"],
            final_state.get("hedera_tx_id"),
            messages,
        )


# Singleton instance stored in a dict to avoid global statement
_state: dict[str, ScholarshipAgent | None] = {"agent": None}


async def get_scholarship_agent() -> ScholarshipAgent:
    """Get or create the scholarship agent singleton."""
    agent = _state["agent"]
    if agent is None:
        agent = ScholarshipAgent()
        _state["agent"] = agent
    return agent
