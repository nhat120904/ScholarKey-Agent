"use client";

import { useState, useMemo } from "react";
import {
  GraduationCap,
  BookOpen,
  Download,
  ExternalLink,
  Filter,
  Trophy,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Scholarship, Program, SearchResults, StudentProfile } from "@/types";

interface ResultsDashboardProps {
  results: SearchResults;
  profile: StudentProfile;
  onStartOver: () => void;
}

export function ResultsDashboard({ results, profile, onStartOver }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"scholarships" | "programs">("scholarships");
  const [searchQuery, setSearchQuery] = useState("");
  const [minMatchScore, setMinMatchScore] = useState("0");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    return results.scholarships.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScore = (s.match_score || 0) >= parseInt(minMatchScore);
      return matchesSearch && matchesScore;
    });
  }, [results.scholarships, searchQuery, minMatchScore]);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    return results.programs.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScore = (p.profile_match_score || 0) >= parseInt(minMatchScore);
      return matchesSearch && matchesScore;
    });
  }, [results.programs, searchQuery, minMatchScore]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await api.exportToExcel({
        scholarships: filteredScholarships,
        programs: filteredPrograms,
        profile,
        include_scholarships: true,
        include_programs: true,
        include_combined: true,
      });

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholarkey-results-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Matches</h2>
          <p className="text-gray-600">
            Found {results.total_scholarships} scholarships and {results.total_programs} programs
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
          <Button variant="outline" onClick={onStartOver}>
            New Search
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{results.total_scholarships}</p>
                <p className="text-sm text-gray-500">Scholarships</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{results.total_programs}</p>
                <p className="text-sm text-gray-500">Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {results.scholarships.filter((s) => (s.match_score || 0) >= 80).length}
                </p>
                <p className="text-sm text-gray-500">High Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {results.scholarships.filter((s) => s.value?.type === "Full").length}
                </p>
                <p className="text-sm text-gray-500">Full Funding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, school, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="matchScore" className="sr-only">
                Minimum Match Score
              </Label>
              <Select value={minMatchScore} onValueChange={setMinMatchScore}>
                <SelectTrigger id="matchScore">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Match Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Results</SelectItem>
                  <SelectItem value="50">50%+ Match</SelectItem>
                  <SelectItem value="70">70%+ Match</SelectItem>
                  <SelectItem value="80">80%+ Match</SelectItem>
                  <SelectItem value="90">90%+ Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scholarships" | "programs")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scholarships" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Scholarships ({filteredScholarships.length})
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Programs ({filteredPrograms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scholarships" className="space-y-4 mt-4">
          {filteredScholarships.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No scholarships found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            filteredScholarships.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.scholarship_id}
                scholarship={scholarship}
                isExpanded={expandedId === scholarship.scholarship_id}
                onToggle={() => toggleExpand(scholarship.scholarship_id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="programs" className="space-y-4 mt-4">
          {filteredPrograms.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No programs found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            filteredPrograms.map((program) => (
              <ProgramCard
                key={program.program_id}
                program={program}
                isExpanded={expandedId === program.program_id}
                onToggle={() => toggleExpand(program.program_id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Hedera Verification */}
      {results.hedera_verification_url && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-purple-900">Results Verified on Hedera</p>
                  <p className="text-sm text-gray-600">
                    Your search results have been recorded on the blockchain
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={results.hedera_verification_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Scholarship Card Component
interface ScholarshipCardProps {
  scholarship: Scholarship;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScholarshipCard({ scholarship, isExpanded, onToggle }: ScholarshipCardProps) {
  const matchScore = scholarship.match_score || 0;
  const matchColor =
    matchScore >= 80 ? "green" : matchScore >= 60 ? "yellow" : matchScore >= 40 ? "orange" : "red";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{scholarship.name}</CardTitle>
              {matchScore >= 80 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  Top Match
                </span>
              )}
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {scholarship.provider}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {scholarship.country}
              </span>
              {scholarship.value && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {scholarship.value.type}
                  {scholarship.value.amount &&
                    ` - ${formatCurrency(scholarship.value.amount, scholarship.value.currency)}`}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Match Score</div>
              <div className="flex items-center gap-2">
                <Progress
                  value={matchScore}
                  className={cn(
                    "w-20 h-2",
                    matchColor === "green" && "[&>div]:bg-green-500",
                    matchColor === "yellow" && "[&>div]:bg-yellow-500",
                    matchColor === "orange" && "[&>div]:bg-orange-500",
                    matchColor === "red" && "[&>div]:bg-red-500"
                  )}
                />
                <span className="font-bold">{matchScore}%</span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t bg-gray-50 space-y-4">
          {/* Description */}
          {scholarship.description && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{scholarship.description}</p>
            </div>
          )}

          {/* Match Analysis */}
          {scholarship.match_analysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-sm text-blue-800 mb-1">AI Match Analysis</h4>
              <p className="text-sm text-blue-700">{scholarship.match_analysis}</p>
            </div>
          )}

          {/* Deadlines */}
          {scholarship.deadlines && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deadlines
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {scholarship.deadlines.round_1 && (
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-500">Round 1:</span>
                    <p className="font-medium">{formatDate(scholarship.deadlines.round_1)}</p>
                  </div>
                )}
                {scholarship.deadlines.round_2 && (
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-500">Round 2:</span>
                    <p className="font-medium">{formatDate(scholarship.deadlines.round_2)}</p>
                  </div>
                )}
                {scholarship.deadlines.round_3 && (
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-500">Round 3:</span>
                    <p className="font-medium">{formatDate(scholarship.deadlines.round_3)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Eligibility */}
          {scholarship.eligibility_criteria && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Eligibility Criteria</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {scholarship.eligibility_criteria.min_gpa && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Min GPA: {scholarship.eligibility_criteria.min_gpa}</span>
                  </div>
                )}
                {scholarship.eligibility_criteria.min_ielts && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Min IELTS: {scholarship.eligibility_criteria.min_ielts}</span>
                  </div>
                )}
                {scholarship.eligibility_criteria.study_levels?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Levels: {scholarship.eligibility_criteria.study_levels.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required Documents */}
          {scholarship.required_documents?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Required Documents</h4>
              <div className="flex flex-wrap gap-2">
                {scholarship.required_documents.map((doc, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                  >
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Eligible Programs */}
          {scholarship.eligible_programs?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Eligible Programs</h4>
              <div className="space-y-1">
                {scholarship.eligible_programs.slice(0, 5).map((program, index) => (
                  <div key={index} className="text-sm flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-gray-400" />
                    <span>{program.program_name}</span>
                    <span className="text-gray-400">at {program.school}</span>
                  </div>
                ))}
                {scholarship.eligible_programs.length > 5 && (
                  <p className="text-sm text-gray-500">
                    +{scholarship.eligible_programs.length - 5} more programs
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {scholarship.url && (
              <Button size="sm" asChild>
                <a href={scholarship.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Program Card Component
interface ProgramCardProps {
  program: Program;
  isExpanded: boolean;
  onToggle: () => void;
}

function ProgramCard({ program, isExpanded, onToggle }: ProgramCardProps) {
  const matchScore = program.profile_match_score || 0;
  const matchColor =
    matchScore >= 80 ? "green" : matchScore >= 60 ? "yellow" : matchScore >= 40 ? "orange" : "red";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{program.name}</CardTitle>
              {matchScore >= 80 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  Best Fit
                </span>
              )}
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {program.school_name}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {program.country}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {program.level}
              </span>
              {program.duration_years && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {program.duration_years} years
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Match Score</div>
              <div className="flex items-center gap-2">
                <Progress
                  value={matchScore}
                  className={cn(
                    "w-20 h-2",
                    matchColor === "green" && "[&>div]:bg-green-500",
                    matchColor === "yellow" && "[&>div]:bg-yellow-500",
                    matchColor === "orange" && "[&>div]:bg-orange-500",
                    matchColor === "red" && "[&>div]:bg-red-500"
                  )}
                />
                <span className="font-bold">{matchScore}%</span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t bg-gray-50 space-y-4">
          {/* Description */}
          {program.description && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{program.description}</p>
            </div>
          )}

          {/* Focus Areas */}
          {program.focus_areas?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {program.focus_areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 rounded text-xs text-purple-700"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          {program.requirements && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Requirements</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {program.requirements.min_gpa && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Min GPA: {program.requirements.min_gpa}</span>
                  </div>
                )}
                {Object.entries(program.requirements.language_scores || {}).map(([test, score]) => (
                  <div key={test} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>
                      {test.toUpperCase()}: {score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Scholarships */}
          {program.available_scholarships?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Available Scholarships</h4>
              <div className="space-y-1">
                {program.available_scholarships.slice(0, 3).map((scholarship, index) => (
                  <div key={index} className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-3 w-3 text-amber-500" />
                    <span>{scholarship}</span>
                  </div>
                ))}
                {program.available_scholarships.length > 3 && (
                  <p className="text-sm text-gray-500">
                    +{program.available_scholarships.length - 3} more scholarships
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {program.url && (
              <Button size="sm" asChild>
                <a href={program.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Program
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
