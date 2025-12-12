"use client";

import { useState } from "react";
import { Globe, GraduationCap, BookOpen, Search, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StudentProfile, SearchMode, StudyLevel } from "@/types";

interface PreferencesStepProps {
  profile: StudentProfile;
  onBack: () => void;
  onSearch: (preferences: SearchPreferences) => void;
}

export interface SearchPreferences {
  targetCountry: string;
  studyLevel: StudyLevel;
  major: string;
  desiredField: string;
  searchMode: SearchMode;
  schoolName?: string;
  programName?: string;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "AU", name: "Australia" },
  { code: "FR", name: "France" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
];

const STUDY_LEVELS: { value: StudyLevel; label: string }[] = [
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "phd", label: "PhD / Doctorate" },
];

const FIELDS = [
  "Computer Science",
  "Data Science & AI",
  "Engineering",
  "Business & MBA",
  "Medicine & Health",
  "Law",
  "Social Sciences",
  "Natural Sciences",
  "Arts & Humanities",
  "Education",
  "Architecture",
  "Environmental Studies",
];

export function PreferencesStep({ profile, onBack, onSearch }: PreferencesStepProps) {
  const [preferences, setPreferences] = useState<SearchPreferences>({
    targetCountry: profile.target_country || "",
    studyLevel: profile.level || "master",
    major: profile.major || "",
    desiredField: profile.desired_field || "",
    searchMode: "by_scholarship",
    schoolName: "",
    programName: "",
  });

  const handleChange = (field: keyof SearchPreferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = preferences.targetCountry && preferences.studyLevel && preferences.desiredField;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSearch(preferences);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Set Your Search Preferences</h2>
        <p className="text-gray-600">
          Tell us more about your study goals to find the best matches
        </p>
      </div>

      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-900">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="font-medium">{profile.name || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">GPA</span>
              <p className="font-medium">{profile.gpa?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">Skills</span>
              <p className="font-medium">{profile.skills?.slice(0, 2).join(", ") || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">Experience</span>
              <p className="font-medium">{profile.work_experience_years || 0} years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Search Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Mode
            </CardTitle>
            <CardDescription>
              Choose how you want to find opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange("searchMode", "by_scholarship")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  preferences.searchMode === "by_scholarship"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    preferences.searchMode === "by_scholarship"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Find by Scholarship</p>
                    <p className="text-sm text-gray-500">
                      Search scholarships first, then see eligible programs
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChange("searchMode", "by_program")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  preferences.searchMode === "by_program"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    preferences.searchMode === "by_program"
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Find by Program</p>
                    <p className="text-sm text-gray-500">
                      Search programs first, then find available scholarships
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Program-specific fields */}
        {preferences.searchMode === "by_program" && (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">Target Program</CardTitle>
              <CardDescription>
                Specify the school and program you&apos;re interested in (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  placeholder="e.g., MIT, Stanford, Oxford"
                  value={preferences.schoolName}
                  onChange={(e) => handleChange("schoolName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programName">Program Name</Label>
                <Input
                  id="programName"
                  placeholder="e.g., Computer Science MS"
                  value={preferences.programName}
                  onChange={(e) => handleChange("programName", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Study Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="country">Target Country *</Label>
              <Select
                value={preferences.targetCountry}
                onValueChange={(value) => handleChange("targetCountry", value)}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Study Level *</Label>
              <Select
                value={preferences.studyLevel}
                onValueChange={(value) => handleChange("studyLevel", value)}
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">Your Major</Label>
              <Input
                id="major"
                placeholder="e.g., Computer Science"
                value={preferences.major}
                onChange={(e) => handleChange("major", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field">Desired Field *</Label>
              <Select
                value={preferences.desiredField}
                onValueChange={(value) => handleChange("desiredField", value)}
              >
                <SelectTrigger id="field">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" disabled={!isValid} size="lg" className="gap-2">
            Search Opportunities
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
