"""Agent state definitions for multi-agent system."""

from datetime import datetime
from typing import Annotated, Literal, TypedDict
from uuid import UUID, uuid4

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from scholar_agent.models import (
    ApplicationPlan,
    Milestone,
    PrioritizedScholarship,
    Program,
    Scholarship,
    SearchMode,
    StudentProfile,
    TimelineEvent,
)

# ============================================================================
# Dialog State Helper
# ============================================================================


def add_dialog_state(left: list[str] | None, right: list[str] | None) -> list[str]:
    """Merge dialog state lists, keeping track of agent transitions.

    Args:
        left: Existing dialog state list.
        right: New dialog state entries to add.

    Returns:
        Merged dialog state list.
    """
    if left is None:
        left = []
    if right is None:
        return left
    return left + right


# ============================================================================
# Handoff Protocol Models
# ============================================================================


class HandoffMessage(BaseModel):
    """Message structure for agent hand-offs."""

    message_id: UUID = Field(default_factory=uuid4)
    from_agent: str
    to_agent: str
    intent: str  # What the receiving agent should do
    context: dict[str, str] = Field(default_factory=dict)  # Relevant data to pass
    conversation_summary: str = ""  # Summary of conversation so far
    priority: Literal["high", "medium", "low"] = "medium"
    requires_response: bool = True  # Whether sender expects a response
    timestamp: datetime = Field(default_factory=datetime.now)


class HandoffResponse(BaseModel):
    """Response structure after hand-off completion."""

    response_id: UUID = Field(default_factory=uuid4)
    from_agent: str
    to_agent: str
    status: Literal["completed", "needs_clarification", "error"]
    result: dict[str, str] = Field(
        default_factory=dict
    )  # Results from the agent's work
    follow_up_actions: list[str] = Field(default_factory=list)  # Suggested next steps
    messages_for_user: list[str] = Field(default_factory=list)  # Messages to show user
    timestamp: datetime = Field(default_factory=datetime.now)


# ============================================================================
# Agent State Definitions
# ============================================================================


class SupervisorState(TypedDict):
    """State for the Supervisor Agent (Orchestrator)."""

    messages: Annotated[list[AnyMessage], add_messages]
    session_id: str
    user_id: str
    current_agent: str  # "supervisor" | "profile" | "search" | "plan"
    profile: StudentProfile | None
    search_results: list[Scholarship] | None
    application_plan: ApplicationPlan | None
    dialog_state: Annotated[
        list[Literal["supervisor", "profile", "search", "plan"]], add_dialog_state
    ]
    pending_clarifications: list[str]
    last_handoff: HandoffMessage | None
    last_response: HandoffResponse | None


class ProfileAgentState(TypedDict):
    """State for Profile Agent workflow."""

    messages: Annotated[list[AnyMessage], add_messages]
    cv_text: str | None
    cv_file_path: str | None
    chat_input: str | None
    extracted_data: dict[str, str]
    profile: StudentProfile | None
    target_country: str
    desired_field: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    missing_fields: list[str]
    validation_errors: list[str]
    current_step: str


class SearchQuery(BaseModel):
    """A single search query with metadata."""

    query_id: UUID = Field(default_factory=uuid4)
    query_text: str
    query_type: Literal["scholarship", "program", "university"] = "scholarship"
    source: Literal["auto_generated", "user_added", "user_modified"] = "auto_generated"
    priority: int = Field(default=1, ge=1, le=5)  # 1 = highest priority


class SearchFilters(BaseModel):
    """Filters for scholarship search."""

    countries: list[str] = Field(default_factory=list)
    study_levels: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    min_value: float | None = None
    value_types: list[str] = Field(default_factory=list)
    deadline_after: datetime | None = None
    deadline_before: datetime | None = None
    nationalities_eligible: list[str] = Field(default_factory=list)


class SearchAgentState(TypedDict):
    """State for Search Agent workflow."""

    messages: Annotated[list[AnyMessage], add_messages]
    profile: StudentProfile | None
    search_queries: list[SearchQuery]  # Current queries (auto-generated or confirmed)
    search_mode: SearchMode
    filters: SearchFilters | None
    awaiting_confirmation: bool  # True when waiting for user to confirm queries
    scholarships: list[Scholarship]
    programs: list[Program]
    crawled_urls: list[str]
    match_scores: dict[str, float]
    search_iterations: int
    max_iterations: int
    current_step: str


class PlanAgentState(TypedDict):
    """State for Plan Agent workflow."""

    messages: Annotated[list[AnyMessage], add_messages]
    profile: StudentProfile | None
    scholarships: list[Scholarship]
    programs: list[Program]
    prioritized_list: list[PrioritizedScholarship]
    timeline: list[TimelineEvent]
    milestones: list[Milestone]
    application_plan: ApplicationPlan | None
    missing_info_requests: list[str]
    current_step: str


# ============================================================================
# Conversation/Session Models
# ============================================================================


class ConversationMessage(BaseModel):
    """Message in conversation history."""

    message_id: UUID = Field(default_factory=uuid4)
    role: Literal["user", "assistant", "system"]
    content: str
    agent: str | None = None  # Which agent generated this
    timestamp: datetime = Field(default_factory=datetime.now)
    attachments: list[str] = Field(default_factory=list)  # File paths
    metadata: dict[str, str] = Field(default_factory=dict)


class SessionState(BaseModel):
    """Complete session state."""

    session_id: UUID = Field(default_factory=uuid4)
    user_id: UUID = Field(default_factory=uuid4)
    title: str | None = Field(
        default=None, description="User-defined or auto-generated session title"
    )
    conversation_history: list[ConversationMessage] = Field(default_factory=list)
    current_agent: str = "supervisor"
    profile: StudentProfile | None = None
    search_results: list[Scholarship] | None = None
    application_plan: ApplicationPlan | None = None
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)

    def add_message(
        self,
        role: Literal["user", "assistant", "system"],
        content: str,
        agent: str | None = None,
    ) -> None:
        """Add a message to conversation history."""
        self.conversation_history.append(
            ConversationMessage(
                role=role,
                content=content,
                agent=agent,
            )
        )
        self.last_activity = datetime.now()

    def get_recent_messages(self, count: int = 10) -> list[ConversationMessage]:
        """Get the most recent messages."""
        return self.conversation_history[-count:]

    def get_title(self) -> str:
        """Get session title, auto-generating from first message if not set."""
        if self.title:
            return self.title
        return self._generate_title_from_history()

    def _generate_title_from_history(self) -> str:
        """Generate a title from the first user message."""
        for msg in self.conversation_history:
            if msg.role == "user" and msg.content:
                # Truncate to first 50 chars and add ellipsis if needed
                content = msg.content.strip()
                if len(content) > 50:
                    return content[:47] + "..."
                return content
        return "New Chat"

    def get_preview(self) -> str:
        """Get a preview of the conversation (first user message truncated)."""
        for msg in self.conversation_history:
            if msg.role == "user" and msg.content:
                content = msg.content.strip()
                if len(content) > 100:
                    return content[:97] + "..."
                return content
        return ""


class SessionSummary(BaseModel):
    """Summary of a session for list display."""

    session_id: UUID
    title: str = Field(description="Auto-generated from first message if not set")
    preview: str = Field(description="First user message truncated")
    last_activity: datetime
    message_count: int
    has_profile: bool = Field(description="Whether profile was extracted")
    has_scholarships: bool = Field(description="Whether search was performed")
