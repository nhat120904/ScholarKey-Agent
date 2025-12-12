"""FastAPI routes for ScholarAgent."""

import io
import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from scholar_agent.config import get_settings
from scholar_agent.models import (
    ChatRequest,
    ChatResponse,
    CrawlScholarshipRequest,
    CrawlScholarshipResponse,
    CVUploadResponse,
    ExportRequest,
    Program,
    ScholarshipSearchRequest,
    ScholarshipSearchResponse,
    SearchMode,
    StudentProfile,
    StudyLevel,
)

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


# ============================================================================
# Profile Routes
# ============================================================================


@router.post("/api/upload-profile", response_model=CVUploadResponse)
async def upload_profile(
    file: UploadFile = File(...),
    target_country: Annotated[str, Form()] = "USA",
    desired_field: Annotated[str, Form()] = "",
    level: Annotated[str, Form()] = "master",
) -> CVUploadResponse:
    """Upload and parse a CV/resume file.

    Args:
        file: CV file (PDF or DOCX).
        target_country: Target country for study.
        desired_field: Desired field with focus area.
        level: Study level (bachelor/master/phd).

    Returns:
        Parsed profile with Hedera verification.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.lower().split(".")[-1]
    if f".{ext}" not in settings.allowed_file_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {settings.allowed_file_types}",
        )

    # Read file content
    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB",
        )

    # Parse level
    try:
        study_level = StudyLevel(level.lower())
    except ValueError:
        study_level = StudyLevel.MASTER

    # Parse CV
    from scholar_agent.services.cv_parser import get_cv_parser_service

    cv_parser = await get_cv_parser_service()

    try:
        profile, verification_url = await cv_parser.parse_cv(
            file_content=content,
            filename=file.filename,
            target_country=target_country,
            desired_field=desired_field,
            level=study_level,
        )

        return CVUploadResponse(
            profile=profile,
            hedera_tx_id=profile.hedera_tx_id,
            hedera_verification_url=verification_url,
        )

    except Exception as e:
        logger.error(f"Failed to parse CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message to update profile.

    Args:
        request: Chat request with message.

    Returns:
        Chat response with profile updates.
    """
    from uuid import uuid4

    from scholar_agent.services.cv_parser import get_cv_parser_service

    cv_parser = await get_cv_parser_service()

    try:
        updates = await cv_parser.parse_chat_message(
            message=request.message,
            existing_profile=request.profile,
        )

        response_message = "I've noted your information."
        suggested_actions = []

        if updates:
            fields = list(updates.keys())
            response_message = f"I've updated your profile with: {', '.join(fields)}."

            if "gpa" in updates or "test_scores" in updates:
                suggested_actions.append("Search for scholarships")
            if "desired_field" in updates:
                suggested_actions.append("Find matching programs")

        return ChatResponse(
            message=response_message,
            session_id=request.session_id or uuid4(),
            profile_updates=updates,
            suggested_actions=suggested_actions,
        )

    except Exception as e:
        logger.error(f"Chat processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Search Routes
# ============================================================================


@router.post("/api/search-scholarships", response_model=ScholarshipSearchResponse)
async def search_scholarships(request: ScholarshipSearchRequest) -> ScholarshipSearchResponse:
    """Search for scholarships based on profile.

    Args:
        request: Search request with profile and filters.

    Returns:
        List of matching scholarships and programs.
    """
    import traceback
    from scholar_agent.agents.scholarship_agent import get_scholarship_agent

    logger.info(f"Search request received: mode={request.search_mode}, profile={request.profile.user_id}")

    try:
        agent = await get_scholarship_agent()
        logger.info("Scholarship agent initialized")

        scholarships, programs, hedera_tx_id, messages = await agent.search(
            profile=request.profile,
            search_mode=request.search_mode,
            school_name=request.school_name,
            program_name=request.program_name,
        )
        logger.info(f"Search completed: {len(scholarships)} scholarships, {len(programs)} programs")

        from scholar_agent.services.hedera import get_hedera_service

        hedera_service = await get_hedera_service()
        verification_url = hedera_service.get_hashscan_url(hedera_tx_id) if hedera_tx_id else None

        return ScholarshipSearchResponse(
            scholarships=scholarships,
            programs=programs,
            total_scholarships=len(scholarships),
            total_programs=len(programs),
            search_mode=request.search_mode,
            hedera_verification_url=verification_url,
        )

    except Exception as e:
        logger.error(f"Scholarship search failed: {e}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/api/search-by-program", response_model=ScholarshipSearchResponse)
async def search_by_program(
    profile: StudentProfile,
    school_name: str,
    program_name: str,
    desired_field: str = "",
) -> ScholarshipSearchResponse:
    """Search scholarships for a specific program.

    Args:
        profile: Student profile.
        school_name: Name of the school.
        program_name: Name of the program.
        desired_field: Desired field with focus.

    Returns:
        List of scholarships for the program.
    """
    request = ScholarshipSearchRequest(
        profile=profile,
        search_mode=SearchMode.BY_PROGRAM,
        school_name=school_name,
        program_name=program_name,
    )

    return await search_scholarships(request)


@router.post("/api/search-programs-by-scholarship", response_model=ScholarshipSearchResponse)
async def search_programs_by_scholarship(
    profile: StudentProfile,
    desired_field: str = "",
) -> ScholarshipSearchResponse:
    """Search programs that match available scholarships.

    Args:
        profile: Student profile.
        desired_field: Desired field with focus.

    Returns:
        List of programs grouped by scholarships.
    """
    request = ScholarshipSearchRequest(
        profile=profile,
        search_mode=SearchMode.BY_SCHOLARSHIP,
    )

    return await search_scholarships(request)


# ============================================================================
# Crawl Routes
# ============================================================================


@router.post("/api/crawl-scholarship", response_model=CrawlScholarshipResponse)
async def crawl_scholarship(request: CrawlScholarshipRequest) -> CrawlScholarshipResponse:
    """Crawl a scholarship URL for detailed information.

    Args:
        request: Crawl request with URL.

    Returns:
        Detailed scholarship information.
    """
    from scholar_agent.services.scholarship_search import get_scholarship_search_service

    try:
        search_service = await get_scholarship_search_service()

        # Search for specific scholarship
        results = await search_service.search_web(request.scholarship_url, max_results=1)

        if not results:
            raise HTTPException(status_code=404, detail="Could not crawl scholarship URL")

        # Parse into scholarship object
        from scholar_agent.models import StudentProfile, StudyLevel, TestScores

        # Create a dummy profile for parsing
        dummy_profile = StudentProfile(
            gpa=3.0,
            major="General",
            desired_field="General",
            target_country="USA",
            level=StudyLevel.MASTER,
            test_scores=TestScores(),
        )

        scholarship = search_service._parse_scholarship_from_search_result(
            results[0], dummy_profile
        )

        if not scholarship:
            raise HTTPException(status_code=500, detail="Failed to parse scholarship data")

        return CrawlScholarshipResponse(
            scholarship=scholarship,
            crawl_status="success",
            pages_crawled=1,
            errors=[],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scholarship crawl failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# School & Program Routes
# ============================================================================


@router.get("/api/search-schools")
async def search_schools(
    country: str = Query(..., description="Country to search in"),
    field: str | None = Query(None, description="Field of study"),
) -> list[dict]:
    """Search for schools in a country.

    Args:
        country: Target country.
        field: Optional field filter.

    Returns:
        List of schools.
    """
    from scholar_agent.services.scholarship_search import get_scholarship_search_service

    try:
        search_service = await get_scholarship_search_service()
        schools = await search_service.get_schools(country, field)
        return schools

    except Exception as e:
        logger.error(f"School search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/search-programs")
async def search_programs(
    school_id: str | None = Query(None, description="School ID"),
    field: str | None = Query(None, description="Field of study"),
    level: str | None = Query(None, description="Study level"),
    country: str | None = Query(None, description="Country"),
) -> list[Program]:
    """Search for programs.

    Args:
        school_id: Optional school ID.
        field: Optional field filter.
        level: Optional study level.
        country: Optional country filter.

    Returns:
        List of programs.
    """
    # This would typically query a database
    # For now, return empty list as programs are found via search
    return []


# ============================================================================
# Export Routes
# ============================================================================


@router.post("/api/export-excel")
async def export_excel(request: ExportRequest) -> StreamingResponse:
    """Export scholarships and programs to Excel.

    Args:
        request: Export request with data.

    Returns:
        Excel file download.
    """
    from scholar_agent.services.excel_export import get_excel_export_service

    try:
        export_service = get_excel_export_service()
        file_bytes, filename = export_service.export_to_excel(request)

        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        logger.error(f"Excel export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Health Check
# ============================================================================


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint.

    Returns:
        Health status.
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/api/hedera/topic")
async def get_hedera_topic() -> dict:
    """Get Hedera topic information.

    Returns:
        Hedera topic details.
    """
    from scholar_agent.services.hedera import get_hedera_service

    hedera_service = await get_hedera_service()

    return {
        "topic_id": settings.hedera_topic_id or "Not configured",
        "network": settings.hedera_network,
        "topic_url": hedera_service.get_topic_url(),
    }
