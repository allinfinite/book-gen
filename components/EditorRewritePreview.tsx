"use client";

import { Check, X, Loader2 } from "lucide-react";

interface EditorRewritePreviewProps {
  isGenerating: boolean;
  generatedText: string;
  onAccept: () => void;
  onReject: () => void;
  error?: string;
}

export function EditorRewritePreview({
  isGenerating,
  generatedText,
  onAccept,
  onReject,
  error,
}: EditorRewritePreviewProps) {
  if (!isGenerating && !generatedText && !error) {
    return null;
  }

  return (
    <div className="my-4 border-l-4 border-primary bg-card p-4 rounded-r-md shadow-lg animate-in fade-in slide-in-from-top-2">
      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </div>
      )}
      
      {error && (
        <div className="space-y-3">
          <div className="text-sm text-destructive">{error}</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {!isGenerating && generatedText && !error && (
        <div className="space-y-3">
          <div className="text-sm whitespace-pre-wrap bg-accent/50 p-3 rounded border border-border">{generatedText}</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors flex items-center gap-1.5"
              title="Reject and keep original"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1.5"
              title="Accept and replace"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

