"use client";

import { Suspense, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MainNavbar } from "@/components/layout/main-navbar";
import { ChatContainer } from "@/components/chat";
import { SessionList } from "@/components/chat/session-list";
import { DeleteSessionDialog } from "@/components/chat/delete-session-dialog";
import { RenameSessionDialog } from "@/components/chat/rename-session-dialog";
import { useChat } from "@/hooks/useChat";
import { useProfileStore } from "@/stores/profileStore";
import { useSearchStore } from "@/stores/searchStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useChatStore } from "@/stores/chatStore";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { SessionSummary } from "@/stores/sessionStore";

// Wrapper component for Suspense boundary (required for useSearchParams)
export default function ChatSessionPage() {
  return (
    <Suspense fallback={<ChatSessionPageLoading />}>
      <ChatSessionPageContent />
    </Suspense>
  );
}

function ChatSessionPageLoading() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <MainNavbar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

function ChatSessionPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const sessionId = params.session_id as string;
  const initialQuery = searchParams.get("q");

  // Session management state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionSummary | null>(
    null,
  );
  const [sessionToRename, setSessionToRename] = useState<SessionSummary | null>(
    null,
  );
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Session store
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
  const deleteSessionAction = useSessionStore((state) => state.deleteSession);
  const renameSessionAction = useSessionStore((state) => state.renameSession);
  const createNewSession = useSessionStore((state) => state.createNewSession);
  const getSessionById = useSessionStore((state) => state.getSessionById);

  // Chat store
  const chatSessionId = useChatStore((state) => state.sessionId);
  const setSessionIdChat = useChatStore((state) => state.setSessionId);
  const clearMessages = useChatStore((state) => state.clearMessages);

  const {
    messages,
    isLoading,
    typingAgents,
    sendMessage,
    uploadCV,
    loadSessionHistory,
    isUploading,
  } = useChat({
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { profile, setProfile, hederaInfo } = useProfileStore();
  const { scholarships, selectedScholarshipIds, toggleScholarshipSelection } =
    useSearchStore();

  // Track if we've loaded this specific session
  const loadedSessionRef = useRef<string | null>(null);
  const sentInitialQueryRef = useRef(false);
  // Store sendMessage in a ref to avoid dependency issues
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Load session when URL changes
  useEffect(() => {
    // Skip if we've already loaded this session
    if (!sessionId || loadedSessionRef.current === sessionId) return;

    // Mark this session as being loaded immediately to prevent re-runs
    loadedSessionRef.current = sessionId;

    const loadSession = async () => {
      setIsLoadingSession(true);
      try {
        // Set the session ID in session store
        setCurrentSession(sessionId);

        // Load the session history (this will set chat store's sessionId internally)
        if (loadSessionHistory) {
          await loadSessionHistory(sessionId);
        } else {
          // If no loadSessionHistory, at least set the chat store sessionId
          setSessionIdChat(sessionId);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        loadedSessionRef.current = null; // Reset on error to allow retry
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive",
        });
        // Redirect to main chat page if session not found
        router.push("/chat");
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [sessionId]); // Only depend on sessionId

  // Send initial query from URL if present (from home page)
  useEffect(() => {
    if (initialQuery && !sentInitialQueryRef.current && !isLoadingSession) {
      sentInitialQueryRef.current = true;
      // Remove the query param from URL without navigation
      router.replace(`/chat/${sessionId}`, { scroll: false });
      // Send the message using ref to avoid dependency issues
      sendMessageRef.current(initialQuery);
    }
  }, [initialQuery, isLoadingSession, sessionId, router]);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleFileSelect = async (file: File) => {
    try {
      await uploadCV(file);
      toast({
        title: "CV Uploaded",
        description: "Your CV has been analyzed successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = (updates: Partial<typeof profile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates } as typeof profile);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated.",
      });
    }
  };

  const handleSaveScholarship = (id: string) => {
    const wasSaved = selectedScholarshipIds.has(id);
    toggleScholarshipSelection(id);
    toast({
      title: wasSaved ? "Removed from Saved" : "Saved",
      description: wasSaved
        ? "Scholarship removed from your saved list."
        : "Scholarship added to your saved list.",
    });
  };

  const handleSelectScholarship = (scholarship: unknown) => {
    console.log("Selected scholarship:", scholarship);
  };

  // Session management handlers
  const handleSelectSession = useCallback(
    (selectedSessionId: string) => {
      if (selectedSessionId !== sessionId) {
        router.push(`/chat/${selectedSessionId}`);
      }
    },
    [sessionId, router],
  );

  const handleNewChat = useCallback(async () => {
    try {
      const newSessionId = await createNewSession();
      clearMessages();
      router.push(`/chat/${newSessionId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    }
  }, [createNewSession, clearMessages, router, toast]);

  const handleDeleteSession = useCallback(
    (deleteSessionId: string) => {
      const session = getSessionById(deleteSessionId);
      if (session) {
        setSessionToDelete(session);
      }
    },
    [getSessionById],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!sessionToDelete) return;

    try {
      const deletingCurrentSession = sessionToDelete.session_id === sessionId;
      await deleteSessionAction(sessionToDelete.session_id);

      toast({
        title: "Deleted",
        description: "Conversation has been deleted.",
      });

      // If deleting current session, navigate to main chat
      if (deletingCurrentSession) {
        router.push("/chat");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }

    setSessionToDelete(null);
  }, [sessionToDelete, sessionId, deleteSessionAction, router, toast]);

  const handleRenameSession = useCallback(
    (renameSessionId: string) => {
      const session = getSessionById(renameSessionId);
      if (session) {
        setSessionToRename(session);
      }
    },
    [getSessionById],
  );

  const handleConfirmRename = useCallback(
    async (newTitle: string) => {
      if (!sessionToRename) return;

      try {
        await renameSessionAction(sessionToRename.session_id, newTitle);

        toast({
          title: "Renamed",
          description: "Conversation has been renamed.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to rename conversation",
          variant: "destructive",
        });
      }

      setSessionToRename(null);
    },
    [sessionToRename, renameSessionAction, toast],
  );

  if (isLoadingSession) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <MainNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Navbar */}
      <MainNavbar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Session sidebar */}
        <SessionList
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Chat area */}
        <main className="flex-1 relative">
          <ChatContainer
            messages={messages}
            isLoading={isLoading || isUploading}
            typingAgents={typingAgents}
            profile={profile}
            scholarships={scholarships}
            onSendMessage={handleSendMessage}
            onFileSelect={handleFileSelect}
            onUpdateProfile={handleUpdateProfile}
            onSaveScholarship={handleSaveScholarship}
            onSelectScholarship={handleSelectScholarship}
            savedScholarshipIds={Array.from(selectedScholarshipIds)}
          />
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteSessionDialog
        session={sessionToDelete}
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Rename dialog */}
      <RenameSessionDialog
        session={sessionToRename}
        open={!!sessionToRename}
        onOpenChange={(open) => !open && setSessionToRename(null)}
        onConfirm={handleConfirmRename}
      />
    </div>
  );
}
