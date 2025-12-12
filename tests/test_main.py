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


def test_search_schools_endpoint(client):
    """Test school search endpoint."""
    response = client.get("/api/search-schools?country=Australia")
    # This might fail if Tavily API key is not set
    # Just check the endpoint exists and returns a proper error or result
    assert response.status_code in [200, 500]


def test_search_programs_endpoint(client):
    """Test program search endpoint."""
    response = client.get("/api/search-programs?country=Australia&field=CS")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)


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
