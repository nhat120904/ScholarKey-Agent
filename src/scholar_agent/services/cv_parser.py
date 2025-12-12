"""CV parsing service using Claude AI."""

import io
import logging
import re
from pathlib import Path

import anthropic
from docx import Document as DocxDocument
from pdfminer.high_level import extract_text as pdf_extract_text

from scholar_agent.config import get_settings
from scholar_agent.models import StudentProfile, StudyLevel, TestScores
from scholar_agent.services.hedera import get_hedera_service

logger = logging.getLogger(__name__)

# Prompt for CV parsing
CV_PARSING_PROMPT = """You are an expert at extracting structured information from CVs and academic profiles.

Analyze the following CV/resume text and extract the following information in JSON format:

1. name: Full name of the person
2. email: Email address if present
3. gpa: GPA on a 4.0 scale (convert if needed, use null if not found)
4. test_scores: Object containing:
   - ielts: IELTS score (0-9 scale)
   - toefl: TOEFL score (0-120)
   - gre: GRE total score (260-340)
   - gmat: GMAT score (200-800)
5. major: Primary field of study/major
6. publications: Number of publications (count them)
7. work_experience_years: Total years of work experience (estimate from dates)
8. skills: List of technical and soft skills
9. education_level: Highest education level (bachelor/master/phd)

Return ONLY valid JSON with these fields. Use null for fields you cannot determine.

CV TEXT:
{cv_text}

JSON OUTPUT:"""


class CVParserService:
    """Service for parsing CVs and extracting profile information."""

    def __init__(self) -> None:
        """Initialize the CV parser service."""
        self.settings = get_settings()
        self._client: anthropic.Anthropic | None = None

    def _get_client(self) -> anthropic.Anthropic:
        """Get or create Anthropic client."""
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
        return self._client

    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file.

        Args:
            file_content: Raw bytes of the PDF file.

        Returns:
            Extracted text content.
        """
        try:
            file_stream = io.BytesIO(file_content)
            text = pdf_extract_text(file_stream)
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise ValueError(f"Failed to parse PDF: {e}") from e

    def extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file.

        Args:
            file_content: Raw bytes of the DOCX file.

        Returns:
            Extracted text content.
        """
        try:
            file_stream = io.BytesIO(file_content)
            doc = DocxDocument(file_stream)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {e}")
            raise ValueError(f"Failed to parse DOCX: {e}") from e

    def extract_text(self, file_content: bytes, filename: str) -> str:
        """Extract text from file based on extension.

        Args:
            file_content: Raw bytes of the file.
            filename: Original filename with extension.

        Returns:
            Extracted text content.
        """
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            return self.extract_text_from_pdf(file_content)
        elif ext in (".docx", ".doc"):
            return self.extract_text_from_docx(file_content)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    async def parse_cv_with_ai(
        self,
        cv_text: str,
        target_country: str = "USA",
        desired_field: str = "",
    ) -> dict:
        """Parse CV text using Claude AI.

        Args:
            cv_text: Extracted text from CV.
            target_country: Target country for study.
            desired_field: Desired field with focus area.

        Returns:
            Dictionary of extracted profile data.
        """
        client = self._get_client()

        prompt = CV_PARSING_PROMPT.format(cv_text=cv_text[:10000])  # Limit text length

        try:
            message = client.messages.create(
                model=self.settings.claude_model,
                max_tokens=2000,
                messages=[
                    {"role": "user", "content": prompt}
                ],
            )

            response_text = message.content[0].text

            # Extract JSON from response
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                import json

                parsed_data = json.loads(json_match.group())
                return parsed_data

            logger.error(f"No valid JSON found in response: {response_text[:200]}")
            return {}

        except Exception as e:
            logger.error(f"Failed to parse CV with AI: {e}")
            raise

    async def parse_cv(
        self,
        file_content: bytes,
        filename: str,
        target_country: str = "USA",
        desired_field: str = "",
        level: StudyLevel = StudyLevel.MASTER,
    ) -> tuple[StudentProfile, str]:
        """Parse CV and create student profile.

        Args:
            file_content: Raw bytes of the CV file.
            filename: Original filename.
            target_country: Target country for study.
            desired_field: Desired field with focus area.
            level: Study level (bachelor/master/phd).

        Returns:
            Tuple of (StudentProfile, hedera_verification_url).
        """
        # Extract text from file
        cv_text = self.extract_text(file_content, filename)

        # Parse with AI
        parsed_data = await self.parse_cv_with_ai(cv_text, target_country, desired_field)

        # Compute CV hash
        hedera_service = await get_hedera_service()
        cv_hash = hedera_service.compute_cv_hash(file_content)

        # Create test scores
        test_scores = TestScores(
            ielts=parsed_data.get("test_scores", {}).get("ielts"),
            toefl=parsed_data.get("test_scores", {}).get("toefl"),
            gre=parsed_data.get("test_scores", {}).get("gre"),
            gmat=parsed_data.get("test_scores", {}).get("gmat"),
        )

        # Determine study level from parsed data
        education_level_str = parsed_data.get("education_level", "").lower()
        if education_level_str == "phd":
            detected_level = StudyLevel.PHD
        elif education_level_str == "master":
            detected_level = StudyLevel.MASTER
        else:
            detected_level = level

        # Extract GPA with proper fallback (handle None values)
        gpa_value = parsed_data.get("gpa")
        if gpa_value is None or not isinstance(gpa_value, (int, float)):
            gpa_value = 0.0  # Default GPA if not found
        else:
            gpa_value = float(gpa_value)
            # Ensure GPA is within valid range
            if gpa_value > 4.0:
                gpa_value = gpa_value / 10.0 if gpa_value <= 40.0 else 4.0  # Handle 10-point scale
            gpa_value = min(max(gpa_value, 0.0), 4.0)

        # Create profile
        profile = StudentProfile(
            name=parsed_data.get("name") or "Unknown",
            email=parsed_data.get("email"),
            gpa=gpa_value,
            test_scores=test_scores,
            major=parsed_data.get("major") or "Not specified",
            desired_field=desired_field or parsed_data.get("major") or "Not specified",
            publications=parsed_data.get("publications") or 0,
            work_experience_years=parsed_data.get("work_experience_years") or 0,
            skills=parsed_data.get("skills") or [],
            target_country=target_country,
            level=detected_level,
            cv_hash=cv_hash,
        )

        # Submit to Hedera for verification
        tx_id, sequence = await hedera_service.submit_verification(
            user_id=str(profile.user_id),
            cv_hash=cv_hash,
            profile_summary={
                "gpa": profile.gpa,
                "major": profile.major,
                "skills_count": len(profile.skills),
            },
        )

        profile.hedera_tx_id = tx_id
        profile.hedera_topic_sequence = sequence

        verification_url = hedera_service.get_hashscan_url(tx_id) if tx_id else None

        return profile, verification_url or ""

    async def parse_chat_message(
        self,
        message: str,
        existing_profile: StudentProfile | None = None,
    ) -> dict:
        """Parse natural language input to extract profile data.

        Args:
            message: User's natural language message.
            existing_profile: Existing profile to update.

        Returns:
            Dictionary of extracted/updated profile fields.
        """
        client = self._get_client()

        context = ""
        if existing_profile:
            context = f"\nExisting profile data: GPA={existing_profile.gpa}, Major={existing_profile.major}"

        prompt = f"""Extract any profile information from this user message.
Return JSON with only the fields mentioned. Valid fields are:
gpa, ielts, toefl, gre, publications, work_experience_years, skills, major, desired_field, target_country, level
{context}

User message: {message}

JSON (only include mentioned fields):"""

        try:
            response = client.messages.create(
                model=self.settings.claude_model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text

            import json

            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                return json.loads(json_match.group())
            return {}

        except Exception as e:
            logger.error(f"Failed to parse chat message: {e}")
            return {}


# Singleton instance
_cv_parser_service: CVParserService | None = None


async def get_cv_parser_service() -> CVParserService:
    """Get or create the CV parser service singleton."""
    global _cv_parser_service
    if _cv_parser_service is None:
        _cv_parser_service = CVParserService()
    return _cv_parser_service
