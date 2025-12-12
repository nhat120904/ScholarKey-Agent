// Student Profile Types
export interface TestScores {
  ielts?: number;
  toefl?: number;
  gre?: number;
  gmat?: number;
}

export type StudyLevel = "bachelor" | "master" | "phd";
export type SearchMode = "by_program" | "by_scholarship";

export interface StudentProfile {
  user_id: string;
  name?: string;
  full_name?: string;
  email?: string;
  gpa: number;
  test_scores: TestScores;
  major: string;
  desired_field: string;
  publications: number;
  work_experience_years: number;
  skills: string[];
  target_country: string;
  level: StudyLevel;
  education_level?: string;
  field_of_study?: string;
  nationality?: string;
  age?: number;
  cv_hash?: string;
  hedera_tx_id?: string;
  hedera_topic_sequence?: number;
}

// Scholarship Types
export interface SelectionStage {
  stage: number;
  name: string;
  duration_days?: number;
  description?: string;
}

export interface ScholarshipDeadlines {
  round_1?: string;
  round_2?: string;
  round_3?: string;
  notification_date?: string;
  opening_date?: string;
}

export interface ScholarshipValue {
  type: string;
  amount?: number;
  currency: string;
  description?: string;
}

export interface EligibilityCriteria {
  min_gpa?: number;
  max_gpa?: number;
  min_ielts?: number;
  min_toefl?: number;
  nationalities: string[];
  excluded_nationalities: string[];
  max_age?: number;
  min_age?: number;
  required_background: string[];
  study_levels: StudyLevel[];
  other_requirements: string[];
}

export interface EligibleProgram {
  program_id: string;
  program_name: string;
  school: string;
  level?: StudyLevel;
}

export interface Scholarship {
  scholarship_id: string;
  name: string;
  provider: string;
  country: string;
  value: ScholarshipValue;
  deadlines: ScholarshipDeadlines;
  selection_procedure: SelectionStage[];
  required_documents: string[];
  eligible_programs: EligibleProgram[];
  eligibility_criteria: EligibilityCriteria;
  url?: string;
  description?: string;
  last_crawled?: string;
  match_score?: number;
  match_analysis?: string;
}

// Program Types
export interface ProgramRequirements {
  min_gpa?: number;
  prerequisites: string[];
  language_scores: Record<string, number>;
  other_requirements: string[];
}

export interface Program {
  program_id: string;
  name: string;
  school_name: string;
  country: string;
  level: StudyLevel;
  field: string;
  focus_areas: string[];
  duration_years?: number;
  requirements: ProgramRequirements;
  available_scholarships: string[];
  url?: string;
  description?: string;
  field_alignment_score?: number;
  profile_match_score?: number;
}

// Search Types
export interface SearchResults {
  scholarships: Scholarship[];
  programs: Program[];
  total_scholarships: number;
  total_programs: number;
  search_mode: SearchMode;
  hedera_verification_url?: string;
  search_session_id: string;
}

export interface SearchRequest {
  profile: StudentProfile;
  search_mode: SearchMode;
  school_name?: string;
  program_name?: string;
  min_match_score?: number;
  deadline_after?: string;
  include_partial_matches?: boolean;
}

// API Response Types
export interface CVUploadResponse {
  profile: StudentProfile;
  hedera_tx_id?: string;
  hedera_verification_url?: string;
  raw_text?: string;
}

export interface ExportRequest {
  scholarships: Scholarship[];
  programs: Program[];
  profile?: StudentProfile;
  include_scholarships: boolean;
  include_programs: boolean;
  include_combined: boolean;
}

// Chat Types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  profile_updates?: Record<string, any>;
  suggested_actions: string[];
}

// Hedera Types
export interface HederaResponse {
  transaction_id: string;
  topic_sequence_number: number;
  verification_url: string;
  topic_id: string;
  data_hash: string;
}
