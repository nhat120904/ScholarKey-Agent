"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfileStore } from "@/stores/profileStore";
import { useChatStore } from "@/stores/chatStore";
import { apiClient } from "@/lib/api";
import type { StudentProfile } from "@/types";

// Query keys
export const profileKeys = {
  all: ["profiles"] as const,
  detail: (sessionId: string) => [...profileKeys.all, sessionId] as const,
};

export function useProfile() {
  const sessionId = useChatStore((state) => state.sessionId);
  const { setProfile, setHederaInfo } = useProfileStore();

  return useQuery({
    queryKey: profileKeys.detail(sessionId || ""),
    queryFn: async () => {
      if (!sessionId) return null;

      const profile = await apiClient.getProfile(sessionId);
      setProfile(profile);
      return profile;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const sessionId = useChatStore((state) => state.sessionId);
  const { setProfile, setDirty, clearValidationErrors } = useProfileStore();

  return useMutation({
    mutationFn: async (updates: Partial<StudentProfile>) => {
      if (!sessionId) {
        throw new Error("No active session");
      }
      return apiClient.updateProfile(sessionId, updates);
    },
    onSuccess: (profile) => {
      setProfile(profile);
      setDirty(false);
      clearValidationErrors();
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(sessionId || ""),
      });
    },
  });
}

export function useVerifyOnHedera() {
  const { profile, setHederaInfo } = useProfileStore();

  return useMutation({
    mutationFn: async () => {
      if (!profile) {
        throw new Error("No profile to verify");
      }
      return apiClient.verifyOnHedera({ profile });
    },
    onSuccess: (response) => {
      setHederaInfo(response);
    },
  });
}

// Hook for profile validation
export function useProfileValidation() {
  const {
    profile,
    validationErrors,
    setValidationError,
    clearValidationErrors,
  } = useProfileStore();

  const validate = (): boolean => {
    clearValidationErrors();
    let isValid = true;

    if (!profile) {
      return false;
    }

    // Required fields validation
    if (!profile.name && !profile.full_name) {
      setValidationError("name", "Name is required");
      isValid = false;
    }

    if (profile.gpa < 0 || profile.gpa > 4.0) {
      setValidationError("gpa", "GPA must be between 0 and 4.0");
      isValid = false;
    }

    if (!profile.major) {
      setValidationError("major", "Major is required");
      isValid = false;
    }

    if (!profile.target_country) {
      setValidationError("target_country", "Target country is required");
      isValid = false;
    }

    if (!profile.level) {
      setValidationError("level", "Study level is required");
      isValid = false;
    }

    // Test scores validation
    if (
      profile.test_scores?.ielts &&
      (profile.test_scores.ielts < 0 || profile.test_scores.ielts > 9)
    ) {
      setValidationError("ielts", "IELTS score must be between 0 and 9");
      isValid = false;
    }

    if (
      profile.test_scores?.toefl &&
      (profile.test_scores.toefl < 0 || profile.test_scores.toefl > 120)
    ) {
      setValidationError("toefl", "TOEFL score must be between 0 and 120");
      isValid = false;
    }

    if (
      profile.test_scores?.gre &&
      (profile.test_scores.gre < 260 || profile.test_scores.gre > 340)
    ) {
      setValidationError("gre", "GRE score must be between 260 and 340");
      isValid = false;
    }

    return isValid;
  };

  return {
    validate,
    errors: validationErrors,
    hasErrors: Object.keys(validationErrors).length > 0,
  };
}

// Hook for profile completion
export function useProfileCompletion() {
  const { profile, getCompletionPercentage } = useProfileStore();

  const getMissingFields = (): string[] => {
    if (!profile) return ["All fields"];

    const missing: string[] = [];

    if (!profile.name && !profile.full_name) missing.push("Name");
    if (!profile.gpa) missing.push("GPA");
    if (!profile.major) missing.push("Major");
    if (!profile.desired_field) missing.push("Desired field");
    if (!profile.target_country) missing.push("Target country");
    if (!profile.level) missing.push("Study level");
    if (!profile.test_scores?.ielts && !profile.test_scores?.toefl) {
      missing.push("Language test scores");
    }

    return missing;
  };

  return {
    completionPercentage: getCompletionPercentage(),
    missingFields: getMissingFields(),
    isComplete: getMissingFields().length === 0,
  };
}
