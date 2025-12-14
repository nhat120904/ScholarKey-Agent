"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import type { SessionSummary } from "@/stores/sessionStore";

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Session management state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionSummary | null>(
    null,
  );
  const [sessionToRename, setSessionToRename] = useState<SessionSummary | null>(
    null,
  );

  // Session store
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
  const deleteSessionAction = useSessionStore((state) => state.deleteSession);
  const renameSessionAction = useSessionStore((state) => state.renameSession);
  const createNewSession = useSessionStore((state) => state.createNewSession);
  const getSessionById = useSessionStore((state) => state.getSessionById);

  // Chat store
  const clearMessages = useChatStore((state) => state.clearMessages);

  const {
    sessionId,
    messages,
    isLoading,
    typingAgents,
    sendMessage,
    uploadCV,
    initSession,
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

  // Initialize session on mount - only run once
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const sid = await initSession();
      if (sid) {
        setCurrentSession(sid);
      }
    };
    init().catch(console.error);
  }, []); // Empty deps - only run on mount

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
    toggleScholarshipSelection(id);
    const isSaved = selectedScholarshipIds.has(id);
    toast({
      title: isSaved ? "Removed from Saved" : "Saved",
      description: isSaved
        ? "Scholarship removed from your saved list."
        : "Scholarship added to your saved list.",
    });
  };

  const handleSelectScholarship = (scholarship: unknown) => {
    // Open scholarship detail modal or navigate
    console.log("Selected scholarship:", scholarship);
  };

  // Session management handlers
  const handleSelectSession = useCallback(
    (selectedSessionId: string) => {
      router.push(`/chat/${selectedSessionId}`);
    },
    [router],
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

      // If deleting current session, clear and stay on main chat
      if (deletingCurrentSession) {
        clearMessages();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }

    setSessionToDelete(null);
  }, [sessionToDelete, sessionId, deleteSessionAction, clearMessages, toast]);

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
