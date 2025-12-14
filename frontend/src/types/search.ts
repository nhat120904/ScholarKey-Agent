// Search-specific type definitions

import type { Scholarship, Program, StudentProfile, SearchMode } from "./index";

export interface SearchQuery {
  id: string;
  query: string;
  source?: string;
  isCustom?: boolean;
  isEnabled: boolean;
  estimatedResults?: number;
}

export interface SearchFilters {
  countries?: string[];
  studyLevels?: ("bachelor" | "master" | "phd")[];
  minMatchScore?: number;
  maxDeadlineDays?: number;
  minValue?: number;
  maxValue?: number;
  currency?: string;
  providers?: string[];
  fields?: string[];
  hasFullFunding?: boolean;
  hasPartialFunding?: boolean;
  deadlineAfter?: string;
  deadlineBefore?: string;
}

export type SortOption =
  | "match_score_desc"
  | "match_score_asc"
  | "deadline_asc"
  | "deadline_desc"
  | "value_desc"
  | "value_asc"
  | "name_asc"
  | "name_desc";

export interface GenerateQueriesRequest {
  profile: StudentProfile;
  preferences?: {
    focus_areas?: string[];
    exclude_countries?: string[];
    preferred_providers?: string[];
  };
}

export interface GenerateQueriesResponse {
  queries: SearchQuery[];
  reasoning: string;
  estimated_total_results: number;
}

export interface SearchExecutionProgress {
  total_queries: number;
  completed_queries: number;
  current_query?: string;
  status: "idle" | "searching" | "processing" | "complete" | "error";
  error?: string;
}

export interface EnhancedSearchResults {
  scholarships: Scholarship[];
  programs: Program[];
  total_scholarships: number;
  total_programs: number;
  search_mode: SearchMode;
  hedera_verification_url?: string;
  search_session_id: string;

  // Additional metadata
  execution_time_ms?: number;
  queries_executed: number;
  filters_applied: SearchFilters;
  sort_by: SortOption;
}

export interface ScholarshipMatchAnalysis {
  scholarship_id: string;
  overall_score: number;
  score_breakdown: {
    eligibility: number;
    field_match: number;
    academic_fit: number;
    deadline_proximity: number;
  };
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}
