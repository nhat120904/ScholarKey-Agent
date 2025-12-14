"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlanStore } from "@/stores/planStore";
import { useChatStore } from "@/stores/chatStore";
import { apiClient } from "@/lib/api";
import type {
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanExportRequest,
} from "@/types/plan";

// Query keys
export const planKeys = {
  all: ["plans"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  details: () => [...planKeys.all, "detail"] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  bySession: (sessionId: string) =>
    [...planKeys.all, "session", sessionId] as const,
};

export function usePlan(planId?: string) {
  const { setPlan, setLoading, setError } = usePlanStore();
  const sessionId = useChatStore((state) => state.sessionId);

  return useQuery({
    queryKey: planId
      ? planKeys.detail(planId)
      : planKeys.bySession(sessionId || ""),
    queryFn: async () => {
      setLoading(true);
      try {
        if (planId) {
          const plan = await apiClient.getPlan(planId);
          setPlan(plan);
          return plan;
        } else if (sessionId) {
          const plan = await apiClient.getPlanBySession(sessionId);
          if (plan) {
            setPlan(plan);
          }
          return plan;
        }
        return null;
      } catch (error) {
        setError((error as Error).message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    enabled: !!(planId || sessionId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { setPlan, setLoading, setError } = usePlanStore();
  const sessionId = useChatStore((state) => state.sessionId);

  return useMutation({
    mutationFn: async (request: Omit<CreatePlanRequest, "session_id">) => {
      if (!sessionId) {
        throw new Error("No active session");
      }

      setLoading(true);
      return apiClient.createPlan({
        ...request,
        session_id: sessionId,
      });
    },
    onSuccess: (plan) => {
      setPlan(plan);
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
    onError: (error: Error) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { updatePlan, setLoading, setError, savePendingChanges } =
    usePlanStore();

  return useMutation({
    mutationFn: async (planId: string) => {
      const changes = savePendingChanges();

      const request: UpdatePlanRequest = {
        plan_id: planId,
        milestone_updates: Array.from(changes.milestones.entries()).map(
          ([id, updates]) => ({
            id,
            ...updates,
          }),
        ),
        scholarship_updates: Array.from(changes.scholarships.entries()).map(
          ([scholarshipId, updates]) => ({
            scholarship_id: scholarshipId,
            ...updates,
          }),
        ),
      };

      setLoading(true);
      return apiClient.updatePlan(request);
    },
    onSuccess: (plan) => {
      updatePlan(plan);
      queryClient.invalidateQueries({
        queryKey: planKeys.detail(plan.plan_id),
      });
    },
    onError: (error: Error) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export function useExportPlan() {
  return useMutation({
    mutationFn: async (request: PlanExportRequest) => {
      const response = await apiClient.exportPlan(request);

      // Open download URL in new tab or trigger download
      if (response.download_url) {
        window.open(response.download_url, "_blank");
      }

      return response;
    },
  });
}

// Hook for managing milestones
export function useMilestones() {
  const {
    plan,
    updateMilestoneStatus,
    toggleMilestoneComplete,
    addMilestone,
    removeMilestone,
    getCompletedMilestones,
    getPendingMilestones,
  } = usePlanStore();

  return {
    milestones: plan?.milestones || [],
    completedMilestones: getCompletedMilestones(),
    pendingMilestones: getPendingMilestones(),
    completionRate: plan
      ? Math.round((plan.completed_milestones / plan.total_milestones) * 100)
      : 0,
    updateStatus: updateMilestoneStatus,
    toggleComplete: toggleMilestoneComplete,
    add: addMilestone,
    remove: removeMilestone,
  };
}

// Hook for managing timeline
export function useTimeline() {
  const { plan, addTimelineEvent, removeTimelineEvent, getUpcomingDeadlines } =
    usePlanStore();

  return {
    events: plan?.timeline || [],
    upcomingDeadlines: getUpcomingDeadlines,
    addEvent: addTimelineEvent,
    removeEvent: removeTimelineEvent,
  };
}
