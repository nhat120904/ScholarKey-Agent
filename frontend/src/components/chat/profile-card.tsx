"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  GraduationCap,
  MapPin,
  BookOpen,
  Award,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentProfile } from "@/types";

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdate?: (updates: Partial<StudentProfile>) => void;
  editable?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProfileCard({
  profile,
  onUpdate,
  editable = false,
  compact = false,
  className,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [editedProfile, setEditedProfile] = useState<Partial<StudentProfile>>(
    {},
  );

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate?.(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile({});
    setIsEditing(false);
  };

  const updateField = (field: keyof StudentProfile, value: any) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  };

  const displayName = profile.name || profile.full_name || "Student";
  const displayGPA = profile.gpa?.toFixed(2) || "N/A";

  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "border rounded-xl bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors",
          className,
        )}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{displayName}</h3>
              <p className="text-sm text-muted-foreground">
                {profile.major} • GPA: {displayGPA}
              </p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("border rounded-xl bg-card overflow-hidden", className)}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {profile.level || "Student"} • {profile.nationality || ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editable && !isEditing && (
            <Button variant="ghost" size="icon" onClick={handleEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {compact && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <ProfileEditForm
            profile={editedProfile as StudentProfile}
            onChange={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <ProfileDetails profile={profile} />
        )}
      </div>
    </motion.div>
  );
}

// Profile details view
function ProfileDetails({ profile }: { profile: StudentProfile }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ProfileField
        icon={GraduationCap}
        label="Education"
        value={`${profile.major || "Undeclared"} • GPA: ${profile.gpa?.toFixed(2) || "N/A"}`}
      />
      <ProfileField
        icon={BookOpen}
        label="Desired Field"
        value={profile.desired_field || "Not specified"}
      />
      <ProfileField
        icon={MapPin}
        label="Target Country"
        value={profile.target_country || "Not specified"}
      />
      <ProfileField
        icon={Globe}
        label="Nationality"
        value={profile.nationality || "Not specified"}
      />

      {/* Test Scores */}
      {profile.test_scores && (
        <div className="col-span-full">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Test Scores
          </h4>
          <div className="flex flex-wrap gap-2">
            {profile.test_scores.ielts && (
              <ScoreBadge
                label="IELTS"
                score={profile.test_scores.ielts.toString()}
              />
            )}
            {profile.test_scores.toefl && (
              <ScoreBadge
                label="TOEFL"
                score={profile.test_scores.toefl.toString()}
              />
            )}
            {profile.test_scores.gre && (
              <ScoreBadge
                label="GRE"
                score={profile.test_scores.gre.toString()}
              />
            )}
            {profile.test_scores.gmat && (
              <ScoreBadge
                label="GMAT"
                score={profile.test_scores.gmat.toString()}
              />
            )}
            {profile.test_scores.sat && (
              <ScoreBadge
                label="SAT"
                score={profile.test_scores.sat.toString()}
              />
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="col-span-full">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Skills
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Research Interests */}
      {profile.research_interests && profile.research_interests.length > 0 && (
        <div className="col-span-full">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Research Interests
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.research_interests.map((interest, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Profile field component
function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// Score badge component
function ScoreBadge({ label, score }: { label: string; score: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{score}</span>
    </div>
  );
}

// Profile edit form
function ProfileEditForm({
  profile,
  onChange,
  onSave,
  onCancel,
}: {
  profile: StudentProfile;
  onChange: (field: keyof StudentProfile, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={profile.name || profile.full_name || ""}
            onChange={(e) => onChange("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gpa">GPA</Label>
          <Input
            id="gpa"
            type="number"
            step="0.01"
            min="0"
            max="4"
            value={profile.gpa || ""}
            onChange={(e) => onChange("gpa", parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="major">Major</Label>
          <Input
            id="major"
            value={profile.major || ""}
            onChange={(e) => onChange("major", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desired_field">Desired Field</Label>
          <Input
            id="desired_field"
            value={profile.desired_field || ""}
            onChange={(e) => onChange("desired_field", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_country">Target Country</Label>
          <Input
            id="target_country"
            value={profile.target_country || ""}
            onChange={(e) => onChange("target_country", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            value={profile.nationality || ""}
            onChange={(e) => onChange("nationality", e.target.value)}
          />
        </div>
      </div>

      {/* Test Scores */}
      <div className="space-y-2">
        <Label>Test Scores</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <Label htmlFor="ielts" className="text-xs">
              IELTS
            </Label>
            <Input
              id="ielts"
              type="number"
              step="0.5"
              min="0"
              max="9"
              value={profile.test_scores?.ielts || ""}
              onChange={(e) =>
                onChange("test_scores", {
                  ...profile.test_scores,
                  ielts: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="toefl" className="text-xs">
              TOEFL
            </Label>
            <Input
              id="toefl"
              type="number"
              min="0"
              max="120"
              value={profile.test_scores?.toefl || ""}
              onChange={(e) =>
                onChange("test_scores", {
                  ...profile.test_scores,
                  toefl: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="gre" className="text-xs">
              GRE
            </Label>
            <Input
              id="gre"
              type="number"
              min="260"
              max="340"
              value={profile.test_scores?.gre || ""}
              onChange={(e) =>
                onChange("test_scores", {
                  ...profile.test_scores,
                  gre: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="gmat" className="text-xs">
              GMAT
            </Label>
            <Input
              id="gmat"
              type="number"
              min="200"
              max="800"
              value={profile.test_scores?.gmat || ""}
              onChange={(e) =>
                onChange("test_scores", {
                  ...profile.test_scores,
                  gmat: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          <Check className="h-4 w-4 mr-1" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// Inline mini profile card for chat
export function MiniProfileCard({
  profile,
  className,
}: {
  profile: StudentProfile;
  className?: string;
}) {
  const displayName = profile.name || profile.full_name || "Student";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border",
        className,
      )}
    >
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="text-sm">
        <p className="font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">
          {profile.major} • GPA: {profile.gpa?.toFixed(2) || "N/A"}
        </p>
      </div>
    </div>
  );
}
