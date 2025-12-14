"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/stores/chatStore";
import { useProfileStore } from "@/stores/profileStore";
import { apiClient } from "@/lib/api";
import { ChatWebSocket, type ConnectionStatus } from "@/lib/websocket";
import type { ChatMessage, ChatRequest, AgentType } from "@/types/chat";
import { generateId } from "@/lib/utils";

interface UseChatOptions {
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const queryClient = useQueryClient();
  const wsRef = useRef<ChatWebSocket | null>(null);
  const initializingRef = useRef(false);

  const {
    sessionId,
    messages,
    isLoading,
    isConnected,
    typingAgents,
    currentAgent,
    setSessionId,
    addMessage,
    updateMessage,
    setConnected,
    setLoading,
    setCurrentAgent,
    addTypingAgent,
    removeTypingAgent,
    setError,
    clearChat,
  } = useChatStore();

  const { setProfile, setHederaInfo } = useProfileStore();

  // Initialize session
  const initSession = useCallback(async () => {
    // Get current sessionId from store directly to avoid dependency issues
    const currentSessionId = useChatStore.getState().sessionId;
    if (currentSessionId) return currentSessionId;

    // Prevent concurrent initialization
    if (initializingRef.current) return null;
    initializingRef.current = true;

    try {
      const response = await apiClient.createSession();
      setSessionId(response.session_id);

      if (response.profile) {
        setProfile(response.profile);
      }
      if (response.hedera_info) {
        setHederaInfo(response.hedera_info);
      }

      return response.session_id;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    } finally {
      initializingRef.current = false;
    }
  }, [setSessionId, setProfile, setHederaInfo]);

  // WebSocket connection
  const connectWebSocket = useCallback(
    (sid: string) => {
      if (wsRef.current?.isConnected()) {
        return;
      }

      wsRef.current = new ChatWebSocket(sid, {
        onMessage: (message) => {
          addMessage({
            role: message.role,
            content: message.content,
            agent: message.agent,
          });
          options.onMessage?.(message);
        },
        onStreamChunk: (chunk) => {
          if (chunk.type === "chunk" && chunk.content) {
            // Handle streaming chunks
            const lastMessage = useChatStore.getState().getLastMessage();
            if (lastMessage?.isStreaming) {
              updateMessage(lastMessage.id, {
                content: lastMessage.content + chunk.content,
              });
            }
          }
        },
        onTyping: (agent, isTyping) => {
          if (isTyping) {
            addTypingAgent(agent);
          } else {
            removeTypingAgent(agent);
          }
        },
        onStatusChange: (status) => {
          setConnected(status === "connected");
          options.onStatusChange?.(status);
        },
        onError: (error) => {
          setError(error.message);
          options.onError?.(error);
        },
      });

      wsRef.current.connect();
    },
    [
      addMessage,
      updateMessage,
      addTypingAgent,
      removeTypingAgent,
      setConnected,
      setError,
      options,
    ],
  );

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, [setConnected]);

  // Send message mutation (HTTP fallback)
  const sendMessageMutation = useMutation({
    mutationFn: async (request: ChatRequest) => {
      return apiClient.chat(request);
    },
    onMutate: ({ message }) => {
      // Optimistically add user message
      addMessage({
        role: "user",
        content: message,
      });
      setLoading(true);
    },
    onSuccess: (response) => {
      // Add assistant response
      addMessage({
        role: "assistant",
        content: response.message,
        agent: response.agent,
        metadata: {
          messageType: response.message_type,
          suggestedActions: response.suggested_actions,
          data: response.data,
        },
      });

      // Handle profile updates if any
      if (response.profile_updates) {
        const currentProfile = useProfileStore.getState().profile;
        if (currentProfile) {
          setProfile({ ...currentProfile, ...response.profile_updates });
        }
      }

      setCurrentAgent(response.agent);
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (error: Error) => {
      setError(error.message);
      options.onError?.(error);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Send message function
  const sendMessage = useCallback(
    async (message: string) => {
      let sid = sessionId;
      if (!sid) {
        sid = await initSession();
        if (!sid) {
          throw new Error("Failed to initialize session");
        }
      }

      // Try WebSocket first, fallback to HTTP
      if (wsRef.current?.isConnected()) {
        addMessage({
          role: "user",
          content: message,
        });
        wsRef.current.send(message);
      } else {
        await sendMessageMutation.mutateAsync({
          message,
          session_id: sid,
        });
      }
    },
    [sessionId, initSession, addMessage, sendMessageMutation],
  );

  // Upload CV function
  const uploadCVMutation = useMutation({
    mutationFn: async (file: File) => {
      let sid = sessionId;
      if (!sid) {
        sid = await initSession();
        if (!sid) {
          throw new Error("Failed to initialize session for upload");
        }
      }
      return apiClient.uploadCV(sid, file);
    },
    onSuccess: (response) => {
      setProfile(response.profile);

      if (response.hedera_tx_id) {
        setHederaInfo({
          transaction_id: response.hedera_tx_id,
          topic_sequence_number: 0,
          verification_url: response.hedera_verification_url || "",
          topic_id: "",
          data_hash: "",
        });
      }

      // Add system message about CV upload
      addMessage({
        role: "assistant",
        content:
          "I've analyzed your CV and extracted your profile information. Let me know if you'd like to make any corrections.",
        agent: "profile",
        metadata: {
          messageType: "profile_card",
          data: response.profile,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (error: Error) => {
      setError(error.message);
      options.onError?.(error);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Auto-connect WebSocket when session is available
  useEffect(() => {
    if (sessionId && !wsRef.current?.isConnected()) {
      // connectWebSocket(sessionId);
      // Disabled by default - use HTTP for now
    }
  }, [sessionId, connectWebSocket]);

  // Load session history
  const loadSessionHistory = useCallback(
    async (sid: string) => {
      try {
        setLoading(true);

        // Clear existing messages
        clearChat();

        // Fetch session data
        const session = await apiClient.getSession(sid);
        setSessionId(sid);

        if (session.profile) {
          setProfile(session.profile);
        }
        if (session.hedera_info) {
          setHederaInfo(session.hedera_info);
        }

        // Fetch conversation history
        const history = await apiClient.getSessionHistory(sid);

        // Add messages from history
        history.messages.forEach((msg) => {
          addMessage({
            role: msg.role,
            content: msg.content,
            agent: msg.agent,
            metadata: msg.metadata,
          });
        });

        return session;
      } catch (error) {
        console.error("Failed to load session history:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      setSessionId,
      setProfile,
      setHederaInfo,
      addMessage,
      clearChat,
      setLoading,
    ],
  );

  return {
    // State
    sessionId,
    messages,
    isLoading:
      isLoading || sendMessageMutation.isPending || uploadCVMutation.isPending,
    isConnected,
    typingAgents,
    currentAgent,

    // Actions
    sendMessage,
    uploadCV: uploadCVMutation.mutateAsync,
    initSession,
    loadSessionHistory,
    connectWebSocket,
    disconnectWebSocket,
    clearChat,

    // Mutation states
    isSending: sendMessageMutation.isPending,
    isUploading: uploadCVMutation.isPending,
    sendError: sendMessageMutation.error,
    uploadError: uploadCVMutation.error,
  };
}
