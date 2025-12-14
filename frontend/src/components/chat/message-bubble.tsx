"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
} from "lucide-react";
import { cn, formatTime, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar, AgentIndicator } from "./agent-indicator";
import type { ChatMessage, AgentType, ChatMessageContent } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: ChatMessage;
  isLast?: boolean;
  showAvatar?: boolean;
  onRetry?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isLast = false,
  showAvatar = true,
  onRetry,
  onFeedback,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<
    "positive" | "negative" | null
  >(null);

  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const handleCopy = async () => {
    const contentText =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    const success = await copyToClipboard(contentText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedbackGiven(type);
    onFeedback?.(type);
  };

  if (isSystem) {
    const contentText =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center py-2"
      >
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {contentText}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className={cn("flex-shrink-0", isUser && "hidden sm:block")}>
          {isUser ? (
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">
                U
              </span>
            </div>
          ) : (
            <AgentAvatar agent={message.agent || "assistant"} />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col w-full",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Agent indicator for assistant messages */}
        {!isUser && message.agent && (
          <AgentIndicator
            agent={message.agent}
            size="sm"
            showLabel
            className="mb-1"
          />
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm max-w-[85%] sm:max-w-[75%]",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md",
            message.isStreaming && "animate-pulse",
          )}
        >
          {/* Message content with markdown support */}
          <MessageContent
            content={message.content}
            isStreaming={message.isStreaming}
          />

          {/* Timestamp */}
          <div
            className={cn(
              "text-[10px] mt-1 opacity-60",
              isUser ? "text-right" : "text-left",
            )}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>

        {/* Message actions */}
        {!isUser && !message.isStreaming && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
              isLast && "opacity-100",
            )}
          >
            <ActionButton
              icon={copied ? Check : Copy}
              onClick={handleCopy}
              tooltip={copied ? "Copied!" : "Copy"}
            />
            {onRetry && (
              <ActionButton
                icon={RefreshCw}
                onClick={onRetry}
                tooltip="Retry"
              />
            )}
            {onFeedback && (
              <>
                <ActionButton
                  icon={ThumbsUp}
                  onClick={() => handleFeedback("positive")}
                  active={feedbackGiven === "positive"}
                  tooltip="Helpful"
                />
                <ActionButton
                  icon={ThumbsDown}
                  onClick={() => handleFeedback("negative")}
                  active={feedbackGiven === "negative"}
                  tooltip="Not helpful"
                />
              </>
            )}
          </div>
        )}

        {/* Suggested actions */}
        {message.metadata?.suggestedActions &&
          Array.isArray(message.metadata.suggestedActions) &&
          message.metadata.suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.metadata.suggestedActions.map(
                (action: string, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {action}
                  </Button>
                ),
              )}
            </div>
          )}
      </div>
    </motion.div>
  );
});

// Message content with markdown rendering
function MessageContent({
  content,
  isStreaming,
}: {
  content: string | ChatMessageContent;
  isStreaming?: boolean;
}): React.ReactElement {
  // If content is not a string, render as JSON or special component
  if (typeof content !== "string") {
    return (
      <div className="text-xs font-mono bg-black/5 dark:bg-white/5 p-2 rounded">
        {JSON.stringify(content, null, 2)}
      </div>
    );
  }
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ node, ...props }: any) => (
            <h1 className="text-xl font-bold mt-3 mb-2 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }: any) => (
            <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }: any) => (
            <h3
              className="text-base font-semibold mt-2 mb-1.5 first:mt-0"
              {...props}
            />
          ),
          // Paragraphs
          p: ({ node, ...props }: any) => (
            <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
          ),
          // Lists
          ul: ({ node, ...props }: any) => (
            <ul className="space-y-1.5 my-2 pl-0" {...props} />
          ),
          ol: ({ node, ...props }: any) => (
            <ol className="space-y-1.5 my-2 pl-6" {...props} />
          ),
          li: ({ node, children, ...props }: any) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          // Code
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block bg-black/10 dark:bg-white/10 rounded-md p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }: any) => (
            <pre className="my-2 overflow-hidden" {...props} />
          ),
          // Strong/Bold
          strong: ({ node, ...props }: any) => (
            <strong className="font-bold text-foreground" {...props} />
          ),
          // Emphasis/Italic
          em: ({ node, ...props }: any) => <em className="italic" {...props} />,
          // Links
          a: ({ node, ...props }: any) => (
            <a
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Blockquote
          blockquote: ({ node, ...props }: any) => (
            <blockquote
              className="border-l-4 border-primary/30 pl-4 italic my-2"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
      )}
    </div>
  );
}

// Small action button for message actions
function ActionButton({
  icon: Icon,
  onClick,
  active = false,
  tooltip,
}: {
  icon: typeof Copy;
  onClick: () => void;
  active?: boolean;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        active && "text-primary bg-primary/10",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// Loading message skeleton
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div
        className={cn(
          "flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser ? "bg-primary/20 rounded-tr-md" : "bg-muted rounded-tl-md",
          )}
        >
          <div className="space-y-2">
            <div className="h-3 w-48 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
