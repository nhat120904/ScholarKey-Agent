"""Excel export service for scholarships and programs."""

import io
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd

from scholar_agent.models import (
    ExportRequest,
    Program,
    Scholarship,
    StudentProfile,
)

logger = logging.getLogger(__name__)


class ExcelExportService:
    """Service for exporting data to Excel files."""

    def __init__(self, export_dir: str = "./exports") -> None:
        """Initialize the Excel export service.

        Args:
            export_dir: Directory to save exported files.
        """
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def _scholarship_to_row(
        self,
        scholarship: Scholarship,
        profile: StudentProfile | None = None,
    ) -> dict:
        """Convert a scholarship to a row dictionary.

        Args:
            scholarship: Scholarship object.
            profile: Optional student profile.

        Returns:
            Dictionary for DataFrame row.
        """
        # Format deadlines
        deadlines_str = ""
        if scholarship.deadlines.round_1:
            deadlines_str = scholarship.deadlines.round_1.strftime("%Y-%m-%d")
        elif scholarship.deadlines.round_2:
            deadlines_str = scholarship.deadlines.round_2.strftime("%Y-%m-%d")

        # Format value
        value_str = scholarship.value.type.value.replace("_", " ").title()
        if scholarship.value.amount:
            value_str += f" (${scholarship.value.amount:,.0f})"
        if scholarship.value.description:
            value_str += f" - {scholarship.value.description}"

        # Format documents
        documents_str = ", ".join(scholarship.required_documents[:5])
        if len(scholarship.required_documents) > 5:
            documents_str += f" (+{len(scholarship.required_documents) - 5} more)"

        # Format selection procedure
        procedure_str = " → ".join(
            stage.name for stage in scholarship.selection_procedure
        )

        # Format eligible programs
        programs_str = ", ".join(
            p.program_name for p in scholarship.eligible_programs[:3]
        )
        if len(scholarship.eligible_programs) > 3:
            programs_str += f" (+{len(scholarship.eligible_programs) - 3} more)"

        return {
            "Scholarship Name": scholarship.name,
            "Provider": scholarship.provider,
            "Country": scholarship.country,
            "Value": value_str,
            "Deadline": deadlines_str,
            "Match Score (%)": f"{scholarship.match_score:.1f}" if scholarship.match_score else "N/A",
            "Match Analysis": scholarship.match_analysis or "",
            "Required Documents": documents_str,
            "Selection Procedure": procedure_str,
            "Eligible Programs": programs_str,
            "Apply Link": str(scholarship.url) if scholarship.url else "",
            "Description": scholarship.description[:200] if scholarship.description else "",
        }

    def _program_to_row(
        self,
        program: Program,
        profile: StudentProfile | None = None,
    ) -> dict:
        """Convert a program to a row dictionary.

        Args:
            program: Program object.
            profile: Optional student profile.

        Returns:
            Dictionary for DataFrame row.
        """
        # Format focus areas
        focus_str = ", ".join(program.focus_areas)

        # Format requirements
        requirements_parts = []
        if program.requirements.min_gpa:
            requirements_parts.append(f"GPA ≥ {program.requirements.min_gpa}")
        if program.requirements.language_scores:
            for test, score in program.requirements.language_scores.items():
                requirements_parts.append(f"{test} ≥ {score}")
        requirements_str = ", ".join(requirements_parts)

        return {
            "Program Name": program.name,
            "School": program.school_name,
            "Country": program.country,
            "Level": program.level.value.title(),
            "Field": program.field,
            "Focus Areas": focus_str,
            "Duration (Years)": program.duration_years or "N/A",
            "Field Alignment (%)": f"{program.field_alignment_score:.1f}" if program.field_alignment_score else "N/A",
            "Profile Match (%)": f"{program.profile_match_score:.1f}" if program.profile_match_score else "N/A",
            "Requirements": requirements_str,
            "Available Scholarships": len(program.available_scholarships),
            "Program Link": str(program.url) if program.url else "",
            "Description": program.description[:200] if program.description else "",
        }

    def _profile_to_dict(self, profile: StudentProfile) -> dict:
        """Convert a student profile to a summary dictionary.

        Args:
            profile: Student profile.

        Returns:
            Dictionary for profile summary.
        """
        return {
            "Name": profile.name or "N/A",
            "GPA": profile.gpa,
            "Major": profile.major,
            "Desired Field": profile.desired_field,
            "Target Country": profile.target_country,
            "Study Level": profile.level.value.title(),
            "IELTS Score": profile.test_scores.ielts or "N/A",
            "TOEFL Score": profile.test_scores.toefl or "N/A",
            "GRE Score": profile.test_scores.gre or "N/A",
            "Publications": profile.publications,
            "Work Experience (Years)": profile.work_experience_years,
            "Skills": ", ".join(profile.skills[:10]),
            "CV Hash": profile.cv_hash[:16] + "..." if profile.cv_hash else "N/A",
            "Hedera Verification": profile.hedera_tx_id or "Not verified",
        }

    def export_to_excel(
        self,
        request: ExportRequest,
    ) -> tuple[bytes, str]:
        """Export scholarships and programs to Excel.

        Args:
            request: Export request with data.

        Returns:
            Tuple of (file_bytes, filename).
        """
        output = io.BytesIO()
        filename = f"scholarship_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            # Profile summary sheet
            if request.profile:
                profile_data = self._profile_to_dict(request.profile)
                profile_df = pd.DataFrame([profile_data])
                profile_df.to_excel(writer, sheet_name="My Profile", index=False)

            # Scholarships sheet
            if request.include_scholarships and request.scholarships:
                scholarship_rows = [
                    self._scholarship_to_row(s, request.profile)
                    for s in request.scholarships
                ]
                scholarships_df = pd.DataFrame(scholarship_rows)
                scholarships_df.to_excel(writer, sheet_name="Scholarships", index=False)

                # Auto-adjust column widths
                worksheet = writer.sheets["Scholarships"]
                for idx, col in enumerate(scholarships_df.columns):
                    max_length = max(
                        scholarships_df[col].astype(str).map(len).max(),
                        len(col),
                    )
                    worksheet.column_dimensions[
                        chr(65 + idx)
                    ].width = min(max_length + 2, 50)

            # Programs sheet
            if request.include_programs and request.programs:
                program_rows = [
                    self._program_to_row(p, request.profile) for p in request.programs
                ]
                programs_df = pd.DataFrame(program_rows)
                programs_df.to_excel(writer, sheet_name="Programs", index=False)

                # Auto-adjust column widths
                worksheet = writer.sheets["Programs"]
                for idx, col in enumerate(programs_df.columns):
                    max_length = max(
                        programs_df[col].astype(str).map(len).max(),
                        len(col),
                    )
                    worksheet.column_dimensions[
                        chr(65 + idx)
                    ].width = min(max_length + 2, 50)

            # Combined report sheet
            if request.include_combined and request.scholarships:
                combined_rows = []
                for scholarship in request.scholarships:
                    base_row = {
                        "Type": "Scholarship",
                        "Name": scholarship.name,
                        "Provider/School": scholarship.provider,
                        "Match Score (%)": scholarship.match_score or 0,
                        "Deadline": scholarship.deadlines.round_1.strftime("%Y-%m-%d")
                        if scholarship.deadlines.round_1
                        else "N/A",
                        "Link": str(scholarship.url) if scholarship.url else "",
                    }
                    combined_rows.append(base_row)

                    # Add eligible programs under scholarship
                    for program in scholarship.eligible_programs:
                        program_row = {
                            "Type": "  └─ Program",
                            "Name": program.program_name,
                            "Provider/School": program.school,
                            "Match Score (%)": "",
                            "Deadline": "",
                            "Link": "",
                        }
                        combined_rows.append(program_row)

                combined_df = pd.DataFrame(combined_rows)
                combined_df.to_excel(writer, sheet_name="Combined Report", index=False)

            # Metadata sheet
            metadata = {
                "Generated On": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Total Scholarships": len(request.scholarships),
                "Total Programs": len(request.programs),
                "Export Tool": "ScholarKey AI",
                "Version": "0.1.0",
            }
            metadata_df = pd.DataFrame([metadata])
            metadata_df.to_excel(writer, sheet_name="Export Info", index=False)

        output.seek(0)
        return output.getvalue(), filename

    def save_export(
        self,
        request: ExportRequest,
    ) -> str:
        """Export and save to file.

        Args:
            request: Export request with data.

        Returns:
            Path to saved file.
        """
        file_bytes, filename = self.export_to_excel(request)
        filepath = self.export_dir / filename

        with open(filepath, "wb") as f:
            f.write(file_bytes)

        logger.info(f"Exported to {filepath}")
        return str(filepath)


# Singleton instance
_excel_export_service: ExcelExportService | None = None


def get_excel_export_service() -> ExcelExportService:
    """Get or create the Excel export service singleton."""
    global _excel_export_service
    if _excel_export_service is None:
        _excel_export_service = ExcelExportService()
    return _excel_export_service
