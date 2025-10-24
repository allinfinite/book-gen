"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";
import { streamGenerate } from "@/lib/ai/generateClient";
import { OutlineNode } from "@/types/book";
import { Sparkles, Loader2, Mic } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";

interface PremiseModalProps {
  projectId: string;
}

export function PremiseModal({ projectId }: PremiseModalProps) {
  const router = useRouter();
  const { currentProject, updatePremise, updateOutline } = useProjectStore();
  const isOnline = useUIStore((state) => state.isOnline);

  const [premise, setPremise] = useState(currentProject?.premise || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<OutlineNode[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateOutline() {
    if (!premise.trim() || !currentProject || !isOnline) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedOutline([]);

    let fullContent = "";

    try {
      await streamGenerate(
        {
          task: "outline",
          project: { ...currentProject, premise },
        },
        {
          onContent: (content) => {
            fullContent += content;
          },
          onComplete: () => {
            try {
              // Parse the JSON outline
              const parsed = JSON.parse(fullContent);
              if (Array.isArray(parsed)) {
                setGeneratedOutline(parsed);
                setError(null);
              } else {
                setError("Invalid outline format received");
              }
            } catch (e) {
              setError("Failed to parse outline");
            }
            setIsGenerating(false);
          },
          onError: (err) => {
            setError(err);
            setIsGenerating(false);
          },
        }
      );
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  }

  function handleSaveAndContinue() {
    if (!premise.trim()) {
      alert("Please enter a premise");
      return;
    }

    updatePremise(premise);

    if (generatedOutline.length > 0) {
      updateOutline(generatedOutline);
    }

    router.push(`/project/${projectId}`);
  }

  function handleSkip() {
    if (premise.trim()) {
      updatePremise(premise);
    }
    router.push(`/project/${projectId}`);
  }

  function handleVoiceTranscription(text: string) {
    setPremise((prev) => (prev ? prev + " " + text : text));
    setShowVoiceRecorder(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold mb-2">Book Premise</h2>
          <p className="text-sm text-muted-foreground">
            Describe your book idea. This will guide the AI in generating your
            outline.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Premise Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Your Book Idea</label>
              <button
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className="flex items-center gap-2 px-3 py-1 text-sm border border-input rounded-md hover:bg-accent"
              >
                <Mic className="w-4 h-4" />
                Voice Input
              </button>
            </div>
            <textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="Example: A detective in a futuristic city uncovers a conspiracy involving AI and must decide whether to expose the truth or protect those he loves..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
              rows={8}
            />
          </div>

          {/* Generate Outline Button */}
          <div>
            <button
              onClick={handleGenerateOutline}
              disabled={isGenerating || !premise.trim() || !isOnline}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Outline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate AI Outline</span>
                </>
              )}
            </button>
            {!isOnline && (
              <p className="text-xs text-destructive mt-2 text-center">
                Offline - AI outline generation unavailable
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Generated Outline Preview */}
          {generatedOutline.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border">
                <span className="text-sm font-medium">Generated Outline</span>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto bg-background">
                <OutlinePreview nodes={generatedOutline} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSaveAndContinue}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {generatedOutline.length > 0
                ? "Save Premise & Outline"
                : "Save Premise"}
            </button>
          </div>
        </div>
      </div>

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onTranscriptionComplete={handleVoiceTranscription}
          onError={(err) => setError(err)}
        />
      )}
    </div>
  );
}

function OutlinePreview({ nodes, depth = 0 }: { nodes: OutlineNode[]; depth?: number }) {
  return (
    <ul className={`space-y-2 ${depth > 0 ? "ml-6" : ""}`}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium capitalize text-muted-foreground">
              {node.type}:
            </span>
            <span className="text-sm">{node.title}</span>
          </div>
          {node.children && node.children.length > 0 && (
            <OutlinePreview nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
