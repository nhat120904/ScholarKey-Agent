"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { StudentProfile, HederaResponse } from "@/types";

interface OnboardingStepProps {
  onComplete: (profile: StudentProfile, hedera: HederaResponse | null) => void;
}

type UploadStatus =
  | "idle"
  | "uploading"
  | "parsing"
  | "verifying"
  | "complete"
  | "error";

interface AIThought {
  message: string;
  timestamp: Date;
}

export function OnboardingStep({ onComplete }: OnboardingStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiThoughts, setAiThoughts] = useState<AIThought[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const addThought = (message: string) => {
    setAiThoughts((prev) => [...prev, { message, timestamp: new Date() }]);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setError(null);
      setAiThoughts([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus("uploading");
      setProgress(10);
      addThought("📤 Starting CV upload...");

      // Upload and parse CV
      setStatus("parsing");
      setProgress(30);
      addThought("🔍 Reading your CV document...");

      setTimeout(() => {
        addThought("📝 Extracting educational background...");
      }, 1000);

      setTimeout(() => {
        addThought("🎯 Identifying skills and achievements...");
      }, 2000);

      const parseResult = await api.uploadCV(file, "USA", "", "master");
      setProfile(parseResult.profile);
      setProgress(60);
      addThought("✅ CV analysis complete!");

      // Verify on Hedera
      setStatus("verifying");
      setProgress(80);
      addThought("🔗 Recording profile hash on Hedera blockchain...");

      let hederaResult: HederaResponse | null = null;
      try {
        hederaResult = await api.verifyProfile(parseResult.profile);
        setProgress(100);
        addThought(`✅ Verified! Transaction: ${hederaResult.transaction_id}`);
      } catch {
        addThought("⚠️ Blockchain verification skipped (optional feature)");
        setProgress(100);
      }

      setStatus("complete");

      // Wait a moment to show completion status
      setTimeout(() => {
        onComplete(parseResult.profile, hederaResult);
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to process CV");
      addThought("❌ An error occurred during processing");
    }
  };

  const statusConfig: Record<UploadStatus, { color: string; text: string }> = {
    idle: { color: "gray", text: "Ready to upload" },
    uploading: { color: "blue", text: "Uploading..." },
    parsing: { color: "blue", text: "AI is analyzing your CV..." },
    verifying: { color: "purple", text: "Recording on blockchain..." },
    complete: { color: "green", text: "Profile ready!" },
    error: { color: "red", text: "Error occurred" },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome to ScholarKey AI
        </h2>
        <p className="text-gray-600">
          Upload your CV and let our AI help you find the perfect scholarships
          and programs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Your CV
          </CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : file
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-gray-400",
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-green-600" />
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-blue-500" />
                <p className="font-medium text-blue-600">Drop your CV here</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="font-medium text-gray-600">
                  Drag & drop your CV here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  PDF or DOCX files accepted
                </p>
              </div>
            )}
          </div>

          {/* Progress and Status */}
          {status !== "idle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    "flex items-center gap-2",
                    status === "error"
                      ? "text-red-600"
                      : status === "complete"
                        ? "text-green-600"
                        : "text-blue-600",
                  )}
                >
                  {status === "complete" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : status === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {statusConfig[status].text}
                </span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* AI Thoughts */}
          {aiThoughts.length > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    AI Analysis
                  </span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {aiThoughts.map((thought, index) => (
                    <p
                      key={index}
                      className={cn(
                        "text-sm transition-opacity duration-300",
                        index === aiThoughts.length - 1
                          ? "text-gray-800 font-medium"
                          : "text-gray-600",
                      )}
                    >
                      {thought.message}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || status !== "idle"}
            className="w-full"
            size="lg"
          >
            {status === "idle" ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze My CV with AI
              </>
            ) : status === "complete" ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Analysis Complete
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Profile Preview */}
      {profile && status === "complete" && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Profile Extracted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{profile.full_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-gray-500">Education:</span>
                <p className="font-medium">
                  {profile.education_level || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Field:</span>
                <p className="font-medium">{profile.field_of_study || "N/A"}</p>
              </div>
              <div>
                <span className="text-gray-500">Skills:</span>
                <p className="font-medium">
                  {profile.skills?.slice(0, 3).join(", ") || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
