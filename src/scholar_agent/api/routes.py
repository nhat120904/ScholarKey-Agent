"""FastAPI routes for ScholarAgent."""

import io
import logging
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from scholar_agent.config import get_settings
from scholar_agent.models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ConversationHistoryResponse,
    CrawlScholarshipRequest,
    CrawlScholarshipResponse,
    CVUploadResponse,
    ExportRequest,
    ScholarshipSearchRequest,
    ScholarshipSearchResponse,
    SessionListResponse,
    SessionResponse,
    SessionSummaryResponse,
    StudentProfile,
    StudyLevel,
    UpdateSessionRequest,
    UpdateSessionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


# ============================================================================
# Profile Routes
# ============================================================================


@router.post("/api/upload-profile", response_model=CVUploadResponse)
async def upload_profile(
    file: Annotated[UploadFile, File(...)],
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
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message through the multi-agent supervisor.

    This is the main chat endpoint that routes messages to appropriate agents
    (profile, search, plan) based on user intent.

    Args:
        request: Chat request with message and optional session/profile.

    Returns:
        Chat response from the appropriate agent.
    """

    from scholar_agent.agents.supervisor import get_supervisor
    from scholar_agent.services.session_manager import get_session_manager

    try:
        # Get or create session
        session_manager = get_session_manager()
        session = session_manager.get_or_create_session(
            session_id=request.session_id,
        )

        # Update session profile if provided in request
        if request.profile:
            session.profile = request.profile

        # Get supervisor and existing state
        supervisor = get_supervisor()
        existing_state = session_manager.get_supervisor_state(session.session_id)

        # If we have a profile from session but not in state, add it
        if existing_state and session.profile and not existing_state.get("profile"):
            existing_state["profile"] = session.profile

        # Process message through supervisor
        response_text, updated_state = await supervisor.process_message(
            message=request.message,
            session_id=str(session.session_id),
            user_id=str(session.user_id),
            existing_state=existing_state,
        )

        # Save updated state
        session_manager.save_supervisor_state(session.session_id, updated_state)

        # Update session with any profile changes
        if updated_state.get("profile"):
            session.profile = updated_state["profile"]

        # Add message to session history
        session.add_message("user", request.message)
        session.add_message(
            "assistant", response_text, agent=updated_state.get("current_agent")
        )

        # Build response
        profile_updates = None
        if updated_state.get("profile") and request.profile:
            # Calculate what changed
            new_profile = updated_state["profile"]
            old_profile = request.profile
            profile_updates = {}
            for field in [
                "gpa",
                "test_scores",
                "major",
                "desired_field",
                "target_country",
                "skills",
            ]:
                old_val = getattr(old_profile, field, None)
                new_val = getattr(new_profile, field, None)
                if old_val != new_val:
                    profile_updates[field] = new_val

        # Get suggested actions from last response
        suggested_actions = []
        last_response = updated_state.get("last_response")
        if last_response and hasattr(last_response, "follow_up_actions"):
            suggested_actions = last_response.follow_up_actions

        return ChatResponse(
            message=response_text,
            session_id=session.session_id,
            profile_updates=profile_updates,
            suggested_actions=suggested_actions,
            agent=updated_state.get("current_agent"),
        )

    except Exception as e:
        logger.error(f"Chat processing failed: {e}")
        import traceback

        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ============================================================================
# Search Routes
# ============================================================================


@router.post("/api/search-scholarships", response_model=ScholarshipSearchResponse)
async def search_scholarships(
    request: ScholarshipSearchRequest,
) -> ScholarshipSearchResponse:
    """Search for scholarships based on profile.

    Args:
        request: Search request with profile and filters.

    Returns:
        List of matching scholarships and programs.
    """
    import traceback

    from scholar_agent.agents.scholarship_agent import get_scholarship_agent

    logger.info(
        f"Search request received: mode={request.search_mode}, profile={request.profile.user_id}"
    )

    try:
        agent = await get_scholarship_agent()
        logger.info("Scholarship agent initialized")

        scholarships, programs, hedera_tx_id, messages = await agent.search(
            profile=request.profile,
            search_mode=request.search_mode,
            school_name=request.school_name,
            program_name=request.program_name,
        )
        logger.info(
            f"Search completed: {len(scholarships)} scholarships, {len(programs)} programs"
        )

        from scholar_agent.services.hedera import get_hedera_service

        hedera_service = await get_hedera_service()
        verification_url = (
            hedera_service.get_hashscan_url(hedera_tx_id) if hedera_tx_id else None
        )

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
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e!s}") from e


# ============================================================================
# Crawl Routes
# ============================================================================


@router.post("/api/crawl-scholarship", response_model=CrawlScholarshipResponse)
async def crawl_scholarship(
    request: CrawlScholarshipRequest,
) -> CrawlScholarshipResponse:
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
        results = await search_service.search_web(
            request.scholarship_url, max_results=1
        )

        if not results:
            raise HTTPException(
                status_code=404, detail="Could not crawl scholarship URL"
            )

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
            raise HTTPException(
                status_code=500, detail="Failed to parse scholarship data"
            )

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
        raise HTTPException(status_code=500, detail=str(e)) from e


# ============================================================================
# Export Routes
# ============================================================================


@router.post("/api/export-excel", response_class=StreamingResponse)
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
        raise HTTPException(status_code=500, detail=str(e)) from e


# ============================================================================
# Health Check
# ============================================================================


@router.get("/health", response_model=dict[str, str])
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Health status.
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/api/hedera/topic", response_model=dict[str, Any])
async def get_hedera_topic() -> dict[str, Any]:
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


# ============================================================================
# Session Management Routes
# ============================================================================


@router.get("/api/sessions", response_model=SessionListResponse)
async def list_sessions(
    user_id: str | None = Query(None, description="Filter by user ID"),
) -> SessionListResponse:
    """List all sessions with summaries.

    Args:
        user_id: Optional user ID to filter sessions by.

    Returns:
        List of session summaries.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    summaries = session_manager.list_session_summaries(user_id=user_id)

    return SessionListResponse(
        sessions=[
            SessionSummaryResponse(
                session_id=str(s.session_id),
                title=s.title,
                preview=s.preview,
                last_activity=s.last_activity.isoformat(),
                message_count=s.message_count,
                has_profile=s.has_profile,
                has_scholarships=s.has_scholarships,
            )
            for s in summaries
        ],
        total_count=len(summaries),
    )


@router.post("/api/session", response_model=SessionResponse)
async def create_session() -> SessionResponse:
    """Create a new session.

    Returns:
        New session information including session ID.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    session = session_manager.create_session()

    # Get Hedera info
    hedera_info = None
    try:
        from scholar_agent.services.hedera import get_hedera_service

        hedera_service = await get_hedera_service()
        hedera_info = {
            "topic_id": settings.hedera_topic_id or "Not configured",
            "network": settings.hedera_network,
            "topic_url": hedera_service.get_topic_url(),
        }
    except Exception as e:
        logger.warning(f"Failed to get Hedera info: {e}")

    return SessionResponse(
        session_id=str(session.session_id),
        user_id=str(session.user_id),
        title=session.get_title(),
        profile=session.profile,
        hedera_info=hedera_info,
        created_at=session.created_at.isoformat(),
        last_activity=session.last_activity.isoformat(),
    )


@router.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """Get session state and conversation history.

    Args:
        session_id: Session ID to retrieve.

    Returns:
        Session information including profile and history.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    # Get Hedera info
    hedera_info = None
    try:
        from scholar_agent.services.hedera import get_hedera_service

        hedera_service = await get_hedera_service()
        hedera_info = {
            "topic_id": settings.hedera_topic_id or "Not configured",
            "network": settings.hedera_network,
            "topic_url": hedera_service.get_topic_url(),
        }
    except Exception as e:
        logger.warning(f"Failed to get Hedera info: {e}")

    return SessionResponse(
        session_id=str(session.session_id),
        user_id=str(session.user_id),
        title=session.get_title(),
        profile=session.profile,
        hedera_info=hedera_info,
        created_at=session.created_at.isoformat(),
        last_activity=session.last_activity.isoformat(),
    )


@router.patch("/api/session/{session_id}", response_model=UpdateSessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
) -> UpdateSessionResponse:
    """Update session properties (e.g., rename).

    Args:
        session_id: Session ID to update.
        request: Update request with new properties.

    Returns:
        Updated session information.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if request.title is not None:
        session = session_manager.update_session_title(session_id, request.title)
        if session is None:
            raise HTTPException(status_code=500, detail="Failed to update session")

    return UpdateSessionResponse(
        session_id=str(session.session_id),
        title=session.title,
        message="Session updated successfully",
    )


@router.delete("/api/session/{session_id}", response_model=dict[str, str])
async def delete_session(session_id: str) -> dict[str, str]:
    """Delete a session.

    Args:
        session_id: Session ID to delete.

    Returns:
        Deletion confirmation.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    deleted = session_manager.delete_session(session_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "deleted", "session_id": session_id}


@router.get(
    "/api/session/{session_id}/history", response_model=ConversationHistoryResponse
)
async def get_session_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=100, description="Number of messages to return"),
) -> ConversationHistoryResponse:
    """Get conversation history for a session.

    Args:
        session_id: Session ID.
        limit: Maximum number of messages to return.

    Returns:
        Conversation history.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    messages = session.get_recent_messages(limit)

    return ConversationHistoryResponse(
        session_id=str(session.session_id),
        messages=[
            ChatMessage(
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp,
            )
            for msg in messages
        ],
        total_messages=len(session.conversation_history),
    )


@router.post("/api/session/{session_id}/profile", response_model=dict[str, Any])
async def update_session_profile(
    session_id: str,
    profile: StudentProfile,
) -> dict[str, Any]:
    """Update the profile for a session.

    Args:
        session_id: Session ID.
        profile: Updated student profile.

    Returns:
        Updated session info.
    """
    from scholar_agent.services.session_manager import get_session_manager

    session_manager = get_session_manager()
    session = session_manager.update_profile(session_id, profile)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return {
        "session_id": str(session.session_id),
        "profile_updated": True,
        "profile": profile.model_dump(),
    }


# ============================================================================
# Agent Routes
# ============================================================================


@router.get("/api/agents")
async def get_agents() -> dict[str, Any]:
    """Get list of available agents with their metadata.

    Returns:
        Dictionary containing list of agents with their details.
    """
    agents = [
        {
            "id": "supervisor",
            "label": "Supervisor",
            "description": "Coordinating agents",
            "color": "purple",
        },
        {
            "id": "profile",
            "label": "Profile Agent",
            "description": "Analyzing your profile",
            "color": "blue",
        },
        {
            "id": "search",
            "label": "Search Agent",
            "description": "Finding scholarships",
            "color": "emerald",
        },
        {
            "id": "plan",
            "label": "Plan Agent",
            "description": "Planning your journey",
            "color": "amber",
        },
    ]

    return {
        "agents": agents,
        "default_agent": "supervisor",
    }
