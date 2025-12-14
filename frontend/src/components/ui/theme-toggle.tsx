"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "button" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className={className}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  if (variant === "button") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg",
          className,
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("light")}
          className={cn(
            "px-3",
            theme === "light" && "bg-white dark:bg-gray-700 shadow-sm",
          )}
        >
          <Sun className="h-4 w-4 mr-1" />
          Light
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("dark")}
          className={cn(
            "px-3",
            theme === "dark" && "bg-white dark:bg-gray-700 shadow-sm",
          )}
        >
          <Moon className="h-4 w-4 mr-1" />
          Dark
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("system")}
          className={cn(
            "px-3",
            theme === "system" && "bg-white dark:bg-gray-700 shadow-sm",
          )}
        >
          <Monitor className="h-4 w-4 mr-1" />
          System
        </Button>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={cn("relative group", className)}>
      <Button variant="ghost" size="icon">
        {resolvedTheme === "dark" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>

      <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="py-1">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              theme === "light" && "bg-gray-100 dark:bg-gray-700",
            )}
          >
            <Sun className="h-4 w-4" />
            Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              theme === "dark" && "bg-gray-100 dark:bg-gray-700",
            )}
          >
            <Moon className="h-4 w-4" />
            Dark
          </button>
          <button
            onClick={() => setTheme("system")}
            className={cn(
              "flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              theme === "system" && "bg-gray-100 dark:bg-gray-700",
            )}
          >
            <Monitor className="h-4 w-4" />
            System
          </button>
        </div>
      </div>
    </div>
  );
}
