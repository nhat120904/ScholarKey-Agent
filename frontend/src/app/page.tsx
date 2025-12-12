"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import {
  OnboardingStep,
  PreferencesStep,
  ProcessingStep,
  ResultsDashboard,
} from "@/components/steps";
import type { SearchPreferences } from "@/components/steps";
import { api } from "@/lib/api";
import type { StudentProfile, SearchResults, HederaResponse } from "@/types";

type Step = "onboarding" | "preferences" | "processing" | "results";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [hederaInfo, setHederaInfo] = useState<HederaResponse | null>(null);
  const [searchPreferences, setSearchPreferences] = useState<SearchPreferences | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  const handleProfileComplete = (newProfile: StudentProfile, hedera: HederaResponse | null) => {
    setProfile(newProfile);
    setHederaInfo(hedera);
    setCurrentStep("preferences");
  };

  const handlePreferencesSubmit = async (preferences: SearchPreferences) => {
    setSearchPreferences(preferences);
    setCurrentStep("processing");

    // Update profile with preferences
    if (profile) {
      const updatedProfile: StudentProfile = {
        ...profile,
        target_country: preferences.targetCountry,
        level: preferences.studyLevel,
        major: preferences.major,
        desired_field: preferences.desiredField,
      };
      setProfile(updatedProfile);

      // Perform the search
      try {
        const results = await api.searchScholarships({
          profile: updatedProfile,
          search_mode: preferences.searchMode,
          school_name: preferences.schoolName,
          program_name: preferences.programName,
          min_match_score: 0,
          include_partial_matches: true,
        });
        setSearchResults(results);
        setCurrentStep("results");
      } catch (error) {
        console.error("Search failed:", error);
        // Show error and go back to preferences
        setCurrentStep("preferences");
      }
    }
  };

  const handleStartOver = () => {
    setCurrentStep("onboarding");
    setProfile(null);
    setHederaInfo(null);
    setSearchPreferences(null);
    setSearchResults(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header onStartOver={handleStartOver} showStartOver={currentStep !== "onboarding"} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {["onboarding", "preferences", "processing", "results"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step
                      ? "bg-blue-600 text-white"
                      : index < ["onboarding", "preferences", "processing", "results"].indexOf(currentStep)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      index < ["onboarding", "preferences", "processing", "results"].indexOf(currentStep)
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-[4.5rem] mt-2 text-sm text-gray-600">
            <span>Profile</span>
            <span>Preferences</span>
            <span>Search</span>
            <span>Results</span>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === "onboarding" && (
          <OnboardingStep onComplete={handleProfileComplete} />
        )}

        {currentStep === "preferences" && profile && (
          <PreferencesStep
            profile={profile}
            onSearch={handlePreferencesSubmit}
            onBack={() => setCurrentStep("onboarding")}
          />
        )}

        {currentStep === "processing" && searchPreferences && (
          <ProcessingStep searchMode={searchPreferences.searchMode} />
        )}

        {currentStep === "results" && searchResults && profile && (
          <ResultsDashboard
            results={searchResults}
            profile={profile}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </main>
  );
}
