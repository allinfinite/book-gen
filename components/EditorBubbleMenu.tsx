"use client";

import { Wand2, Sparkles } from "lucide-react";

interface EditorBubbleMenuProps {
  mode: "rewrite" | "generate" | null;
  onRewriteClick: () => void;
  onGenerateClick: () => void;
}

export function EditorBubbleMenu({
  mode,
  onRewriteClick,
  onGenerateClick,
}: EditorBubbleMenuProps) {
  if (!mode) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex gap-1">
        {mode === "rewrite" && (
          <button
            onClick={onRewriteClick}
            className="px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-1.5"
            title="Rewrite selected text"
          >
            <Wand2 className="w-4 h-4" />
            Rewrite
          </button>
        )}
        {mode === "generate" && (
          <button
            onClick={onGenerateClick}
            className="px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-1.5"
            title="Generate new text"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
        )}
      </div>
    </div>
  );
}

