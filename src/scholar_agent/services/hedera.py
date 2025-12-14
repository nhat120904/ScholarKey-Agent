"""Hedera Consensus Service integration for profile verification."""

import hashlib
import json
import logging
from datetime import datetime

from scholar_agent.config import get_settings
from scholar_agent.models import StudentProfile

logger = logging.getLogger(__name__)


class HederaService:
    """Service for interacting with Hedera Consensus Service."""

    def __init__(self) -> None:
        """Initialize the Hedera service."""
        self.settings = get_settings()
        self._client: object | None = None
        self._topic_id: str | None = None

    async def initialize(self) -> None:
        """Initialize the Hedera client connection."""
        if not self.settings.hedera_account_id or not self.settings.hedera_private_key:
            logger.warning("Hedera credentials not configured. Verification disabled.")
            return

        try:
            # Note: In production, use hedera-sdk-py
            # For now, we'll simulate the connection
            self._topic_id = self.settings.hedera_topic_id
            logger.info(f"Hedera client initialized for topic: {self._topic_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Hedera client: {e}")
            raise

    def compute_cv_hash(self, cv_content: bytes) -> str:
        """Compute SHA-256 hash of CV content.

        Args:
            cv_content: Raw bytes of the CV file.

        Returns:
            Hexadecimal string of the SHA-256 hash.
        """
        return hashlib.sha256(cv_content).hexdigest()

    def compute_profile_hash(self, profile: StudentProfile) -> str:
        """Compute SHA-256 hash of profile data.

        Args:
            profile: The student profile to hash.

        Returns:
            Hexadecimal string of the SHA-256 hash.
        """
        profile_data = profile.model_dump_json(
            exclude={"cv_hash", "hedera_tx_id", "hedera_topic_sequence"}
        )
        return hashlib.sha256(profile_data.encode()).hexdigest()

    async def submit_verification(
        self,
        user_id: str,
        cv_hash: str,
        profile_summary: dict[str, object] | None = None,
    ) -> tuple[str | None, int | None]:
        """Submit a verification message to HCS.

        Args:
            user_id: The user's unique identifier.
            cv_hash: SHA-256 hash of the CV content.
            profile_summary: Optional summary of profile data.

        Returns:
            Tuple of (transaction_id, sequence_number) or (None, None) if failed.
        """
        if not self._topic_id:
            logger.warning("Hedera topic not configured. Skipping verification.")
            return None, None

        # Construct the verification message
        message = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "cv_hash": cv_hash,
            "status": "Verified",
            "profile_summary": profile_summary or {},
        }

        message_json = json.dumps(message)

        try:
            # NOTE: In production, use hedera-sdk-py with TopicMessageSubmitTransaction
            # to submit messages to HCS topics. For development/demo, we simulate.

            # For development/demo, simulate the response
            logger.info(f"Submitting verification to HCS: {message_json[:100]}...")

            # Simulated transaction ID and sequence
            simulated_tx_id = f"0.0.{self.settings.hedera_account_id}@{int(datetime.utcnow().timestamp())}"
            simulated_sequence = 1

            logger.info(f"Verification submitted. TX ID: {simulated_tx_id}")
            return simulated_tx_id, simulated_sequence

        except Exception as e:
            logger.error(f"Failed to submit verification to HCS: {e}")
            return None, None

    async def submit_search_session(
        self,
        session_id: str,
        user_id: str,
        search_params: dict[str, object],
        results_summary: dict[str, object],
    ) -> str | None:
        """Submit a search session record to HCS.

        Args:
            session_id: Unique search session identifier.
            user_id: The user's unique identifier.
            search_params: Search parameters used.
            results_summary: Summary of search results.

        Returns:
            Transaction ID or None if failed.
        """
        if not self._topic_id:
            return None

        search_params_hash = hashlib.sha256(
            json.dumps(search_params, sort_keys=True).encode()
        ).hexdigest()
        results_count = results_summary.get("total_results", 0)
        _ = {
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": session_id,
            "user_id": user_id,
            "type": "search_session",
            "search_params_hash": search_params_hash,
            "results_count": results_count,
        }

        try:
            # Simulated for development
            tx_id = f"0.0.{self.settings.hedera_account_id}@{int(datetime.utcnow().timestamp())}"
            logger.info(f"Search session recorded. TX ID: {tx_id}")
            return tx_id
        except Exception as e:
            logger.error(f"Failed to submit search session: {e}")
            return None

    def get_hashscan_url(self, tx_id: str) -> str:
        """Get HashScan URL for a transaction.

        Args:
            tx_id: The Hedera transaction ID.

        Returns:
            URL to view the transaction on HashScan.
        """
        network = self.settings.hedera_network
        base_url = f"https://hashscan.io/{network}/transaction"
        return f"{base_url}/{tx_id}"

    def get_topic_url(self) -> str | None:
        """Get HashScan URL for the HCS topic.

        Returns:
            URL to view the topic on HashScan or None.
        """
        if not self._topic_id:
            return None
        network = self.settings.hedera_network
        return f"https://hashscan.io/{network}/topic/{self._topic_id}"


# Singleton instance
_hedera_service: HederaService | None = None


async def get_hedera_service() -> HederaService:
    """Get or create the Hedera service singleton."""
    global _hedera_service  # noqa: PLW0603
    if _hedera_service is None:
        _hedera_service = HederaService()
        await _hedera_service.initialize()
    return _hedera_service
