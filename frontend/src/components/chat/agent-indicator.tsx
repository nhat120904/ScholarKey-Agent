"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Search,
  Brain,
  Bot,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgents } from "@/hooks";
import type { AgentInfo } from "@/lib/api";

interface AgentIndicatorProps {
  agent: string;
  isTyping?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Map color names from backend to Tailwind classes
const colorStyles: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-200 dark:border-purple-800",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  gray: {
    text: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-800",
  },
};

// Map agent IDs to icons (frontend-only concern)
const agentIcons: Record<string, LucideIcon> = {
  profile: User,
  search: Search,
  supervisor: Brain,
  plan: Sparkles,
};

// Get styles for an agent
function getAgentStyles(agent: AgentInfo | undefined) {
  const color = agent?.color || "gray";
  const styles = colorStyles[color] || colorStyles.gray;
  const Icon = agentIcons[agent?.id || ""] || Bot;

  return {
    label: agent?.label || "Agent",
    description: agent?.description || "Processing",
    Icon,
    textColor: styles.text,
    bgColor: styles.bg,
    borderColor: styles.border,
  };
}

const sizeConfig = {
  sm: {
    container: "h-6 px-2 gap-1.5 text-xs",
    icon: "h-3.5 w-3.5",
    dot: "h-1.5 w-1.5",
  },
  md: {
    container: "h-8 px-3 gap-2 text-sm",
    icon: "h-4 w-4",
    dot: "h-2 w-2",
  },
  lg: {
    container: "h-10 px-4 gap-2.5 text-base",
    icon: "h-5 w-5",
    dot: "h-2.5 w-2.5",
  },
};

export function AgentIndicator({
  agent,
  isTyping = false,
  showLabel = true,
  size = "md",
  className,
}: AgentIndicatorProps) {
  const { agents } = useAgents();
  const agentInfo = agents.find((a) => a.id === agent);
  const { label, description, Icon, textColor, bgColor, borderColor } =
    getAgentStyles(agentInfo);
  const sizes = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        bgColor,
        borderColor,
        textColor,
        sizes.container,
        className,
      )}
    >
      <Icon className={sizes.icon} />

      {showLabel && (
        <span className="truncate">{isTyping ? description : label}</span>
      )}

      {isTyping && (
        <div className="flex items-center gap-0.5 ml-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={cn("rounded-full bg-current", sizes.dot)}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Typing indicator for chat
export function TypingIndicator({
  agents,
  className,
}: {
  agents: string[];
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {agents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn("flex items-center gap-2 py-2", className)}
        >
          {agents.map((agent) => (
            <AgentIndicator key={agent} agent={agent} isTyping size="sm" />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Agent avatar for message bubbles
export function AgentAvatar({
  agent,
  size = "md",
  className,
}: {
  agent: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { agents } = useAgents();
  const agentInfo = agents.find((a) => a.id === agent);
  const { Icon, textColor, bgColor } = getAgentStyles(agentInfo);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        bgColor,
        textColor,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}

// Agent selector for switching between agents
export function AgentSelector({
  selectedAgent,
  onSelect,
  className,
}: {
  selectedAgent?: string;
  onSelect: (agent: string) => void;
  className?: string;
}) {
  const { agents, isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {agents.map((agentInfo) => {
        const { label, Icon, textColor, bgColor, borderColor } =
          getAgentStyles(agentInfo);
        const isSelected = selectedAgent === agentInfo.id;

        return (
          <motion.button
            key={agentInfo.id}
            onClick={() => onSelect(agentInfo.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
              isSelected
                ? cn(bgColor, textColor, "border", borderColor)
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
