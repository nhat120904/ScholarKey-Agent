"""ScholarKey AI - Your Verifiable, AI-Powered Pathway to Global Education.

An autonomous AI agent system that simplifies the study abroad application process
by analyzing student profiles, searching for matching scholarships, and generating
structured Excel plans with Hedera blockchain verification.
"""

__version__ = "0.1.0"
__author__ = "ScholarKey AI Team"

from scholar_agent.config import Settings, get_settings
from scholar_agent.models import (
    Program,
    Scholarship,
    SearchMode,
    StudentProfile,
    StudyLevel,
)

__all__ = [
    "Program",
    "Scholarship",
    "SearchMode",
    "Settings",
    "StudentProfile",
    "StudyLevel",
    "get_settings",
]
