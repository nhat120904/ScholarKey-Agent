"""Tests for ScholarKey AI."""

import pytest
from fastapi.testclient import TestClient

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    from scholar_agent.main import app

    return TestClient(app)


@pytest.fixture
def sample_profile():
    """Create a sample student profile for testing."""
    from scholar_agent.models import StudentProfile, StudyLevel, TestScores

    return StudentProfile(
        gpa=3.8,
        test_scores=TestScores(ielts=7.5, toefl=105, gre=320),
        major="Computer Science",
        desired_field="Computer Science with focus on AI/Machine Learning",
        publications=2,
        work_experience_years=1,
        skills=["Python", "TensorFlow", "NLP", "Machine Learning"],
        target_country="Australia",
        level=StudyLevel.MASTER,
    )


# ============================================================================
# Configuration Tests
# ============================================================================


def test_settings_load():
    """Test that settings can be loaded."""
    from scholar_agent.config import get_settings

    settings = get_settings()
    assert settings.app_name == "ScholarKey AI"
    assert settings.app_version == "0.1.0"


def test_settings_max_upload_size():
    """Test max upload size calculation."""
    from scholar_agent.config import get_settings

    settings = get_settings()
    assert settings.max_upload_size_bytes == settings.max_upload_size_mb * 1024 * 1024


# ============================================================================
# Model Tests
# ============================================================================


def test_student_profile_creation(sample_profile):
    """Test student profile model creation."""
    assert sample_profile.gpa == 3.8
    assert sample_profile.major == "Computer Science"
    assert sample_profile.level.value == "master"
    assert len(sample_profile.skills) == 4


def test_student_profile_uuid_generation():
    """Test that UUID is automatically generated."""
    from scholar_agent.models import StudentProfile, StudyLevel, TestScores

    profile = StudentProfile(
        gpa=3.5,
        major="Engineering",
        desired_field="Engineering",
        target_country="USA",
        level=StudyLevel.PHD,
        test_scores=TestScores(),
    )

    assert profile.user_id is not None


def test_test_scores_validation():
    """Test test scores validation."""
    from scholar_agent.models import TestScores

    scores = TestScores(ielts=7.5, toefl=100)
    assert scores.ielts == 7.5
    assert scores.toefl == 100
    assert scores.gre is None


def test_scholarship_model():
    """Test scholarship model creation."""
    from scholar_agent.models import (
        EligibilityCriteria,
        Scholarship,
        ScholarshipValue,
        ScholarshipValueType,
    )

    scholarship = Scholarship(
        name="Test Scholarship",
        provider="Test University",
        country="USA",
        value=ScholarshipValue(
            type=ScholarshipValueType.FULL_TUITION_STIPEND,
            amount=50000,
        ),
        eligibility_criteria=EligibilityCriteria(min_gpa=3.5),
    )

    assert scholarship.name == "Test Scholarship"
    assert scholarship.value.amount == 50000
    assert scholarship.eligibility_criteria.min_gpa == 3.5


def test_program_model():
    """Test program model creation."""
    from scholar_agent.models import Program, ProgramRequirements, StudyLevel

    program = Program(
        name="Master of AI",
        school_name="University of Melbourne",
        country="Australia",
        level=StudyLevel.MASTER,
        field="Computer Science",
        focus_areas=["AI", "Machine Learning", "Deep Learning"],
        requirements=ProgramRequirements(min_gpa=3.0),
    )

    assert program.name == "Master of AI"
    assert program.level == StudyLevel.MASTER
    assert "AI" in program.focus_areas


# ============================================================================
# API Tests
# ============================================================================


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ScholarKey AI"


def test_hedera_topic_endpoint(client):
    """Test Hedera topic info endpoint."""
    response = client.get("/api/hedera/topic")
    assert response.status_code == 200

    data = response.json()
    assert "topic_id" in data
    assert "network" in data


# ============================================================================
# Service Tests
# ============================================================================


@pytest.mark.asyncio
async def test_hedera_service_hash():
    """Test CV hash computation."""
    from scholar_agent.services.hedera import HederaService

    service = HederaService()
    test_content = b"Test CV content"

    hash_result = service.compute_cv_hash(test_content)

    assert hash_result is not None
    assert len(hash_result) == 64  # SHA-256 hex length


@pytest.mark.asyncio
async def test_hedera_hashscan_url():
    """Test HashScan URL generation."""
    from scholar_agent.services.hedera import HederaService

    service = HederaService()
    tx_id = "0.0.12345@1234567890"

    url = service.get_hashscan_url(tx_id)

    assert "hashscan.io" in url
    assert tx_id in url


def test_excel_export_service():
    """Test Excel export service initialization."""
    from scholar_agent.services.excel_export import get_excel_export_service

    service = get_excel_export_service()
    assert service is not None
    assert service.export_dir.exists()


def test_excel_export_to_bytes(sample_profile):
    """Test exporting to Excel bytes."""
    from scholar_agent.models import ExportRequest
    from scholar_agent.services.excel_export import get_excel_export_service

    service = get_excel_export_service()

    request = ExportRequest(
        scholarships=[],
        programs=[],
        profile=sample_profile,
        include_scholarships=True,
        include_programs=True,
    )

    file_bytes, filename = service.export_to_excel(request)

    assert file_bytes is not None
    assert len(file_bytes) > 0
    assert filename.endswith(".xlsx")


# ============================================================================
# Agent Tests
# ============================================================================


def test_profile_agent_import():
    """Test that profile agent can be imported."""
    from scholar_agent.agents.profile_agent import ProfileAgent

    agent = ProfileAgent()
    assert agent is not None


def test_scholarship_agent_import():
    """Test that scholarship agent can be imported."""
    from scholar_agent.agents.scholarship_agent import ScholarshipAgent

    agent = ScholarshipAgent()
    assert agent is not None


# ============================================================================
# Integration Tests
# ============================================================================


def test_search_request_model(sample_profile):
    """Test search request model creation."""
    from scholar_agent.models import ScholarshipSearchRequest, SearchMode

    request = ScholarshipSearchRequest(
        profile=sample_profile,
        search_mode=SearchMode.BY_SCHOLARSHIP,
        min_match_score=50,
    )

    assert request.profile.gpa == 3.8
    assert request.search_mode == SearchMode.BY_SCHOLARSHIP


def test_export_request_model(sample_profile):
    """Test export request model creation."""
    from scholar_agent.models import ExportRequest

    request = ExportRequest(
        scholarships=[],
        programs=[],
        profile=sample_profile,
        include_combined=True,
    )

    assert request.profile is not None
    assert request.include_combined is True


# ============================================================================
# Phase 1: Core Infrastructure Tests
# ============================================================================


def test_session_manager_create():
    """Test session creation."""
    from scholar_agent.services.session_manager import get_session_manager

    manager = get_session_manager()
    session = manager.create_session()

    assert session is not None
    assert session.session_id is not None
    assert session.current_agent == "supervisor"


def test_session_manager_get_or_create():
    """Test get or create session."""
    from scholar_agent.services.session_manager import get_session_manager

    manager = get_session_manager()
    session1 = manager.create_session()
    session2 = manager.get_or_create_session(session_id=session1.session_id)

    assert str(session1.session_id) == str(session2.session_id)


def test_session_manager_update():
    """Test session update."""
    from scholar_agent.services.session_manager import get_session_manager

    manager = get_session_manager()
    session = manager.create_session()

    updated = manager.update_session(
        session.session_id,
        current_agent="profile",
    )

    assert updated is not None
    assert updated.current_agent == "profile"


def test_session_add_message():
    """Test adding messages to session."""
    from scholar_agent.services.session_manager import get_session_manager

    manager = get_session_manager()
    session = manager.create_session()

    session.add_message("user", "Hello")
    session.add_message("assistant", "Hi there!", agent="supervisor")

    assert len(session.conversation_history) == 2
    assert session.conversation_history[0].role == "user"
    assert session.conversation_history[1].agent == "supervisor"


def test_handoff_message_model():
    """Test HandoffMessage model."""
    from scholar_agent.agents.state import HandoffMessage

    handoff = HandoffMessage(
        from_agent="supervisor",
        to_agent="profile",
        intent="analyze_profile",
        context={"key": "value"},
        priority="high",
    )

    assert handoff.from_agent == "supervisor"
    assert handoff.to_agent == "profile"
    assert handoff.priority == "high"
    assert handoff.requires_response is True


def test_handoff_response_model():
    """Test HandoffResponse model."""
    from scholar_agent.agents.state import HandoffResponse

    response = HandoffResponse(
        from_agent="profile",
        to_agent="supervisor",
        status="completed",
        result={"profile": "data"},
        messages_for_user=["Profile analysis complete."],
    )

    assert response.status == "completed"
    assert len(response.messages_for_user) == 1


def test_supervisor_state_definition():
    """Test SupervisorState TypedDict."""
    from scholar_agent.agents.state import SupervisorState  # noqa: TC001

    # Just verify the type exists and can be used
    state: SupervisorState = {
        "messages": [],
        "session_id": "test",
        "user_id": "user",
        "current_agent": "supervisor",
        "profile": None,
        "search_results": None,
        "application_plan": None,
        "dialog_state": [],
        "pending_clarifications": [],
        "last_handoff": None,
        "last_response": None,
    }

    assert state["current_agent"] == "supervisor"


def test_search_query_model():
    """Test SearchQuery model."""
    from scholar_agent.agents.state import SearchQuery

    query = SearchQuery(
        query_text="Germany AI scholarships 2025",
        query_type="scholarship",
        source="auto_generated",
        priority=1,
    )

    assert query.query_text == "Germany AI scholarships 2025"
    assert query.query_id is not None


def test_search_filters_model():
    """Test SearchFilters model."""
    from scholar_agent.agents.state import SearchFilters

    filters = SearchFilters(
        countries=["Germany", "Netherlands"],
        study_levels=["master"],
        min_value=5000,
    )

    assert len(filters.countries) == 2
    assert filters.min_value == 5000


def test_application_plan_model(sample_profile):
    """Test ApplicationPlan model."""
    from scholar_agent.models import ApplicationPlan

    plan = ApplicationPlan(
        profile=sample_profile,
    )

    assert plan.plan_id is not None
    assert plan.profile == sample_profile
    assert "excel" in plan.export_formats


def test_prioritized_scholarship_model():
    """Test PrioritizedScholarship model."""
    from scholar_agent.models import (
        PrioritizedScholarship,
        Scholarship,
        ScholarshipValue,
        ScholarshipValueType,
    )

    scholarship = Scholarship(
        name="Test Scholarship",
        provider="Test Provider",
        country="Germany",
        value=ScholarshipValue(type=ScholarshipValueType.FULL_TUITION),
    )

    prioritized = PrioritizedScholarship(
        scholarship=scholarship,
        priority_rank=1,
        match_score=85.0,
        urgency_score=70.0,
        overall_score=80.0,
        reasoning="Good match for AI/ML focus",
    )

    assert prioritized.priority_rank == 1
    assert prioritized.match_score == 85.0


def test_timeline_event_model():
    """Test TimelineEvent model."""
    from datetime import datetime

    from scholar_agent.models import TimelineEvent

    event = TimelineEvent(
        date=datetime.now(),
        event_type="deadline",
        title="DAAD Application Deadline",
        description="Submit all documents",
    )

    assert event.event_type == "deadline"
    assert event.completed is False


def test_milestone_model():
    """Test Milestone model."""
    from datetime import datetime

    from scholar_agent.models import Milestone

    milestone = Milestone(
        title="Prepare Application Documents",
        due_date=datetime.now(),
        tasks=["Get transcripts", "Write motivation letter"],
        status="not_started",
    )

    assert len(milestone.tasks) == 2
    assert milestone.status == "not_started"


def test_supervisor_graph_initialization():
    """Test SupervisorGraph can be initialized."""
    from scholar_agent.agents.supervisor import SupervisorGraph

    supervisor = SupervisorGraph()
    graph = supervisor.build_graph()

    assert graph is not None
    assert supervisor.graph is not None


def test_get_supervisor_singleton():
    """Test get_supervisor returns singleton."""
    from scholar_agent.agents.supervisor import get_supervisor

    sup1 = get_supervisor()
    sup2 = get_supervisor()

    assert sup1 is sup2


def test_llm_utility():
    """Test LLM utility functions."""
    from scholar_agent.agents.llm import LLMConfig, get_llm

    # Just test that it doesn't raise
    llm = get_llm(temperature=0.5)
    assert llm is not None
    assert LLMConfig.INTENT_TEMPERATURE == 0.3


def test_add_dialog_state_helper():
    """Test add_dialog_state helper function."""
    from scholar_agent.agents.state import add_dialog_state

    result = add_dialog_state(["supervisor"], ["profile"])
    assert result == ["supervisor", "profile"]

    result = add_dialog_state(None, ["supervisor"])
    assert result == ["supervisor"]

    result = add_dialog_state(["supervisor"], None)
    assert result == ["supervisor"]


def test_conversation_message_model():
    """Test ConversationMessage model."""
    from scholar_agent.agents.state import ConversationMessage

    msg = ConversationMessage(
        role="user",
        content="Find scholarships for me",
        agent=None,
    )

    assert msg.role == "user"
    assert msg.message_id is not None
    assert msg.timestamp is not None


def test_session_state_model():
    """Test SessionState model."""
    from scholar_agent.agents.state import SessionState

    session = SessionState()

    assert session.session_id is not None
    assert session.current_agent == "supervisor"
    assert len(session.conversation_history) == 0

    session.add_message("user", "Hello")
    assert len(session.conversation_history) == 1
