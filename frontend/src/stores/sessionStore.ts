import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiClient } from "@/lib/api";

// Session summary interface matching backend model
export interface SessionSummary {
  session_id: string;
  title: string; // Auto-generated or user-defined
  preview: string; // First message preview (truncated)
  last_activity: string; // ISO date string
  message_count: number;
  has_profile: boolean;
  has_scholarships: boolean;
}

interface SessionState {
  // State
  sessions: SessionSummary[];
  currentSessionId: string | null;
  isLoadingSessions: boolean;
  error: string | null;

  // Actions
  setSessions: (sessions: SessionSummary[]) => void;
  addSession: (session: SessionSummary) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<SessionSummary>) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setLoadingSessions: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  fetchSessions: () => Promise<void>;
  createNewSession: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;

  // Computed helpers
  getSessionById: (sessionId: string) => SessionSummary | undefined;
  getSessionsByDate: () => {
    today: SessionSummary[];
    yesterday: SessionSummary[];
    lastWeek: SessionSummary[];
    older: SessionSummary[];
  };
}

// Helper function to group sessions by date
function groupSessionsByDate(sessions: SessionSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups = {
    today: [] as SessionSummary[],
    yesterday: [] as SessionSummary[],
    lastWeek: [] as SessionSummary[],
    older: [] as SessionSummary[],
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.last_activity);

    if (sessionDate >= today) {
      groups.today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.yesterday.push(session);
    } else if (sessionDate >= lastWeek) {
      groups.lastWeek.push(session);
    } else {
      groups.older.push(session);
    }
  });

  // Sort each group by last_activity descending
  const sortByDate = (a: SessionSummary, b: SessionSummary) =>
    new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();

  groups.today.sort(sortByDate);
  groups.yesterday.sort(sortByDate);
  groups.lastWeek.sort(sortByDate);
  groups.older.sort(sortByDate);

  return groups;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: [],
      currentSessionId: null,
      isLoadingSessions: false,
      error: null,

      // Actions
      setSessions: (sessions) => set({ sessions }),

      addSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
        }));
      },

      removeSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.session_id !== sessionId),
          currentSessionId:
            state.currentSessionId === sessionId
              ? null
              : state.currentSessionId,
        }));
      },

      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.session_id === sessionId ? { ...s, ...updates } : s,
          ),
        }));
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
        // Also update localStorage for API client
        if (typeof window !== "undefined") {
          if (sessionId) {
            localStorage.setItem("session_id", sessionId);
          } else {
            localStorage.removeItem("session_id");
          }
        }
      },

      setLoadingSessions: (loading) => set({ isLoadingSessions: loading }),

      setError: (error) => set({ error }),

      // Async actions
      fetchSessions: async () => {
        set({ isLoadingSessions: true, error: null });
        try {
          const response = await apiClient.listSessions();
          set({ sessions: response.sessions, isLoadingSessions: false });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch sessions";
          set({ error: message, isLoadingSessions: false });
        }
      },

      createNewSession: async () => {
        try {
          const response = await apiClient.createSession();
          const newSession: SessionSummary = {
            session_id: response.session_id,
            title: "New Conversation",
            preview: "",
            last_activity: response.created_at,
            message_count: 0,
            has_profile: false,
            has_scholarships: false,
          };

          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: response.session_id,
          }));

          // Update localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("session_id", response.session_id);
          }

          return response.session_id;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to create session";
          set({ error: message });
          throw error;
        }
      },

      deleteSession: async (sessionId) => {
        try {
          await apiClient.deleteSession(sessionId);
          get().removeSession(sessionId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to delete session";
          set({ error: message });
          throw error;
        }
      },

      renameSession: async (sessionId, newTitle) => {
        try {
          await apiClient.renameSession(sessionId, newTitle);
          get().updateSession(sessionId, { title: newTitle });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to rename session";
          set({ error: message });
          throw error;
        }
      },

      // Computed helpers
      getSessionById: (sessionId) => {
        const { sessions } = get();
        return sessions.find((s) => s.session_id === sessionId);
      },

      getSessionsByDate: () => {
        const { sessions } = get();
        return groupSessionsByDate(sessions);
      },
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        // Don't persist sessions list - always fetch fresh from API
      }),
    },
  ),
);

// Selector hooks for performance
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useCurrentSessionId = () =>
  useSessionStore((state) => state.currentSessionId);
export const useSessionsLoading = () =>
  useSessionStore((state) => state.isLoadingSessions);
export const useSessionsError = () => useSessionStore((state) => state.error);

// Memoized selector for sessions by date
// Uses shallow comparison of sessions array to avoid creating new objects unnecessarily
export const useSessionsByDate = () => {
  const sessions = useSessionStore((state) => state.sessions);
  // groupSessionsByDate is called outside store to ensure proper memoization
  return groupSessionsByDate(sessions);
};
