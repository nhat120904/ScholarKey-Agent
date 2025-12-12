"""Data models for ScholarAgent."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, HttpUrl

# ============================================================================
# Enums
# ============================================================================


class StudyLevel(str, Enum):
    """Academic study level."""

    BACHELOR = "bachelor"
    MASTER = "master"
    PHD = "phd"


class SearchMode(str, Enum):
    """Search mode for scholarship search."""

    BY_PROGRAM = "by_program"  # Find scholarships for a specific program
    BY_SCHOLARSHIP = "by_scholarship"  # Find programs matching scholarships


class ScholarshipValueType(str, Enum):
    """Type of scholarship value."""

    FULL_TUITION = "full_tuition"
    PARTIAL_TUITION = "partial_tuition"
    FULL_TUITION_STIPEND = "full_tuition_stipend"
    STIPEND_ONLY = "stipend_only"
    LIVING_EXPENSES = "living_expenses"


# ============================================================================
# Student Profile Models
# ============================================================================


class TestScores(BaseModel):
    """Language and standardized test scores."""

    ielts: float | None = Field(None, ge=0, le=9, description="IELTS score")
    toefl: int | None = Field(None, ge=0, le=120, description="TOEFL score")
    gre: int | None = Field(None, ge=260, le=340, description="GRE total score")
    gmat: int | None = Field(None, ge=200, le=800, description="GMAT score")


class StudentProfile(BaseModel):
    """Student profile data model."""

    user_id: UUID = Field(default_factory=uuid4)
    name: str | None = None
    email: str | None = None
    gpa: float = Field(default=0.0, ge=0, le=4.0, description="GPA on 4.0 scale")
    test_scores: TestScores = Field(default_factory=TestScores)
    major: str = Field(default="", description="Student's major field of study")
    desired_field: str = Field(
        default="",
        description="Desired field with focus (e.g., 'Computer Science with focus on AI/ML')",
    )
    publications: int = Field(0, ge=0, description="Number of publications")
    work_experience_years: float = Field(0, ge=0, description="Years of work experience")
    skills: list[str] = Field(default_factory=list)
    target_country: str = Field(default="", description="Target country for study")
    level: StudyLevel = Field(default=StudyLevel.MASTER, description="Study level (bachelor/master/phd)")
    nationality: str | None = None
    age: int | None = Field(None, ge=16, le=100)

    # Hedera verification
    cv_hash: str | None = Field(None, description="SHA-256 hash of CV content")
    hedera_tx_id: str | None = Field(None, description="Hedera transaction ID")
    hedera_topic_sequence: int | None = Field(
        None, description="HCS topic sequence number"
    )


class CVUploadResponse(BaseModel):
    """Response from CV upload and parsing."""

    profile: StudentProfile
    hedera_tx_id: str | None = None
    hedera_verification_url: str | None = None
    raw_text: str | None = None


# ============================================================================
# Scholarship Models
# ============================================================================


class SelectionStage(BaseModel):
    """A stage in the scholarship selection process."""

    stage: int
    name: str
    duration_days: int | None = None
    description: str | None = None


class ScholarshipDeadlines(BaseModel):
    """Scholarship application deadlines."""

    round_1: datetime | None = None
    round_2: datetime | None = None
    round_3: datetime | None = None
    notification_date: datetime | None = None
    opening_date: datetime | None = None


class ScholarshipValue(BaseModel):
    """Value/amount of a scholarship."""

    type: ScholarshipValueType
    amount: float | None = None  # In USD
    currency: str = "USD"
    description: str | None = None


class EligibilityCriteria(BaseModel):
    """Eligibility criteria for a scholarship."""

    min_gpa: float | None = Field(None, ge=0, le=4.0)
    max_gpa: float | None = Field(None, ge=0, le=4.0)
    min_ielts: float | None = Field(None, ge=0, le=9)
    min_toefl: int | None = Field(None, ge=0, le=120)
    nationalities: list[str] = Field(default_factory=lambda: ["Any"])
    excluded_nationalities: list[str] = Field(default_factory=list)
    max_age: int | None = None
    min_age: int | None = None
    required_background: list[str] = Field(default_factory=list)
    study_levels: list[StudyLevel] = Field(default_factory=list)
    other_requirements: list[str] = Field(default_factory=list)


class EligibleProgram(BaseModel):
    """A program eligible for a scholarship."""

    program_id: UUID = Field(default_factory=uuid4)
    program_name: str
    school: str
    level: StudyLevel | None = None


class Scholarship(BaseModel):
    """Scholarship data model."""

    scholarship_id: UUID = Field(default_factory=uuid4)
    name: str
    provider: str
    country: str
    value: ScholarshipValue
    deadlines: ScholarshipDeadlines = Field(default_factory=ScholarshipDeadlines)
    selection_procedure: list[SelectionStage] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    eligible_programs: list[EligibleProgram] = Field(default_factory=list)
    eligibility_criteria: EligibilityCriteria = Field(default_factory=EligibilityCriteria)
    url: HttpUrl | str | None = None
    description: str | None = None
    last_crawled: datetime | None = None

    # Matching scores (computed)
    match_score: float | None = Field(None, ge=0, le=100)
    match_analysis: str | None = None


# ============================================================================
# Program Models
# ============================================================================


class ProgramRequirements(BaseModel):
    """Requirements for a study program."""

    min_gpa: float | None = Field(None, ge=0, le=4.0)
    prerequisites: list[str] = Field(default_factory=list)
    language_scores: dict[str, float] = Field(default_factory=dict)  # e.g., {"IELTS": 6.5}
    other_requirements: list[str] = Field(default_factory=list)


class Program(BaseModel):
    """Study program data model."""

    program_id: UUID = Field(default_factory=uuid4)
    name: str
    school_name: str
    country: str
    level: StudyLevel
    field: str
    focus_areas: list[str] = Field(default_factory=list)
    duration_years: float | None = None
    requirements: ProgramRequirements = Field(default_factory=ProgramRequirements)
    available_scholarships: list[UUID] = Field(default_factory=list)
    url: HttpUrl | str | None = None
    description: str | None = None

    # Matching scores (computed)
    field_alignment_score: float | None = Field(None, ge=0, le=100)
    profile_match_score: float | None = Field(None, ge=0, le=100)


# ============================================================================
# Search Request/Response Models
# ============================================================================


class ScholarshipSearchRequest(BaseModel):
    """Request for scholarship search."""

    profile: StudentProfile
    search_mode: SearchMode = SearchMode.BY_SCHOLARSHIP
    # For BY_PROGRAM mode
    school_name: str | None = None
    program_name: str | None = None
    # Filters
    min_match_score: float = Field(0, ge=0, le=100)
    deadline_after: datetime | None = None
    include_partial_matches: bool = True


class ScholarshipSearchResponse(BaseModel):
    """Response from scholarship search."""

    scholarships: list[Scholarship]
    programs: list[Program] = Field(default_factory=list)
    total_scholarships: int
    total_programs: int
    search_mode: SearchMode
    hedera_verification_url: str | None = None
    search_session_id: UUID = Field(default_factory=uuid4)


class CrawlScholarshipRequest(BaseModel):
    """Request to crawl a scholarship URL."""

    scholarship_url: str
    deep_crawl: bool = True


class CrawlScholarshipResponse(BaseModel):
    """Response from scholarship crawling."""

    scholarship: Scholarship
    crawl_status: str
    pages_crawled: int
    errors: list[str] = Field(default_factory=list)


# ============================================================================
# Export Models
# ============================================================================


class ExportRequest(BaseModel):
    """Request to export data to Excel."""

    scholarships: list[Scholarship] = Field(default_factory=list)
    programs: list[Program] = Field(default_factory=list)
    profile: StudentProfile | None = None
    include_scholarships: bool = True
    include_programs: bool = True
    include_combined: bool = False


class ExportResponse(BaseModel):
    """Response from export request."""

    filename: str
    download_url: str
    file_size_bytes: int


# ============================================================================
# Chat/Conversation Models
# ============================================================================


class ChatMessage(BaseModel):
    """A chat message."""

    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatRequest(BaseModel):
    """Request for chat interaction."""

    message: str
    session_id: UUID | None = None
    profile: StudentProfile | None = None


class ChatResponse(BaseModel):
    """Response from chat interaction."""

    message: str
    session_id: UUID
    profile_updates: dict[str, Any] | None = None
    suggested_actions: list[str] = Field(default_factory=list)
