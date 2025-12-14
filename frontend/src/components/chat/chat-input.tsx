"use client";

import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Loader2,
  Mic,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  showFileUpload?: boolean;
  acceptedFileTypes?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  onFileSelect,
  disabled = false,
  isLoading = false,
  placeholder = "Type your message...",
  maxLength = 4000,
  showFileUpload = true,
  acceptedFileTypes = ".pdf,.doc,.docx",
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      adjustTextareaHeight();
    }
  };

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isLoading) {
      onSend(trimmedMessage);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [message, disabled, isLoading, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
    // Reset input
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const canSend = message.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className={cn("relative", className)}>
      {/* Selected file preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mb-2"
          >
            <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={handleRemoveFile}
                className="ml-1 p-0.5 rounded-full hover:bg-background transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-2xl border bg-background transition-all duration-200",
          isFocused
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {/* File upload button */}
        {showFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFileTypes}
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={triggerFileSelect}
              disabled={disabled || isLoading}
              className="h-10 w-10 rounded-xl ml-1 mb-1 flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground",
            "max-h-[150px] min-h-[44px]",
            !showFileUpload && "pl-4",
          )}
        />

        {/* Character counter (when near limit) */}
        {message.length > maxLength * 0.8 && (
          <div className="absolute top-2 right-14 text-xs text-muted-foreground">
            {message.length}/{maxLength}
          </div>
        )}

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl mr-1 mb-1 flex-shrink-0 transition-all",
            canSend
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Hint text */}
      <div className="flex items-center justify-between mt-1.5 px-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {showFileUpload && <span>Upload CV: PDF, DOC, DOCX</span>}
      </div>
    </div>
  );
}

// Simplified version for quick input
export function QuickChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Ask a question...",
  className,
}: Omit<ChatInputProps, "onFileSelect" | "showFileUpload">) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isLoading) {
      onSend(trimmed);
      setMessage("");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border bg-background px-4 py-2",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled || isLoading}
        size="sm"
        className="h-8 w-8 rounded-full p-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// Suggested prompts component
export function SuggestedPrompts({
  prompts,
  onSelect,
  className,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {prompts.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(prompt)}
          className="inline-flex items-center px-3 py-1.5 rounded-full border bg-background text-sm hover:bg-muted transition-colors"
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}
