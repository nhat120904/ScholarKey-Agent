// Chat-specific type definitions

// Agent type is a string since agents are defined by the backend API
export type AgentType = string;

export type MessageType =
  | "text"
  | "profile_card"
  | "analysis_panel"
  | "query_confirmation"
  | "scholarship_grid"
  | "plan_preview"
  | "loading"
  | "error";

export interface ChatMessageContent {
  type: MessageType;
  data: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | ChatMessageContent;
  agent?: AgentType;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: "file" | "image";
  name: string;
  data: string | File;
  mimeType?: string;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  agent: AgentType;
  message_type: MessageType;
  profile_updates?: Record<string, unknown>;
  suggested_actions: string[];
  data?: unknown;
}

export interface StreamingChatResponse {
  type: "chunk" | "complete" | "error";
  content?: string;
  agent?: AgentType;
  message_type?: MessageType;
  data?: unknown;
  error?: string;
}

// WebSocket message types
export interface WSMessage {
  type: "chat" | "status" | "typing" | "error";
  payload: unknown;
}

export interface WSChatPayload {
  message: string;
  session_id: string;
}

export interface WSTypingPayload {
  agent: AgentType;
  isTyping: boolean;
}

export interface WSStatusPayload {
  status: "connected" | "disconnected" | "reconnecting";
  session_id?: string;
}
