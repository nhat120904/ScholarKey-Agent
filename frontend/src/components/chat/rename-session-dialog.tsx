"use client";

import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SessionSummary } from "@/stores/sessionStore";

interface RenameSessionDialogProps {
  session: SessionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newTitle: string) => void | Promise<void>;
}

export function RenameSessionDialog({
  session,
  open,
  onOpenChange,
  onConfirm,
}: RenameSessionDialogProps) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset title when dialog opens with a new session
  useEffect(() => {
    if (open && session) {
      setTitle(session.title || "");
      setError(null);
    }
  }, [open, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a name");
      return;
    }

    if (title.trim() === session?.title) {
      onOpenChange(false);
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onConfirm(title.trim());
      onOpenChange(false);
    } catch (err) {
      setError("Failed to rename conversation");
      console.error("Failed to rename session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Rename Conversation
            </DialogTitle>
            <DialogDescription>
              Give this conversation a meaningful name to help you find it
              later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-name" className="text-muted-foreground">
                Current name
              </Label>
              <p id="current-name" className="text-sm font-medium">
                {session.title || "New Conversation"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">New name</Label>
              <Input
                id="new-name"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder="Enter conversation name..."
                autoFocus
                maxLength={100}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                {title.length}/100 characters
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
