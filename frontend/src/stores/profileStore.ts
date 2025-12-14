import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  StudentProfile,
  HederaResponse,
  TestScores,
  StudyLevel,
} from "@/types";

// Hedera info can be either the full response or the simplified session info
export interface HederaInfo {
  topic_id: string;
  topic_url?: string;
  transaction_id?: string;
  topic_sequence_number?: number;
  verification_url?: string;
  data_hash?: string;
}

interface ProfileState {
  // State
  profile: StudentProfile | null;
  hederaInfo: HederaInfo | null;
  isEditing: boolean;
  isDirty: boolean;
  validationErrors: Record<string, string>;

  // Actions
  setProfile: (profile: StudentProfile | null) => void;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  updateTestScores: (scores: Partial<TestScores>) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  setHederaInfo: (info: HederaInfo | null) => void;
  setEditing: (editing: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setValidationError: (field: string, error: string | null) => void;
  clearValidationErrors: () => void;
  resetProfile: () => void;

  // Computed helpers
  hasProfile: () => boolean;
  isVerified: () => boolean;
  getCompletionPercentage: () => number;
}

const REQUIRED_FIELDS: (keyof StudentProfile)[] = [
  "name",
  "gpa",
  "major",
  "desired_field",
  "target_country",
  "level",
];

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      hederaInfo: null,
      isEditing: false,
      isDirty: false,
      validationErrors: {},

      // Actions
      setProfile: (profile) =>
        set({
          profile,
          isDirty: false,
          validationErrors: {},
        }),

      updateProfile: (updates) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
          isDirty: true,
        }));
      },

      updateTestScores: (scores) => {
        set((state) => ({
          profile: state.profile
            ? {
                ...state.profile,
                test_scores: { ...state.profile.test_scores, ...scores },
              }
            : null,
          isDirty: true,
        }));
      },

      addSkill: (skill) => {
        set((state) => {
          if (!state.profile) return state;
          const skills = state.profile.skills || [];
          if (skills.includes(skill)) return state;
          return {
            profile: {
              ...state.profile,
              skills: [...skills, skill],
            },
            isDirty: true,
          };
        });
      },

      removeSkill: (skill) => {
        set((state) => {
          if (!state.profile) return state;
          return {
            profile: {
              ...state.profile,
              skills: (state.profile.skills || []).filter((s) => s !== skill),
            },
            isDirty: true,
          };
        });
      },

      setHederaInfo: (info) => set({ hederaInfo: info }),

      setEditing: (editing) => set({ isEditing: editing }),

      setDirty: (dirty) => set({ isDirty: dirty }),

      setValidationError: (field, error) => {
        set((state) => ({
          validationErrors: error
            ? { ...state.validationErrors, [field]: error }
            : Object.fromEntries(
                Object.entries(state.validationErrors).filter(
                  ([k]) => k !== field,
                ),
              ),
        }));
      },

      clearValidationErrors: () => set({ validationErrors: {} }),

      resetProfile: () =>
        set({
          profile: null,
          hederaInfo: null,
          isEditing: false,
          isDirty: false,
          validationErrors: {},
        }),

      // Computed helpers
      hasProfile: () => {
        const { profile } = get();
        return profile !== null;
      },

      isVerified: () => {
        const { hederaInfo } = get();
        return hederaInfo !== null && !!hederaInfo.transaction_id;
      },

      getCompletionPercentage: () => {
        const { profile } = get();
        if (!profile) return 0;

        const totalFields = REQUIRED_FIELDS.length;
        let filledFields = 0;

        REQUIRED_FIELDS.forEach((field) => {
          const value = profile[field];
          if (value !== undefined && value !== null && value !== "") {
            filledFields++;
          }
        });

        // Also check optional but important fields
        if (profile.test_scores?.ielts || profile.test_scores?.toefl) {
          filledFields += 0.5;
        }
        if (profile.skills && profile.skills.length > 0) {
          filledFields += 0.5;
        }
        if (profile.publications && profile.publications > 0) {
          filledFields += 0.25;
        }
        if (
          profile.work_experience_years &&
          profile.work_experience_years > 0
        ) {
          filledFields += 0.25;
        }

        return Math.min(100, Math.round((filledFields / totalFields) * 100));
      },
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        hederaInfo: state.hederaInfo,
      }),
    },
  ),
);

// Selector hooks for performance
export const useProfile = () => useProfileStore((state) => state.profile);
export const useHederaInfo = () => useProfileStore((state) => state.hederaInfo);
export const useProfileEditing = () =>
  useProfileStore((state) => state.isEditing);
export const useProfileDirty = () => useProfileStore((state) => state.isDirty);
export const useProfileErrors = () =>
  useProfileStore((state) => state.validationErrors);
