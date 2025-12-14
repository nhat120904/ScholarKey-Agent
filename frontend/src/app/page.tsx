"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Send,
  Sparkles,
  Globe,
  Search,
  FileText,
  MessageCircle,
  Upload,
  ArrowRight,
} from "lucide-react";
import { MainNavbar } from "@/components/layout/main-navbar";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/sessionStore";
import { useChatStore } from "@/stores/chatStore";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Search,
    title: "Smart Scholarship Search",
    description: "AI-powered search across thousands of scholarships worldwide",
  },
  {
    icon: FileText,
    title: "CV Analysis",
    description:
      "Upload your CV and let our AI analyze your profile automatically",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Find opportunities in any country for any field of study",
  },
  {
    icon: Sparkles,
    title: "Personalized Matches",
    description: "Get scholarship recommendations tailored to your profile",
  },
];

const EXAMPLE_PROMPTS = [
  "Find scholarships for computer science students in Germany",
  "What scholarships are available for PhD students in the US?",
  "Show me fully funded masters programs in Europe",
  "Find scholarships for international students with GPA above 3.5",
];

export default function Home() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const createNewSession = useSessionStore((state) => state.createNewSession);
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
  const setSessionId = useChatStore((state) => state.setSessionId);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleSubmit = useCallback(
    async (message?: string) => {
      const text = message || inputValue.trim();
      if (!text || isLoading) return;

      setIsLoading(true);
      try {
        // Create a new session
        const sessionId = await createNewSession();
        setCurrentSession(sessionId);
        setSessionId(sessionId);

        // Navigate to the chat session with the query
        // The session page will handle sending the message
        router.push(`/chat/${sessionId}?q=${encodeURIComponent(text)}`);
      } catch (error) {
        console.error("Failed to start chat:", error);
        setIsLoading(false);
      }
    },
    [
      inputValue,
      isLoading,
      createNewSession,
      setCurrentSession,
      setSessionId,
      router,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavbar />

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Find Your Perfect{" "}
              <span className="text-primary">Scholarship</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ScholarKey uses AI to help you discover scholarships that match
              your profile. Upload your CV, chat with our agents, and find
              opportunities worldwide.
            </p>
          </motion.div>

          {/* Chat Input Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-2xl mx-auto mb-6"
          >
            <div className="relative bg-card border rounded-2xl shadow-lg overflow-hidden">
              <div className="flex items-end p-3 gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about scholarships, or describe your profile..."
                  className={cn(
                    "flex-1 resize-none bg-transparent border-0 outline-none",
                    "text-base placeholder:text-muted-foreground",
                    "min-h-[44px] max-h-[200px] py-3 px-2",
                  )}
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSubmit()}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 rounded-xl shrink-0"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 px-4 pb-3 border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-8"
                  onClick={() => router.push("/chat")}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload CV
                </Button>
                <div className="h-4 w-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span>
              </div>
            </div>
          </motion.div>

          {/* Example Prompts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto mb-12"
          >
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSubmit(prompt)}
                disabled={isLoading}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border",
                  "bg-background hover:bg-accent hover:text-accent-foreground",
                  "transition-colors cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="border-t bg-muted/30 py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">
              How ScholarKey Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="flex flex-col items-center text-center p-4"
                >
                  <div className="p-3 rounded-xl bg-primary/10 mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-8 px-4 text-center">
          <Button
            size="lg"
            onClick={() => router.push("/chat")}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Start Chatting
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
