// Application plan type definitions

import type { Scholarship, ScholarshipDeadlines } from "./index";

export type MilestoneStatus = "not-started" | "in-progress" | "completed";
export type ScholarshipStatus =
  | "not-started"
  | "pending"
  | "submitted"
  | "accepted"
  | "rejected";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "deadline" | "milestone" | "notification" | "start";
  scholarshipId?: string;
  scholarshipName?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt?: string;
  scholarshipIds?: string[];
  tags?: string[];
}

export interface PrioritizedScholarship {
  rank: number;
  scholarship: Scholarship;
  matchScore: number;
  status: ScholarshipStatus;
  notes?: string;
  applicationUrl?: string;
}

export interface ApplicationPlan {
  plan_id: string;
  created_at: string;
  updated_at: string;
  session_id: string;

  // Core data
  timeline: TimelineEvent[];
  milestones: Milestone[];
  prioritized_scholarships: PrioritizedScholarship[];

  // Statistics
  total_scholarships: number;
  total_milestones: number;
  completed_milestones: number;

  // Export info
  export_formats?: ("excel" | "pdf")[];
}

export interface PlanExportRequest {
  plan_id: string;
  format: "excel" | "pdf";
  include_timeline?: boolean;
  include_milestones?: boolean;
  include_scholarships?: boolean;
}

export interface PlanExportResponse {
  download_url: string;
  filename: string;
  format: "excel" | "pdf";
  expires_at: string;
}

export interface CreatePlanRequest {
  session_id: string;
  scholarship_ids?: string[];
  custom_milestones?: Omit<Milestone, "id" | "status" | "completedAt">[];
}

export interface UpdatePlanRequest {
  plan_id: string;
  milestone_updates?: {
    id: string;
    status?: MilestoneStatus;
    completedAt?: string;
  }[];
  scholarship_updates?: {
    scholarship_id: string;
    status?: ScholarshipStatus;
    notes?: string;
  }[];
}
