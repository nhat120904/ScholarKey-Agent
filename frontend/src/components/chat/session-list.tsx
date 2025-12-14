"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, PanelLeftClose, PanelLeft, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SessionItem } from "./session-item";
import {
  useSessionStore,
  useSessionsByDate,
  useSessionsLoading,
} from "@/stores/sessionStore";
import type { SessionSummary } from "@/stores/sessionStore";

interface SessionListProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function SessionList({
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: SessionListProps) {
  const fetchSessions = useSessionStore((state) => state.fetchSessions);
  const sessionsByDate = useSessionsByDate();
  const isLoading = useSessionsLoading();

  // Fetch sessions on mount - use ref to ensure it only runs once
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSessions();
  }, []);

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center py-4 px-2 border-r bg-muted/30",
          className,
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
          title="Expand sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="mb-2"
          title="New chat"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col w-64 border-r bg-muted/30 h-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onNewChat}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Today */}
            <SessionGroup
              title="Today"
              sessions={sessionsByDate.today}
              currentSessionId={currentSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              onRename={onRenameSession}
            />

            {/* Yesterday */}
            <SessionGroup
              title="Yesterday"
              sessions={sessionsByDate.yesterday}
              currentSessionId={currentSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              onRename={onRenameSession}
            />

            {/* Last 7 Days */}
            <SessionGroup
              title="Last 7 Days"
              sessions={sessionsByDate.lastWeek}
              currentSessionId={currentSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              onRename={onRenameSession}
            />

            {/* Older */}
            <SessionGroup
              title="Older"
              sessions={sessionsByDate.older}
              currentSessionId={currentSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              onRename={onRenameSession}
            />

            {/* Empty state */}
            {sessionsByDate.today.length === 0 &&
              sessionsByDate.yesterday.length === 0 &&
              sessionsByDate.lastWeek.length === 0 &&
              sessionsByDate.older.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a new chat to begin
                  </p>
                </div>
              )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Session group component
interface SessionGroupProps {
  title: string;
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string) => void;
}

function SessionGroup({
  title,
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
  onRename,
}: SessionGroupProps) {
  if (sessions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-2"
    >
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
        {sessions.map((session) => (
          <SessionItem
            key={session.session_id}
            session={session}
            isActive={session.session_id === currentSessionId}
            onSelect={() => onSelect(session.session_id)}
            onDelete={() => onDelete(session.session_id)}
            onRename={() => onRename(session.session_id)}
          />
        ))}
      </div>
    </motion.div>
  );
}
