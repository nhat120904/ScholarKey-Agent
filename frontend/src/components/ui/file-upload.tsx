"use client";

import { useCallback, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, AlertCircle, CheckCircle } from "lucide-react";
import { cn, formatFileSize, isValidFileType } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  onUpload: (file: File) => void | Promise<void>;
  accept?: Accept;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function FileUpload({
  onUpload,
  accept = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className,
  label = "Upload your CV",
  description = "Drag and drop your CV here, or click to browse",
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size
      if (file.size > maxSize) {
        setError(`File size must be less than ${formatFileSize(maxSize)}`);
        return;
      }

      setSelectedFile(file);
      setError(null);
      setStatus("uploading");

      try {
        await onUpload(file);
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setStatus("error");
      }
    },
    [maxSize, onUpload],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: handleDrop,
      accept,
      maxFiles: 1,
      disabled: disabled || status === "uploading",
    });

  const clearFile = () => {
    setSelectedFile(null);
    setStatus("idle");
    setError(null);
  };

  const acceptedFormats = Object.values(accept).flat().join(", ");

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
          isDragActive && !isDragReject
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : isDragReject
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : status === "success"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : status === "error"
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600",
          disabled && "opacity-50 cursor-not-allowed",
          status === "uploading" && "pointer-events-none",
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {status === "uploading" ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                Analyzing your CV...
              </p>
            </motion.div>
          ) : status === "success" && selectedFile ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="mt-2"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isDragActive
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "bg-gray-100 dark:bg-gray-800",
                )}
              >
                <Upload
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isDragActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400",
                  )}
                />
              </div>

              <h3 className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                {isDragActive ? "Drop your file here" : description}
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Supported: {acceptedFormats} (max {formatFileSize(maxSize)})
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
