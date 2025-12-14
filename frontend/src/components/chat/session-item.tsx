"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  User,
  GraduationCap,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionSummary } from "@/stores/sessionStore";

interface SessionItemProps {
  session: SessionSummary;
  isActive?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function SessionItem({
  session,
  isActive = false,
  onSelect,
  onDelete,
  onRename,
}: SessionItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleRename = () => {
    // Trigger the parent's rename handler which will open a dialog
    onRename();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "group relative mx-2 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 flex-shrink-0",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MessageCircle className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium truncate",
                isActive ? "text-primary" : "text-foreground",
              )}
            >
              {session.title || "New Conversation"}
            </span>
          </div>

          {/* Preview */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {session.preview || "No messages yet"}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(new Date(session.last_activity))}
            </span>
            {session.message_count > 0 && (
              <span className="text-xs text-muted-foreground">
                · {session.message_count} msg
                {session.message_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Badges */}
          {(session.has_profile || session.has_scholarships) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {session.has_profile && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                  <User className="h-3 w-3" />
                  Profile
                </span>
              )}
              {session.has_scholarships && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  <GraduationCap className="h-3 w-3" />
                  Scholarships
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div
          className={cn(
            "flex-shrink-0 transition-opacity",
            showMenu || isActive ? "opacity-100" : "opacity-0",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleRename();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="active-session"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
