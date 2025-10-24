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
    const newPremise = text; // Use transcription as the premise directly
    setPremise(newPremise);
    setShowVoiceRecorder(false);

    // Automatically generate outline from voice transcription
    if (newPremise.trim() && currentProject && isOnline) {
      // Wait a moment for state to update, then generate
      setTimeout(() => {
        handleGenerateOutlineFromPremise(newPremise);
      }, 100);
    }
  }

  async function handleGenerateOutlineFromPremise(premiseText: string) {
    setIsGenerating(true);
    setError(null);
    setGeneratedOutline([]);

    let fullContent = "";

    try {
      await streamGenerate(
        {
          task: "outline",
          project: { ...currentProject!, premise: premiseText },
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

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold mb-2">📚 Create Your Book</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Let's start by creating an outline for your book. You have two options:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
              <span className="text-lg">🎤</span>
              <div>
                <div className="font-medium">Voice Input (Recommended)</div>
                <div className="text-xs text-muted-foreground">
                  Click "Voice Input" and describe your book idea out loud
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
              <span className="text-lg">⌨️</span>
              <div>
                <div className="font-medium">Type Your Idea</div>
                <div className="text-xs text-muted-foreground">
                  Write your book concept in the text area below
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Premise Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </span>
                  Your Book Idea
                </span>
              </label>
              <button
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                  showVoiceRecorder
                    ? "bg-primary text-primary-foreground"
                    : "border border-primary text-primary hover:bg-primary/10"
                }`}
              >
                <Mic className="w-4 h-4" />
                {showVoiceRecorder ? "Hide Voice Recorder" : "🎤 Use Voice Input"}
              </button>
            </div>
            {!showVoiceRecorder && (
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="Example: A detective in a futuristic city uncovers a conspiracy involving AI and must decide whether to expose the truth or protect those he loves..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
                rows={8}
              />
            )}
          </div>

          {/* Generate Outline Button */}
          {premise.trim() && !isGenerating && generatedOutline.length === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-medium">Generate Your Outline</span>
              </div>
              <button
                onClick={handleGenerateOutline}
                disabled={isGenerating || !premise.trim() || !isOnline}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
              >
                <Sparkles className="w-5 h-5" />
                <span>✨ Generate AI Outline from Your Idea</span>
              </button>
              {!isOnline && (
                <p className="text-xs text-destructive mt-2 text-center">
                  Offline - AI outline generation unavailable
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                The AI will create a detailed chapter outline based on your book idea
              </p>
            </div>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Creating your book outline...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Generated Outline Preview */}
          {generatedOutline.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold">
                  ✓
                </span>
                <span className="text-sm font-medium">Your Book Outline is Ready!</span>
              </div>
              <div className="border border-green-500/30 rounded-md overflow-hidden bg-green-50/50 dark:bg-green-950/20">
                <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 border-b border-green-500/30">
                  <span className="text-sm font-medium">Generated Chapter Outline</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto bg-background">
                  <OutlinePreview nodes={generatedOutline} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Review your outline above, then click "Save & Continue" to start writing
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Skip (I'll add chapters manually)
          </button>
          <button
            onClick={handleSaveAndContinue}
            disabled={!premise.trim()}
            className="px-8 py-3 text-base font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generatedOutline.length > 0 ? (
              <>
                <span>📝 Save & Start Writing</span>
                <span className="text-xs opacity-75">→</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <span className="text-xs opacity-75">→</span>
              </>
            )}
          </button>
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
