"""Scholarship search service using Tavily AI."""

import logging
from datetime import datetime
from uuid import uuid4

from tavily import TavilyClient

from scholar_agent.config import get_settings
from scholar_agent.models import (
    EligibilityCriteria,
    Program,
    ProgramRequirements,
    Scholarship,
    ScholarshipDeadlines,
    ScholarshipSearchRequest,
    ScholarshipSearchResponse,
    ScholarshipValue,
    ScholarshipValueType,
    SearchMode,
    StudentProfile,
    StudyLevel,
)
from scholar_agent.services.hedera import get_hedera_service

logger = logging.getLogger(__name__)


class ScholarshipSearchService:
    """Service for searching scholarships and programs."""

    def __init__(self) -> None:
        """Initialize the scholarship search service."""
        self.settings = get_settings()
        self._tavily_client: TavilyClient | None = None

    def _get_tavily_client(self) -> TavilyClient:
        """Get or create Tavily client."""
        if self._tavily_client is None:
            self._tavily_client = TavilyClient(api_key=self.settings.tavily_api_key)
        return self._tavily_client

    def _build_search_query(
        self,
        profile: StudentProfile,
        school_name: str | None = None,
        program_name: str | None = None,
    ) -> str:
        """Build a search query for scholarships.

        Args:
            profile: Student profile.
            school_name: Optional specific school name.
            program_name: Optional specific program name.

        Returns:
            Search query string.
        """
        parts = []

        # Base query
        parts.append("scholarships")

        # Country
        parts.append(f"{profile.target_country}")

        # Study level
        level_map = {
            StudyLevel.BACHELOR: "undergraduate bachelor",
            StudyLevel.MASTER: "masters graduate",
            StudyLevel.PHD: "PhD doctoral",
        }
        parts.append(level_map.get(profile.level, "graduate"))

        # Field
        parts.append(profile.desired_field or profile.major)

        # Specific school/program
        if school_name:
            parts.append(school_name)
        if program_name:
            parts.append(program_name)

        # Year
        parts.append(str(datetime.now().year))

        return " ".join(parts)

    async def search_web(
        self,
        query: str,
        max_results: int = 10,
    ) -> list[dict[str, str]]:
        """Search the web using Tavily.

        Args:
            query: Search query.
            max_results: Maximum number of results.

        Returns:
            List of search results.
        """
        client = self._get_tavily_client()

        try:
            response = client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_raw_content=True,
            )

            results: list[dict[str, str]] = response.get("results", [])
            return results

        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            return []

    def _calculate_match_score(  # noqa: PLR0912
        self,
        profile: StudentProfile,
        criteria: EligibilityCriteria,
    ) -> tuple[float, str]:
        """Calculate match score between profile and eligibility criteria.

        Args:
            profile: Student profile.
            criteria: Scholarship eligibility criteria.

        Returns:
            Tuple of (score, analysis).
        """
        score = 100.0
        analysis_parts = []

        # GPA check
        if criteria.min_gpa and profile.gpa < criteria.min_gpa:
            score -= 30
            analysis_parts.append(f"GPA {profile.gpa} below minimum {criteria.min_gpa}")
        elif criteria.min_gpa and profile.gpa >= criteria.min_gpa:
            analysis_parts.append(
                f"✓ GPA meets requirement ({profile.gpa} >= {criteria.min_gpa})"
            )

        # IELTS check
        if criteria.min_ielts and profile.test_scores.ielts:
            if profile.test_scores.ielts < criteria.min_ielts:
                score -= 20
                analysis_parts.append(
                    f"IELTS {profile.test_scores.ielts} below minimum {criteria.min_ielts}"
                )
            else:
                analysis_parts.append("✓ IELTS meets requirement")

        # TOEFL check
        if criteria.min_toefl and profile.test_scores.toefl:
            if profile.test_scores.toefl < criteria.min_toefl:
                score -= 20
                analysis_parts.append(
                    f"TOEFL {profile.test_scores.toefl} below minimum {criteria.min_toefl}"
                )
            else:
                analysis_parts.append("✓ TOEFL meets requirement")

        # Age check
        if criteria.max_age and profile.age and profile.age > criteria.max_age:
            score -= 50  # Hard requirement
            analysis_parts.append(
                f"Age {profile.age} exceeds maximum {criteria.max_age}"
            )

        # Nationality check
        if (
            criteria.excluded_nationalities
            and profile.nationality
            and profile.nationality in criteria.excluded_nationalities
        ):
            score = 0
            analysis_parts.append(f"Nationality {profile.nationality} is excluded")

        # Background check
        if criteria.required_background:
            major_lower = profile.major.lower()
            field_lower = profile.desired_field.lower()
            matches = any(
                bg.lower() in major_lower or bg.lower() in field_lower
                for bg in criteria.required_background
            )
            if matches:
                analysis_parts.append("✓ Background matches required fields")
            else:
                score -= 15
                analysis_parts.append(
                    f"Background may not fully match: {criteria.required_background}"
                )

        # Publications bonus
        if profile.publications > 0:
            score = min(100, score + profile.publications * 2)
            analysis_parts.append(
                f"✓ {profile.publications} publication(s) strengthen application"
            )

        # Work experience bonus
        if profile.work_experience_years > 0:
            score = min(100, score + profile.work_experience_years * 1.5)
            analysis_parts.append(
                f"✓ {profile.work_experience_years} year(s) work experience"
            )

        score = max(0, min(100, score))
        analysis = "; ".join(analysis_parts) if analysis_parts else "General match"

        return score, analysis

    def _parse_scholarship_from_search_result(
        self,
        result: dict[str, str],
        profile: StudentProfile,
    ) -> Scholarship | None:
        """Parse a search result into a Scholarship object.

        Args:
            result: Tavily search result.
            profile: Student profile for matching.

        Returns:
            Scholarship object or None if parsing fails.
        """
        try:
            title = result.get("title", "Unknown Scholarship")
            url = result.get("url", "")
            content = result.get("content", "")

            # Extract provider from URL or title
            provider = "Unknown"
            if "university" in title.lower():
                provider = title.split("-")[0].strip() if "-" in title else title
            elif url:
                from urllib.parse import urlparse

                domain = urlparse(url).netloc
                provider = domain.replace("www.", "").split(".")[0].title()

            # Create basic eligibility criteria
            criteria = EligibilityCriteria(
                study_levels=[profile.level],
                required_background=[profile.major],
            )

            # Calculate match score
            score, analysis = self._calculate_match_score(profile, criteria)

            scholarship = Scholarship(
                scholarship_id=uuid4(),
                name=title,
                provider=provider,
                country=profile.target_country,
                value=ScholarshipValue(
                    type=ScholarshipValueType.PARTIAL_TUITION,
                    description="See scholarship details",
                ),
                deadlines=ScholarshipDeadlines(),
                eligibility_criteria=criteria,
                url=url,
                description=content[:500] if content else None,
                match_score=score,
                match_analysis=analysis,
                last_crawled=datetime.now(),
            )

            return scholarship

        except Exception as e:
            logger.error(f"Failed to parse scholarship from result: {e}")
            return None

    async def search_scholarships(
        self,
        request: ScholarshipSearchRequest,
    ) -> ScholarshipSearchResponse:
        """Search for scholarships based on profile and preferences.

        Args:
            request: Search request with profile and filters.

        Returns:
            Search response with scholarships and programs.
        """
        profile = request.profile
        scholarships: list[Scholarship] = []
        programs: list[Program] = []

        # Build search query
        query = self._build_search_query(
            profile,
            request.school_name,
            request.program_name,
        )

        logger.info(f"Searching scholarships with query: {query}")

        # Search web
        results = await self.search_web(query, max_results=20)

        # Parse results into scholarships
        for result in results:
            scholarship = self._parse_scholarship_from_search_result(result, profile)
            if (
                scholarship
                and scholarship.match_score
                and scholarship.match_score >= request.min_match_score
            ):
                scholarships.append(scholarship)

        # Sort by match score
        scholarships.sort(key=lambda s: s.match_score or 0, reverse=True)

        # If searching by program, also search for that specific program
        if request.search_mode == SearchMode.BY_PROGRAM and request.school_name:
            program_query = (
                f"{request.school_name} {request.program_name} program requirements"
            )
            program_results = await self.search_web(program_query, max_results=5)

            for result in program_results:
                program = self._parse_program_from_search_result(
                    result, profile, request.school_name
                )
                if program:
                    programs.append(program)

        # Record search session to Hedera
        hedera_service = await get_hedera_service()
        session_id = uuid4()

        tx_id = await hedera_service.submit_search_session(
            session_id=str(session_id),
            user_id=str(profile.user_id),
            search_params={
                "country": profile.target_country,
                "level": profile.level.value,
                "field": profile.desired_field,
                "mode": request.search_mode.value,
            },
            results_summary={
                "total_results": len(scholarships),
                "programs_found": len(programs),
            },
        )

        verification_url = hedera_service.get_hashscan_url(tx_id) if tx_id else None

        return ScholarshipSearchResponse(
            scholarships=scholarships,
            programs=programs,
            total_scholarships=len(scholarships),
            total_programs=len(programs),
            search_mode=request.search_mode,
            hedera_verification_url=verification_url,
            search_session_id=session_id,
        )

    def _parse_program_from_search_result(
        self,
        result: dict[str, str],
        profile: StudentProfile,
        school_name: str,
    ) -> Program | None:
        """Parse a search result into a Program object.

        Args:
            result: Tavily search result.
            profile: Student profile for matching.
            school_name: Name of the school.

        Returns:
            Program object or None if parsing fails.
        """
        try:
            title = result.get("title", "Unknown Program")
            url = result.get("url", "")
            content = result.get("content", "")

            program = Program(
                program_id=uuid4(),
                name=title,
                school_name=school_name,
                country=profile.target_country,
                level=profile.level,
                field=profile.major,
                focus_areas=[profile.desired_field.split("focus on")[-1].strip()]
                if "focus on" in profile.desired_field
                else [],
                requirements=ProgramRequirements(),
                url=url,
                description=content[:500] if content else None,
                field_alignment_score=85.0,  # Simplified for now
                profile_match_score=80.0,
            )

            return program

        except Exception as e:
            logger.error(f"Failed to parse program from result: {e}")
            return None

    async def search_by_program(
        self,
        profile: StudentProfile,
        school_name: str,
        program_name: str,
    ) -> ScholarshipSearchResponse:
        """Search scholarships for a specific program.

        Args:
            profile: Student profile.
            school_name: Name of the school.
            program_name: Name of the program.

        Returns:
            Search response with applicable scholarships.
        """
        request = ScholarshipSearchRequest(
            profile=profile,
            search_mode=SearchMode.BY_PROGRAM,
            school_name=school_name,
            program_name=program_name,
        )
        return await self.search_scholarships(request)

    async def search_programs_by_scholarship(
        self,
        profile: StudentProfile,
    ) -> ScholarshipSearchResponse:
        """Search programs that match available scholarships.

        Args:
            profile: Student profile.

        Returns:
            Search response with programs grouped by scholarships.
        """
        request = ScholarshipSearchRequest(
            profile=profile,
            search_mode=SearchMode.BY_SCHOLARSHIP,
        )
        return await self.search_scholarships(request)

    async def get_schools(
        self,
        country: str,
        field: str | None = None,
    ) -> list[dict[str, str]]:
        """Get list of schools for a country and field.

        Args:
            country: Target country.
            field: Optional field filter.

        Returns:
            List of school information.
        """
        query = f"top universities {country}"
        if field:
            query += f" {field} programs"

        results = await self.search_web(query, max_results=10)

        schools = []
        for result in results:
            schools.append(
                {
                    "name": result.get("title", ""),
                    "url": result.get("url", ""),
                    "description": result.get("content", "")[:200],
                }
            )

        return schools


# Singleton instance
_scholarship_search_service: ScholarshipSearchService | None = None


async def get_scholarship_search_service() -> ScholarshipSearchService:
    """Get or create the scholarship search service singleton."""
    global _scholarship_search_service  # noqa: PLW0603
    if _scholarship_search_service is None:
        _scholarship_search_service = ScholarshipSearchService()
    return _scholarship_search_service
