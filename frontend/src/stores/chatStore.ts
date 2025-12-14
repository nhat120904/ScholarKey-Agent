import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, AgentType } from "@/types/chat";
import { generateId } from "@/lib/utils";

interface ChatState {
  // State
  sessionId: string | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  currentAgent: AgentType | null;
  typingAgents: AgentType[];
  error: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentAgent: (agent: AgentType | null) => void;
  addTypingAgent: (agent: AgentType) => void;
  removeTypingAgent: (agent: AgentType) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;

  // Computed helpers
  getLastMessage: () => ChatMessage | undefined;
  getMessagesByAgent: (agent: AgentType) => ChatMessage[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      currentAgent: null,
      typingAgents: [],
      error: null,

      // Actions
      setSessionId: (id) => {
        // Also store directly in localStorage for axios interceptor
        if (typeof window !== "undefined") {
          if (id) {
            localStorage.setItem("session_id", id);
          } else {
            localStorage.removeItem("session_id");
          }
        }
        set({ sessionId: id });
      },

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg,
          ),
        }));
      },

      removeMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        }));
      },

      clearMessages: () => set({ messages: [] }),

      setConnected: (connected) => set({ isConnected: connected }),

      setLoading: (loading) => set({ isLoading: loading }),

      setCurrentAgent: (agent) => set({ currentAgent: agent }),

      addTypingAgent: (agent) => {
        set((state) => ({
          typingAgents: state.typingAgents.includes(agent)
            ? state.typingAgents
            : [...state.typingAgents, agent],
        }));
      },

      removeTypingAgent: (agent) => {
        set((state) => ({
          typingAgents: state.typingAgents.filter((a) => a !== agent),
        }));
      },

      setError: (error) => set({ error }),

      clearChat: () =>
        set({
          messages: [],
          currentAgent: null,
          typingAgents: [],
          error: null,
          isLoading: false,
        }),

      // Computed helpers
      getLastMessage: () => {
        const { messages } = get();
        return messages[messages.length - 1];
      },

      getMessagesByAgent: (agent) => {
        const { messages } = get();
        return messages.filter((msg) => msg.agent === agent);
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages.slice(-50), // Keep last 50 messages
      }),
    },
  ),
);

// Selector hooks for performance
export const useChatMessages = () => useChatStore((state) => state.messages);
export const useChatSessionId = () => useChatStore((state) => state.sessionId);
export const useChatLoading = () => useChatStore((state) => state.isLoading);
export const useChatConnected = () =>
  useChatStore((state) => state.isConnected);
export const useChatTyping = () => useChatStore((state) => state.typingAgents);
