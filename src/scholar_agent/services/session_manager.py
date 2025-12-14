"""Session management service for multi-agent conversations."""

import logging
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from scholar_agent.agents.state import SessionState, SessionSummary, SupervisorState
from scholar_agent.config import get_settings
from scholar_agent.models import StudentProfile

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages conversation sessions and state persistence.

    Currently uses in-memory storage. Can be extended to use Redis,
    PostgreSQL, or other persistent storage backends.
    """

    def __init__(self) -> None:
        """Initialize the session manager."""
        self.settings = get_settings()
        self._sessions: dict[str, SessionState] = {}
        self._supervisor_states: dict[str, SupervisorState] = {}
        self._session_timeout = timedelta(minutes=60)

    def create_session(
        self,
        user_id: UUID | str | None = None,
    ) -> SessionState:
        """Create a new session.

        Args:
            user_id: Optional user ID to associate with session.

        Returns:
            New SessionState instance.
        """
        session = SessionState(
            user_id=UUID(str(user_id)) if user_id else uuid4(),
        )

        self._sessions[str(session.session_id)] = session
        logger.info(f"Created new session: {session.session_id}")

        return session

    def get_session(self, session_id: str | UUID) -> SessionState | None:
        """Get an existing session.

        Args:
            session_id: Session ID to look up.

        Returns:
            SessionState if found and not expired, None otherwise.
        """
        session_key = str(session_id)
        session = self._sessions.get(session_key)

        if session is None:
            return None

        # Check if session has expired
        if datetime.now() - session.last_activity > self._session_timeout:
            logger.info(f"Session expired: {session_id}")
            self.delete_session(session_id)
            return None

        return session

    def get_or_create_session(
        self,
        session_id: str | UUID | None = None,
        user_id: UUID | str | None = None,
    ) -> SessionState:
        """Get existing session or create a new one.

        Args:
            session_id: Optional existing session ID.
            user_id: Optional user ID for new session.

        Returns:
            SessionState instance.
        """
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session

        return self.create_session(user_id)

    def update_session(
        self,
        session_id: str | UUID,
        **updates: Any,
    ) -> SessionState | None:
        """Update session properties.

        Args:
            session_id: Session ID to update.
            **updates: Properties to update.

        Returns:
            Updated SessionState or None if not found.
        """
        session = self.get_session(session_id)
        if session is None:
            return None

        for key, value in updates.items():
            if hasattr(session, key):
                setattr(session, key, value)

        session.last_activity = datetime.now()
        self._sessions[str(session_id)] = session

        return session

    def delete_session(self, session_id: str | UUID) -> bool:
        """Delete a session.

        Args:
            session_id: Session ID to delete.

        Returns:
            True if deleted, False if not found.
        """
        session_key = str(session_id)
        if session_key in self._sessions:
            del self._sessions[session_key]
            if session_key in self._supervisor_states:
                del self._supervisor_states[session_key]
            logger.info(f"Deleted session: {session_id}")
            return True
        return False

    def save_supervisor_state(
        self,
        session_id: str | UUID,
        state: SupervisorState,
    ) -> None:
        """Save supervisor agent state for a session.

        Args:
            session_id: Session ID to associate state with.
            state: SupervisorState to save.
        """
        self._supervisor_states[str(session_id)] = state

    def get_supervisor_state(
        self,
        session_id: str | UUID,
    ) -> SupervisorState | None:
        """Get saved supervisor state for a session.

        Args:
            session_id: Session ID to look up.

        Returns:
            SupervisorState if found, None otherwise.
        """
        return self._supervisor_states.get(str(session_id))

    def update_profile(
        self,
        session_id: str | UUID,
        profile: StudentProfile,
    ) -> SessionState | None:
        """Update the profile associated with a session.

        Args:
            session_id: Session ID.
            profile: Updated StudentProfile.

        Returns:
            Updated SessionState or None.
        """
        session = self.get_session(session_id)
        if session is None:
            return None

        session.profile = profile
        session.last_activity = datetime.now()

        # Also update supervisor state if it exists
        sup_state = self.get_supervisor_state(session_id)
        if sup_state:
            sup_state["profile"] = profile
            self.save_supervisor_state(session_id, sup_state)

        return session

    def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions.

        Returns:
            Number of sessions removed.
        """
        now = datetime.now()
        expired = []

        for session_id, session in self._sessions.items():
            if now - session.last_activity > self._session_timeout:
                expired.append(session_id)

        for session_id in expired:
            self.delete_session(session_id)

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")

        return len(expired)

    def get_active_session_count(self) -> int:
        """Get count of active (non-expired) sessions.

        Returns:
            Number of active sessions.
        """
        return len(self._sessions)

    def list_sessions(self, user_id: str | UUID | None = None) -> list[SessionState]:
        """List all sessions, optionally filtered by user.

        Args:
            user_id: Optional user ID to filter by.

        Returns:
            List of SessionState instances.
        """
        sessions = list(self._sessions.values())

        if user_id:
            user_uuid = UUID(str(user_id))
            sessions = [s for s in sessions if s.user_id == user_uuid]

        return sessions

    def list_session_summaries(
        self,
        user_id: str | UUID | None = None,
        sort_by_activity: bool = True,
    ) -> list[SessionSummary]:
        """List session summaries for display.

        Args:
            user_id: Optional user ID to filter by.
            sort_by_activity: Whether to sort by last activity (most recent first).

        Returns:
            List of SessionSummary instances.
        """
        sessions = self.list_sessions(user_id)

        summaries = []
        for session in sessions:
            summary = SessionSummary(
                session_id=session.session_id,
                title=session.get_title(),
                preview=session.get_preview(),
                last_activity=session.last_activity,
                message_count=len(session.conversation_history),
                has_profile=session.profile is not None,
                has_scholarships=session.search_results is not None
                and len(session.search_results) > 0,
            )
            summaries.append(summary)

        if sort_by_activity:
            summaries.sort(key=lambda s: s.last_activity, reverse=True)

        return summaries

    def update_session_title(
        self,
        session_id: str | UUID,
        title: str,
    ) -> SessionState | None:
        """Update the title of a session.

        Args:
            session_id: Session ID to update.
            title: New title for the session.

        Returns:
            Updated SessionState or None if not found.
        """
        session = self.get_session(session_id)
        if session is None:
            return None

        session.title = title
        session.last_activity = datetime.now()
        self._sessions[str(session_id)] = session

        logger.info(f"Updated session title: {session_id} -> {title}")
        return session

    def get_session_summary(
        self,
        session_id: str | UUID,
    ) -> SessionSummary | None:
        """Get a session summary by ID.

        Args:
            session_id: Session ID to look up.

        Returns:
            SessionSummary if found, None otherwise.
        """
        session = self.get_session(session_id)
        if session is None:
            return None

        return SessionSummary(
            session_id=session.session_id,
            title=session.get_title(),
            preview=session.get_preview(),
            last_activity=session.last_activity,
            message_count=len(session.conversation_history),
            has_profile=session.profile is not None,
            has_scholarships=session.search_results is not None
            and len(session.search_results) > 0,
        )


# Singleton instance
_session_manager_instance: SessionManager | None = None


def get_session_manager() -> SessionManager:
    """Get or create the session manager instance.

    Returns:
        SessionManager singleton instance.
    """
    global _session_manager_instance
    if _session_manager_instance is None:
        _session_manager_instance = SessionManager()
    return _session_manager_instance
