"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, Upload, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageBubble, MessageSkeleton } from "./message-bubble";
import { ChatInput, SuggestedPrompts } from "./chat-input";
import { TypingIndicator } from "./agent-indicator";
import { ProfileCard } from "./profile-card";
import { ScholarshipList } from "./scholarship-card";
import type { ChatMessage, AgentType } from "@/types/chat";
import type { StudentProfile, Scholarship } from "@/types";

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  typingAgents?: AgentType[];
  profile?: StudentProfile | null;
  scholarships?: Scholarship[];
  onSendMessage: (message: string) => void;
  onFileSelect?: (file: File) => void;
  onUpdateProfile?: (updates: Partial<StudentProfile>) => void;
  onSaveScholarship?: (id: string) => void;
  onSelectScholarship?: (scholarship: Scholarship) => void;
  savedScholarshipIds?: string[];
  className?: string;
}

const welcomePrompts = [
  "Find scholarships for Master's in Computer Science",
  "What scholarships am I eligible for?",
  "Help me find funding for studying in Germany",
  "Show me scholarships with GPA requirement below 3.5",
];

export function ChatContainer({
  messages,
  isLoading = false,
  typingAgents = [],
  profile,
  scholarships,
  onSendMessage,
  onFileSelect,
  onUpdateProfile,
  onSaveScholarship,
  onSelectScholarship,
  savedScholarshipIds = [],
  className,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setIsAutoScrolling(true);
  }, []);

  // Handle scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isNearBottom);
    setIsAutoScrolling(isNearBottom);
  }, []);

  // Auto-scroll on new messages if user is at bottom
  useEffect(() => {
    if (isAutoScrolling) {
      scrollToBottom("smooth");
    }
  }, [messages, isAutoScrolling, scrollToBottom]);

  // Check for special message types that need inline rendering
  const renderMessage = (message: ChatMessage, index: number) => {
    const isLast = index === messages.length - 1;

    // Check for profile data
    if (
      message.metadata?.messageType === "profile_card" &&
      message.metadata.data
    ) {
      return (
        <div key={message.id} className="space-y-3">
          <MessageBubble message={message} isLast={isLast} />
          <ProfileCard
            profile={message.metadata.data as StudentProfile}
            editable={!!onUpdateProfile}
            onUpdate={onUpdateProfile}
            compact
            className="ml-11 max-w-lg"
          />
        </div>
      );
    }

    // Check for scholarship results
    if (
      message.metadata?.messageType === "scholarship_results" &&
      Array.isArray(message.metadata.data)
    ) {
      return (
        <div key={message.id} className="space-y-3">
          <MessageBubble message={message} isLast={isLast} />
          <div className="ml-11 max-w-xl">
            <ScholarshipList
              scholarships={message.metadata.data as Scholarship[]}
              onSave={onSaveScholarship}
              onSelect={onSelectScholarship}
              savedIds={savedScholarshipIds}
            />
          </div>
        </div>
      );
    }

    return <MessageBubble key={message.id} message={message} isLast={isLast} />;
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {hasMessages ? (
          <>
            {messages.map((message, index) => renderMessage(message, index))}

            {/* Typing indicator */}
            {typingAgents.length > 0 && (
              <TypingIndicator agents={typingAgents} />
            )}

            {/* Loading skeleton */}
            {isLoading && typingAgents.length === 0 && <MessageSkeleton />}

            <div ref={messagesEndRef} />
          </>
        ) : (
          <WelcomeScreen
            onSelectPrompt={onSendMessage}
            onUploadCV={onFileSelect}
            profile={profile}
          />
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => scrollToBottom()}
              className="rounded-full shadow-lg"
            >
              <ArrowDown className="h-4 w-4 mr-1" />
              New messages
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t bg-background/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={onSendMessage}
            onFileSelect={onFileSelect}
            isLoading={isLoading}
            showFileUpload={!!onFileSelect}
            placeholder={
              profile
                ? "Ask about scholarships or refine your search..."
                : "Upload your CV or describe your profile..."
            }
          />
        </div>
      </div>
    </div>
  );
}

// Welcome screen component
function WelcomeScreen({
  onSelectPrompt,
  onUploadCV,
  profile,
}: {
  onSelectPrompt: (prompt: string) => void;
  onUploadCV?: (file: File) => void;
  profile?: StudentProfile | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Logo/Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="mb-6"
      >
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl">
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold mb-3"
      >
        Welcome to ScholarKey
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-lg mb-8 max-w-md"
      >
        Your AI-powered scholarship finder. Upload your CV or tell me about
        yourself to get personalized recommendations.
      </motion.p>

      {/* Upload CV button */}
      {onUploadCV && !profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadCV(file);
            }}
            className="hidden"
          />
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 px-6"
          >
            <Upload className="h-5 w-5" />
            Upload Your CV
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PDF, DOC, or DOCX up to 10MB
          </p>
        </motion.div>
      )}

      {/* Profile indicator */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <ProfileCard profile={profile} compact />
        </motion.div>
      )}

      {/* Suggested prompts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xl"
      >
        <p className="text-sm text-muted-foreground mb-3">
          Or try one of these:
        </p>
        <SuggestedPrompts
          prompts={welcomePrompts}
          onSelect={onSelectPrompt}
          className="justify-center"
        />
      </motion.div>
    </div>
  );
}

// Chat sidebar for additional context
export function ChatSidebar({
  profile,
  scholarships,
  onUpdateProfile,
  onSelectScholarship,
  className,
}: {
  profile?: StudentProfile | null;
  scholarships?: Scholarship[];
  onUpdateProfile?: (updates: Partial<StudentProfile>) => void;
  onSelectScholarship?: (scholarship: Scholarship) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-80 border-l bg-muted/30 p-4 hidden lg:block overflow-y-auto",
        className,
      )}
    >
      <div className="space-y-6">
        {/* Profile section */}
        {profile && (
          <div>
            <h3 className="text-sm font-medium mb-3">Your Profile</h3>
            <ProfileCard
              profile={profile}
              editable={!!onUpdateProfile}
              onUpdate={onUpdateProfile}
            />
          </div>
        )}

        {/* Recent scholarships */}
        {scholarships && scholarships.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Found Scholarships</h3>
            <ScholarshipList
              scholarships={scholarships.slice(0, 5)}
              onSelect={onSelectScholarship}
            />
            {scholarships.length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{scholarships.length - 5} more scholarships
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
