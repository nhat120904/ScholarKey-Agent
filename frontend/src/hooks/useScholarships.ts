"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchStore } from "@/stores/searchStore";
import { apiClient } from "@/lib/api";
import type { SearchRequest, Scholarship } from "@/types";
import type { SearchFilters, SortOption } from "@/types/search";

// Query keys
export const scholarshipKeys = {
  all: ["scholarships"] as const,
  lists: () => [...scholarshipKeys.all, "list"] as const,
  list: (filters: SearchFilters) =>
    [...scholarshipKeys.lists(), filters] as const,
  details: () => [...scholarshipKeys.all, "detail"] as const,
  detail: (id: string) => [...scholarshipKeys.details(), id] as const,
};

interface UseScholarshipsOptions {
  enabled?: boolean;
  filters?: SearchFilters;
  sortBy?: SortOption;
}

export function useScholarships({
  enabled = true,
  filters,
  sortBy,
}: UseScholarshipsOptions = {}) {
  const { setResults, setProgress, searchSessionId } = useSearchStore();

  return useQuery({
    queryKey: scholarshipKeys.list(filters || {}),
    queryFn: async () => {
      if (!searchSessionId) {
        return { scholarships: [], programs: [] };
      }

      setProgress({ status: "searching" });

      try {
        const results = await apiClient.searchWithFilters(
          searchSessionId,
          filters || {},
          sortBy,
        );

        setResults(results.scholarships, results.programs);
        setProgress({ status: "complete" });

        return results;
      } catch (error) {
        setProgress({ status: "error", error: (error as Error).message });
        throw error;
      }
    },
    enabled: enabled && !!searchSessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useScholarship(scholarshipId: string) {
  return useQuery({
    queryKey: scholarshipKeys.detail(scholarshipId),
    queryFn: () => apiClient.getScholarship(scholarshipId),
    enabled: !!scholarshipId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSearchScholarships() {
  const queryClient = useQueryClient();
  const { setResults, setProgress, setSearchSessionId } = useSearchStore();

  return useMutation({
    mutationFn: async (request: SearchRequest) => {
      setProgress({
        status: "searching",
        total_queries: 1,
        completed_queries: 0,
      });
      return apiClient.searchScholarships(request);
    },
    onSuccess: (data) => {
      setResults(data.scholarships, data.programs);
      setSearchSessionId(data.search_session_id);
      setProgress({ status: "complete", completed_queries: 1 });

      // Invalidate scholarship queries to refresh data
      queryClient.invalidateQueries({ queryKey: scholarshipKeys.lists() });
    },
    onError: (error: Error) => {
      setProgress({ status: "error", error: error.message });
    },
  });
}

export function useExportScholarships() {
  return useMutation({
    mutationFn: async ({
      scholarships,
      format,
    }: {
      scholarships: Scholarship[];
      format: "excel" | "pdf";
    }) => {
      const blob = await apiClient.exportScholarships(scholarships, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholarships.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return blob;
    },
  });
}
