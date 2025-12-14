"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  DollarSign,
  Calendar,
  MapPin,
  ExternalLink,
  BookmarkPlus,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Building2,
  FileText,
  Star,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Scholarship } from "@/types";

interface ScholarshipCardProps {
  scholarship: Scholarship;
  matchScore?: number;
  onSave?: () => void;
  onApply?: () => void;
  isSaved?: boolean;
  compact?: boolean;
  className?: string;
}

export function ScholarshipCard({
  scholarship,
  matchScore,
  onSave,
  onApply,
  isSaved = false,
  compact = false,
  className,
}: ScholarshipCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const deadlineStatus = getDeadlineStatus(scholarship.deadline);

  if (compact && !isExpanded) {
    return (
      <CompactScholarshipCard
        scholarship={scholarship}
        matchScore={matchScore}
        isSaved={isSaved}
        onSave={onSave}
        onExpand={() => setIsExpanded(true)}
        className={className}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-xl bg-card overflow-hidden hover:shadow-md transition-shadow",
        className,
      )}
    >
      {/* Header with match score */}
      <div className="relative">
        {matchScore && (
          <div className="absolute top-3 right-3 z-10">
            <MatchBadge score={matchScore} />
          </div>
        )}
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0 pr-16">
              <h3 className="font-semibold text-lg line-clamp-2">
                {scholarship.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                {scholarship.provider ||
                  scholarship.organization ||
                  "Unknown Provider"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem
            icon={DollarSign}
            label="Award"
            value={scholarship.amount || "Varies"}
            highlight
          />
          <InfoItem
            icon={Calendar}
            label="Deadline"
            value={
              scholarship.deadline
                ? formatDate(scholarship.deadline)
                : "Rolling"
            }
            status={deadlineStatus}
          />
          <InfoItem
            icon={MapPin}
            label="Location"
            value={scholarship.country || scholarship.location || "Various"}
          />
          <InfoItem
            icon={GraduationCap}
            label="Level"
            value={scholarship.level || "All Levels"}
          />
        </div>

        {/* Description */}
        {scholarship.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {scholarship.description}
          </p>
        )}

        {/* Tags */}
        {scholarship.fields && scholarship.fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {scholarship.fields.slice(0, 4).map((field, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {field}
              </span>
            ))}
            {scholarship.fields.length > 4 && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                +{scholarship.fields.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Eligibility requirements */}
        {scholarship.requirements && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Requirements
            </h4>
            <ul className="text-sm space-y-0.5">
              {scholarship.requirements.slice(0, 3).map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onApply}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            View Details
          </Button>
          <Button
            variant={isSaved ? "secondary" : "outline"}
            size="icon"
            onClick={onSave}
            className="h-9 w-9"
          >
            {isSaved ? (
              <Bookmark className="h-4 w-4 fill-current" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
          </Button>
          {scholarship.url && (
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <a
                href={scholarship.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {/* Collapse button */}
        {compact && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Show Less
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Compact card variant
function CompactScholarshipCard({
  scholarship,
  matchScore,
  isSaved,
  onSave,
  onExpand,
  className,
}: {
  scholarship: Scholarship;
  matchScore?: number;
  isSaved?: boolean;
  onSave?: () => void;
  onExpand: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-lg bg-card p-3 hover:shadow-sm transition-shadow cursor-pointer",
        className,
      )}
      onClick={onExpand}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1">
            {scholarship.name}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {scholarship.amount || "Varies"} •{" "}
            {scholarship.deadline
              ? formatDate(scholarship.deadline)
              : "Rolling"}
          </p>
        </div>
        {matchScore && <MatchBadge score={matchScore} size="sm" />}
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// Info item component
function InfoItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  status,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  highlight?: boolean;
  status?: "urgent" | "soon" | "normal";
}) {
  const statusColors = {
    urgent: "text-red-600 dark:text-red-400",
    soon: "text-amber-600 dark:text-amber-400",
    normal: "",
  };

  return (
    <div className="flex items-start gap-2">
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5",
          highlight ? "text-emerald-600" : "text-muted-foreground",
        )}
      />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-sm font-medium",
            highlight && "text-emerald-600 dark:text-emerald-400",
            status && statusColors[status],
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// Match score badge
function MatchBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const getColor = (score: number) => {
    if (score >= 80)
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    if (score >= 60)
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    if (score >= 40)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };

  return (
    <div
      className={cn(
        "rounded-full font-medium flex items-center gap-1",
        getColor(score),
        sizeClasses[size],
      )}
    >
      <Star
        className={cn(
          "fill-current",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
        )}
      />
      <span>{score}%</span>
    </div>
  );
}

// Deadline status helper
function getDeadlineStatus(
  deadline?: string,
): "urgent" | "soon" | "normal" | undefined {
  if (!deadline) return undefined;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil < 0) return undefined;
  if (daysUntil <= 7) return "urgent";
  if (daysUntil <= 30) return "soon";
  return "normal";
}

// Scholarship list for chat results
export function ScholarshipList({
  scholarships,
  onSave,
  onSelect,
  savedIds = [],
  className,
}: {
  scholarships: Array<Scholarship & { matchScore?: number }>;
  onSave?: (id: string) => void;
  onSelect?: (scholarship: Scholarship) => void;
  savedIds?: string[];
  className?: string;
}) {
  if (scholarships.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No scholarships found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {scholarships.map((scholarship, index) => (
        <ScholarshipCard
          key={scholarship.id || index}
          scholarship={scholarship}
          matchScore={scholarship.matchScore}
          isSaved={savedIds.includes(scholarship.id || "")}
          onSave={() => onSave?.(scholarship.id || "")}
          onApply={() => onSelect?.(scholarship)}
          compact
        />
      ))}
    </div>
  );
}

// Mini scholarship preview for inline display
export function MiniScholarshipCard({
  scholarship,
  className,
}: {
  scholarship: Scholarship;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
        className,
      )}
    >
      <GraduationCap className="h-4 w-4 text-emerald-600" />
      <div className="text-sm">
        <p className="font-medium text-emerald-900 dark:text-emerald-100 line-clamp-1">
          {scholarship.name}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {scholarship.amount || "Varies"}
        </p>
      </div>
    </div>
  );
}
