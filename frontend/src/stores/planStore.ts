import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ApplicationPlan,
  Milestone,
  MilestoneStatus,
  PrioritizedScholarship,
  ScholarshipStatus,
  TimelineEvent,
} from "@/types/plan";

type PlanViewTab = "timeline" | "scholarships" | "milestones" | "checklist";

interface PlanState {
  // State
  plan: ApplicationPlan | null;
  selectedTab: PlanViewTab;
  isLoading: boolean;
  error: string | null;

  // Local edits (before saving)
  pendingMilestoneUpdates: Map<string, Partial<Milestone>>;
  pendingScholarshipUpdates: Map<string, Partial<PrioritizedScholarship>>;

  // Actions - Plan
  setPlan: (plan: ApplicationPlan | null) => void;
  updatePlan: (updates: Partial<ApplicationPlan>) => void;
  clearPlan: () => void;

  // Actions - UI
  setSelectedTab: (tab: PlanViewTab) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Milestones
  updateMilestoneStatus: (id: string, status: MilestoneStatus) => void;
  toggleMilestoneComplete: (id: string) => void;
  addMilestone: (milestone: Omit<Milestone, "id">) => void;
  removeMilestone: (id: string) => void;

  // Actions - Scholarships
  updateScholarshipStatus: (
    scholarshipId: string,
    status: ScholarshipStatus,
  ) => void;
  updateScholarshipNotes: (scholarshipId: string, notes: string) => void;
  reorderScholarships: (fromIndex: number, toIndex: number) => void;

  // Actions - Timeline
  addTimelineEvent: (event: Omit<TimelineEvent, "id">) => void;
  removeTimelineEvent: (id: string) => void;

  // Actions - Pending changes
  savePendingChanges: () => {
    milestones: Map<string, Partial<Milestone>>;
    scholarships: Map<string, Partial<PrioritizedScholarship>>;
  };
  discardPendingChanges: () => void;
  hasPendingChanges: () => boolean;

  // Computed helpers
  getUpcomingDeadlines: (days?: number) => TimelineEvent[];
  getCompletedMilestones: () => Milestone[];
  getPendingMilestones: () => Milestone[];
  getScholarshipsByStatus: (
    status: ScholarshipStatus,
  ) => PrioritizedScholarship[];
}

const generateMilestoneId = () =>
  `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateEventId = () =>
  `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      // Initial state
      plan: null,
      selectedTab: "timeline",
      isLoading: false,
      error: null,
      pendingMilestoneUpdates: new Map(),
      pendingScholarshipUpdates: new Map(),

      // Plan Actions
      setPlan: (plan) =>
        set({
          plan,
          error: null,
          pendingMilestoneUpdates: new Map(),
          pendingScholarshipUpdates: new Map(),
        }),

      updatePlan: (updates) => {
        set((state) => ({
          plan: state.plan
            ? {
                ...state.plan,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : null,
        }));
      },

      clearPlan: () =>
        set({
          plan: null,
          pendingMilestoneUpdates: new Map(),
          pendingScholarshipUpdates: new Map(),
        }),

      // UI Actions
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Milestone Actions
      updateMilestoneStatus: (id, status) => {
        set((state) => {
          const newUpdates = new Map(state.pendingMilestoneUpdates);
          const existing = newUpdates.get(id) || {};
          newUpdates.set(id, {
            ...existing,
            status,
            completedAt:
              status === "completed" ? new Date().toISOString() : undefined,
          });

          // Also update in plan for immediate UI feedback
          if (state.plan) {
            const updatedMilestones = state.plan.milestones.map((m) =>
              m.id === id
                ? {
                    ...m,
                    status,
                    completedAt:
                      status === "completed"
                        ? new Date().toISOString()
                        : undefined,
                  }
                : m,
            );
            return {
              pendingMilestoneUpdates: newUpdates,
              plan: {
                ...state.plan,
                milestones: updatedMilestones,
                completed_milestones: updatedMilestones.filter(
                  (m) => m.status === "completed",
                ).length,
              },
            };
          }
          return { pendingMilestoneUpdates: newUpdates };
        });
      },

      toggleMilestoneComplete: (id) => {
        const { plan } = get();
        if (!plan) return;

        const milestone = plan.milestones.find((m) => m.id === id);
        if (!milestone) return;

        const newStatus: MilestoneStatus =
          milestone.status === "completed" ? "not-started" : "completed";
        get().updateMilestoneStatus(id, newStatus);
      },

      addMilestone: (milestone) => {
        set((state) => {
          if (!state.plan) return state;

          const newMilestone: Milestone = {
            ...milestone,
            id: generateMilestoneId(),
            status: "not-started",
          };

          return {
            plan: {
              ...state.plan,
              milestones: [...state.plan.milestones, newMilestone],
              total_milestones: state.plan.total_milestones + 1,
            },
          };
        });
      },

      removeMilestone: (id) => {
        set((state) => {
          if (!state.plan) return state;

          const milestones = state.plan.milestones.filter((m) => m.id !== id);
          return {
            plan: {
              ...state.plan,
              milestones,
              total_milestones: milestones.length,
              completed_milestones: milestones.filter(
                (m) => m.status === "completed",
              ).length,
            },
          };
        });
      },

      // Scholarship Actions
      updateScholarshipStatus: (scholarshipId, status) => {
        set((state) => {
          const newUpdates = new Map(state.pendingScholarshipUpdates);
          const existing = newUpdates.get(scholarshipId) || {};
          newUpdates.set(scholarshipId, { ...existing, status });

          if (state.plan) {
            const updatedScholarships = state.plan.prioritized_scholarships.map(
              (s) =>
                s.scholarship.scholarship_id === scholarshipId
                  ? { ...s, status }
                  : s,
            );
            return {
              pendingScholarshipUpdates: newUpdates,
              plan: {
                ...state.plan,
                prioritized_scholarships: updatedScholarships,
              },
            };
          }
          return { pendingScholarshipUpdates: newUpdates };
        });
      },

      updateScholarshipNotes: (scholarshipId, notes) => {
        set((state) => {
          const newUpdates = new Map(state.pendingScholarshipUpdates);
          const existing = newUpdates.get(scholarshipId) || {};
          newUpdates.set(scholarshipId, { ...existing, notes });

          if (state.plan) {
            const updatedScholarships = state.plan.prioritized_scholarships.map(
              (s) =>
                s.scholarship.scholarship_id === scholarshipId
                  ? { ...s, notes }
                  : s,
            );
            return {
              pendingScholarshipUpdates: newUpdates,
              plan: {
                ...state.plan,
                prioritized_scholarships: updatedScholarships,
              },
            };
          }
          return { pendingScholarshipUpdates: newUpdates };
        });
      },

      reorderScholarships: (fromIndex, toIndex) => {
        set((state) => {
          if (!state.plan) return state;

          const scholarships = [...state.plan.prioritized_scholarships];
          const [removed] = scholarships.splice(fromIndex, 1);
          scholarships.splice(toIndex, 0, removed);

          // Update ranks
          const reranked = scholarships.map((s, i) => ({ ...s, rank: i + 1 }));

          return {
            plan: { ...state.plan, prioritized_scholarships: reranked },
          };
        });
      },

      // Timeline Actions
      addTimelineEvent: (event) => {
        set((state) => {
          if (!state.plan) return state;

          const newEvent: TimelineEvent = {
            ...event,
            id: generateEventId(),
          };

          const timeline = [...state.plan.timeline, newEvent].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

          return {
            plan: { ...state.plan, timeline },
          };
        });
      },

      removeTimelineEvent: (id) => {
        set((state) => {
          if (!state.plan) return state;

          return {
            plan: {
              ...state.plan,
              timeline: state.plan.timeline.filter((e) => e.id !== id),
            },
          };
        });
      },

      // Pending Changes Actions
      savePendingChanges: () => {
        const { pendingMilestoneUpdates, pendingScholarshipUpdates } = get();
        set({
          pendingMilestoneUpdates: new Map(),
          pendingScholarshipUpdates: new Map(),
        });
        return {
          milestones: pendingMilestoneUpdates,
          scholarships: pendingScholarshipUpdates,
        };
      },

      discardPendingChanges: () => {
        set({
          pendingMilestoneUpdates: new Map(),
          pendingScholarshipUpdates: new Map(),
        });
      },

      hasPendingChanges: () => {
        const { pendingMilestoneUpdates, pendingScholarshipUpdates } = get();
        return (
          pendingMilestoneUpdates.size > 0 || pendingScholarshipUpdates.size > 0
        );
      },

      // Computed Helpers
      getUpcomingDeadlines: (days = 30) => {
        const { plan } = get();
        if (!plan) return [];

        const now = new Date();
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return plan.timeline
          .filter((e) => {
            const eventDate = new Date(e.date);
            return eventDate >= now && eventDate <= cutoff;
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
      },

      getCompletedMilestones: () => {
        const { plan } = get();
        return plan?.milestones.filter((m) => m.status === "completed") || [];
      },

      getPendingMilestones: () => {
        const { plan } = get();
        return plan?.milestones.filter((m) => m.status !== "completed") || [];
      },

      getScholarshipsByStatus: (status) => {
        const { plan } = get();
        return (
          plan?.prioritized_scholarships.filter((s) => s.status === status) ||
          []
        );
      },
    }),
    {
      name: "plan-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        plan: state.plan,
        selectedTab: state.selectedTab,
      }),
      // Handle Map serialization
      serialize: (state) =>
        JSON.stringify({
          ...state,
          state: {
            ...state.state,
            pendingMilestoneUpdates: Array.from(
              state.state.pendingMilestoneUpdates?.entries() || [],
            ),
            pendingScholarshipUpdates: Array.from(
              state.state.pendingScholarshipUpdates?.entries() || [],
            ),
          },
        }),
      deserialize: (str) => {
        const data = JSON.parse(str);
        return {
          ...data,
          state: {
            ...data.state,
            pendingMilestoneUpdates: new Map(
              data.state?.pendingMilestoneUpdates || [],
            ),
            pendingScholarshipUpdates: new Map(
              data.state?.pendingScholarshipUpdates || [],
            ),
          },
        };
      },
    },
  ),
);

// Selector hooks for performance
export const usePlan = () => usePlanStore((state) => state.plan);
export const usePlanTab = () => usePlanStore((state) => state.selectedTab);
export const usePlanLoading = () => usePlanStore((state) => state.isLoading);
export const usePlanError = () => usePlanStore((state) => state.error);
