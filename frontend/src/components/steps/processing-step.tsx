"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Search, BookOpen, CheckCircle, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProcessingStepProps {
  searchMode: "by_scholarship" | "by_program";
}

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export function ProcessingStep({ searchMode }: ProcessingStepProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [aiThoughts, setAiThoughts] = useState<string[]>([]);

  const stages: ProcessingStage[] = searchMode === "by_scholarship"
    ? [
        {
          id: "profile",
          name: "Analyzing Profile",
          description: "Understanding your qualifications and goals",
          icon: <Sparkles className="h-5 w-5" />,
        },
        {
          id: "search",
          name: "Searching Scholarships",
          description: "Finding matching scholarship opportunities",
          icon: <Search className="h-5 w-5" />,
        },
        {
          id: "programs",
          name: "Matching Programs",
          description: "Identifying eligible programs for each scholarship",
          icon: <BookOpen className="h-5 w-5" />,
        },
        {
          id: "ranking",
          name: "Ranking Results",
          description: "Calculating match scores and organizing results",
          icon: <CheckCircle className="h-5 w-5" />,
        },
      ]
    : [
        {
          id: "profile",
          name: "Analyzing Profile",
          description: "Understanding your qualifications and goals",
          icon: <Sparkles className="h-5 w-5" />,
        },
        {
          id: "programs",
          name: "Searching Programs",
          description: "Finding matching academic programs",
          icon: <BookOpen className="h-5 w-5" />,
        },
        {
          id: "scholarships",
          name: "Finding Scholarships",
          description: "Discovering funding opportunities for each program",
          icon: <Search className="h-5 w-5" />,
        },
        {
          id: "ranking",
          name: "Ranking Results",
          description: "Calculating match scores and organizing results",
          icon: <CheckCircle className="h-5 w-5" />,
        },
      ];

  const aiMessages = searchMode === "by_scholarship"
    ? [
        "🔍 Analyzing your academic profile and qualifications...",
        "📊 Cross-referencing with global scholarship databases...",
        "🎓 Found several highly-matching scholarship opportunities!",
        "📝 Checking eligibility criteria against your profile...",
        "🌍 Searching for programs in your target country...",
        "💡 Identifying programs with strong field alignment...",
        "⚡ Calculating compatibility scores...",
        "✨ Finalizing your personalized scholarship matches...",
      ]
    : [
        "🔍 Analyzing your academic background and interests...",
        "🏫 Searching top universities in your target region...",
        "📚 Finding programs matching your field of study...",
        "💡 Evaluating program curriculum alignment...",
        "🎯 Cross-referencing with available scholarships...",
        "💰 Checking funding opportunities for each program...",
        "⚡ Calculating your match scores...",
        "✨ Preparing your personalized program recommendations...",
      ];

  useEffect(() => {
    // Simulate progress through stages
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        clearInterval(stageInterval);
        return prev;
      });
    }, 3000);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 95) {
          return prev + Math.random() * 5;
        }
        return prev;
      });
    }, 500);

    // AI thoughts animation
    let thoughtIndex = 0;
    const thoughtInterval = setInterval(() => {
      if (thoughtIndex < aiMessages.length) {
        setAiThoughts((prev) => [...prev, aiMessages[thoughtIndex]]);
        thoughtIndex++;
      } else {
        clearInterval(thoughtInterval);
      }
    }, 1500);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
      clearInterval(thoughtInterval);
    };
  }, [searchMode, stages.length, aiMessages]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-8 w-8 text-blue-600 animate-pulse" />
          <h2 className="text-3xl font-bold text-gray-900">Finding Your Opportunities</h2>
        </div>
        <p className="text-gray-600">
          Our AI is searching across thousands of scholarships and programs...
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Processing</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg transition-all duration-300",
                  index < currentStage
                    ? "bg-green-50 border border-green-200"
                    : index === currentStage
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50 border border-gray-200"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    index < currentStage
                      ? "bg-green-500 text-white"
                      : index === currentStage
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {index < currentStage ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : index === currentStage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    stage.icon
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      index < currentStage
                        ? "text-green-700"
                        : index === currentStage
                        ? "text-blue-700"
                        : "text-gray-500"
                    )}
                  >
                    {stage.name}
                  </p>
                  <p className="text-sm text-gray-500">{stage.description}</p>
                </div>
                {index < currentStage && (
                  <span className="text-sm text-green-600 font-medium">Complete</span>
                )}
                {index === currentStage && (
                  <span className="text-sm text-blue-600 font-medium">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Thoughts */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            Real-time insights from our scholarship matching engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {aiThoughts.map((thought, index) => (
              <p
                key={index}
                className={cn(
                  "text-sm transition-opacity duration-500",
                  index === aiThoughts.length - 1
                    ? "text-purple-800 font-medium"
                    : "text-gray-600"
                )}
              >
                {thought}
              </p>
            ))}
            {aiThoughts.length === 0 && (
              <p className="text-gray-500 text-sm">Starting analysis...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips while waiting */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium mb-2">💡 Did you know?</p>
            <p>
              ScholarKey AI searches across 50,000+ scholarship opportunities and 
              10,000+ academic programs worldwide to find the best matches for your profile.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
