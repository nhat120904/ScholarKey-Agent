"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NewChatButtonProps {
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  variant?: "default" | "outline" | "ghost" | "icon";
  className?: string;
}

export function NewChatButton({
  onClick,
  isLoading = false,
  variant = "default",
  className,
}: NewChatButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || isLoading) return;

    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  const isButtonLoading = loading || isLoading;

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isButtonLoading}
        className={cn("h-9 w-9", className)}
        title="New chat"
      >
        {isButtonLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant === "default" ? "default" : variant}
      size="sm"
      onClick={handleClick}
      disabled={isButtonLoading}
      className={cn("gap-1.5", className)}
    >
      {isButtonLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      New Chat
    </Button>
  );
}
