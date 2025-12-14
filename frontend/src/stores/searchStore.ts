import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Scholarship, Program } from "@/types";
import type {
  SearchQuery,
  SearchFilters,
  SortOption,
  SearchExecutionProgress,
} from "@/types/search";
import { generateId } from "@/lib/utils";

interface SearchState {
  // Query state
  queries: SearchQuery[];
  isQueriesConfirmed: boolean;

  // Results state
  scholarships: Scholarship[];
  programs: Program[];
  totalScholarships: number;
  totalPrograms: number;

  // Filter & sort state
  filters: SearchFilters;
  sortBy: SortOption;
  viewMode: "grid" | "list";

  // Progress state
  progress: SearchExecutionProgress;
  searchSessionId: string | null;

  // Selected items
  selectedScholarshipIds: Set<string>;

  // Actions - Queries
  setQueries: (queries: SearchQuery[]) => void;
  addQuery: (query: Omit<SearchQuery, "id">) => void;
  updateQuery: (id: string, updates: Partial<SearchQuery>) => void;
  removeQuery: (id: string) => void;
  toggleQueryEnabled: (id: string) => void;
  confirmQueries: () => void;
  resetQueries: () => void;

  // Actions - Results
  setResults: (scholarships: Scholarship[], programs: Program[]) => void;
  clearResults: () => void;

  // Actions - Filters & Sort
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SortOption) => void;
  setViewMode: (mode: "grid" | "list") => void;

  // Actions - Progress
  setProgress: (progress: Partial<SearchExecutionProgress>) => void;
  resetProgress: () => void;
  setSearchSessionId: (id: string | null) => void;

  // Actions - Selection
  toggleScholarshipSelection: (id: string) => void;
  selectAllScholarships: () => void;
  clearScholarshipSelection: () => void;

  // Computed helpers
  getEnabledQueries: () => SearchQuery[];
  getFilteredScholarships: () => Scholarship[];
  getSortedScholarships: () => Scholarship[];
  getSelectedScholarships: () => Scholarship[];
  hasActiveFilters: () => boolean;
}

const DEFAULT_FILTERS: SearchFilters = {};
const DEFAULT_SORT: SortOption = "match_score_desc";

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      queries: [],
      isQueriesConfirmed: false,
      scholarships: [],
      programs: [],
      totalScholarships: 0,
      totalPrograms: 0,
      filters: DEFAULT_FILTERS,
      sortBy: DEFAULT_SORT,
      viewMode: "grid",
      progress: {
        total_queries: 0,
        completed_queries: 0,
        status: "idle",
      },
      searchSessionId: null,
      selectedScholarshipIds: new Set(),

      // Query Actions
      setQueries: (queries) => set({ queries, isQueriesConfirmed: false }),

      addQuery: (query) => {
        const newQuery: SearchQuery = {
          ...query,
          id: generateId(),
        };
        set((state) => ({
          queries: [...state.queries, newQuery],
          isQueriesConfirmed: false,
        }));
      },

      updateQuery: (id, updates) => {
        set((state) => ({
          queries: state.queries.map((q) =>
            q.id === id ? { ...q, ...updates } : q,
          ),
          isQueriesConfirmed: false,
        }));
      },

      removeQuery: (id) => {
        set((state) => ({
          queries: state.queries.filter((q) => q.id !== id),
          isQueriesConfirmed: false,
        }));
      },

      toggleQueryEnabled: (id) => {
        set((state) => ({
          queries: state.queries.map((q) =>
            q.id === id ? { ...q, isEnabled: !q.isEnabled } : q,
          ),
        }));
      },

      confirmQueries: () => set({ isQueriesConfirmed: true }),

      resetQueries: () =>
        set({
          queries: [],
          isQueriesConfirmed: false,
        }),

      // Results Actions
      setResults: (scholarships, programs) =>
        set({
          scholarships,
          programs,
          totalScholarships: scholarships.length,
          totalPrograms: programs.length,
          progress: {
            total_queries: get().progress.total_queries,
            completed_queries: get().progress.total_queries,
            status: "complete",
          },
        }),

      clearResults: () =>
        set({
          scholarships: [],
          programs: [],
          totalScholarships: 0,
          totalPrograms: 0,
          selectedScholarshipIds: new Set(),
        }),

      // Filter & Sort Actions
      setFilters: (filters) => set({ filters }),

      updateFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },

      clearFilters: () => set({ filters: DEFAULT_FILTERS }),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (mode) => set({ viewMode: mode }),

      // Progress Actions
      setProgress: (progress) => {
        set((state) => ({
          progress: { ...state.progress, ...progress },
        }));
      },

      resetProgress: () =>
        set({
          progress: {
            total_queries: 0,
            completed_queries: 0,
            status: "idle",
          },
        }),

      setSearchSessionId: (id) => set({ searchSessionId: id }),

      // Selection Actions
      toggleScholarshipSelection: (id) => {
        set((state) => {
          const newSelection = new Set(state.selectedScholarshipIds);
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
          return { selectedScholarshipIds: newSelection };
        });
      },

      selectAllScholarships: () => {
        set((state) => ({
          selectedScholarshipIds: new Set(
            state.scholarships.map((s) => s.scholarship_id),
          ),
        }));
      },

      clearScholarshipSelection: () =>
        set({ selectedScholarshipIds: new Set() }),

      // Computed Helpers
      getEnabledQueries: () => {
        const { queries } = get();
        return queries.filter((q) => q.isEnabled);
      },

      getFilteredScholarships: () => {
        const { scholarships, filters } = get();

        return scholarships.filter((s) => {
          // Country filter
          if (
            filters.countries?.length &&
            !filters.countries.includes(s.country)
          ) {
            return false;
          }

          // Study level filter
          if (filters.studyLevels?.length) {
            const scholarshipLevels =
              s.eligibility_criteria?.study_levels || [];
            if (
              !scholarshipLevels.some((l) => filters.studyLevels?.includes(l))
            ) {
              return false;
            }
          }

          // Match score filter
          if (
            filters.minMatchScore &&
            (s.match_score || 0) < filters.minMatchScore
          ) {
            return false;
          }

          // Value filter
          if (filters.minValue && (s.value?.amount || 0) < filters.minValue) {
            return false;
          }

          return true;
        });
      },

      getSortedScholarships: () => {
        const filtered = get().getFilteredScholarships();
        const { sortBy } = get();

        return [...filtered].sort((a, b) => {
          switch (sortBy) {
            case "match_score_desc":
              return (b.match_score || 0) - (a.match_score || 0);
            case "match_score_asc":
              return (a.match_score || 0) - (b.match_score || 0);
            case "deadline_asc":
              const aDate = a.deadlines?.round_1 || a.deadlines?.round_2 || "";
              const bDate = b.deadlines?.round_1 || b.deadlines?.round_2 || "";
              return aDate.localeCompare(bDate);
            case "deadline_desc":
              const aDateDesc =
                a.deadlines?.round_1 || a.deadlines?.round_2 || "";
              const bDateDesc =
                b.deadlines?.round_1 || b.deadlines?.round_2 || "";
              return bDateDesc.localeCompare(aDateDesc);
            case "value_desc":
              return (b.value?.amount || 0) - (a.value?.amount || 0);
            case "value_asc":
              return (a.value?.amount || 0) - (b.value?.amount || 0);
            case "name_asc":
              return a.name.localeCompare(b.name);
            case "name_desc":
              return b.name.localeCompare(a.name);
            default:
              return 0;
          }
        });
      },

      getSelectedScholarships: () => {
        const { scholarships, selectedScholarshipIds } = get();
        return scholarships.filter((s) =>
          selectedScholarshipIds.has(s.scholarship_id),
        );
      },

      hasActiveFilters: () => {
        const { filters } = get();
        return Object.values(filters).some(
          (v) =>
            v !== undefined &&
            v !== null &&
            (Array.isArray(v) ? v.length > 0 : true),
        );
      },
    }),
    {
      name: "search-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queries: state.queries,
        filters: state.filters,
        sortBy: state.sortBy,
        viewMode: state.viewMode,
      }),
    },
  ),
);

// Selector hooks for performance
export const useSearchQueries = () => useSearchStore((state) => state.queries);
export const useSearchResults = () =>
  useSearchStore((state) => state.scholarships);
export const useSearchFilters = () => useSearchStore((state) => state.filters);
export const useSearchProgress = () =>
  useSearchStore((state) => state.progress);
export const useSearchViewMode = () =>
  useSearchStore((state) => state.viewMode);
