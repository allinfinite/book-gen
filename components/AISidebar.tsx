"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";
import { streamGenerate } from "@/lib/ai/generateClient";
import { Sparkles, Loader2, X, Wand2, Mic, Square } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";

interface AISidebarProps {
  chapterId: string;
  sectionId: string | null;
  onContentGenerated?: (content: string) => void;
}

export function AISidebar({ chapterId, sectionId, onContentGenerated }: AISidebarProps) {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateChapter = useProjectStore((state) => state.updateChapter);
  const isOnline = useUIStore((state) => state.isOnline);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(
    null
  );
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  function handleVoiceTranscription(text: string) {
    // Append or set the transcribed text to the prompt
    setUserPrompt((prev) => {
      if (prev.trim()) {
        return prev + "\n\n" + text;
      }
      return text;
    });
    setShowVoiceRecorder(false);
  }

  async function handleGenerateSection() {
    if (!currentProject || !isOnline || !sectionId) return;

    const chapter = currentProject.chapters.find((ch) => ch.id === chapterId);
    const section = chapter?.sections.find((s) => s.id === sectionId);
    if (!chapter || !section) return;

    setIsGenerating(true);
    setGeneratedContent("");
    setError(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await streamGenerate(
        {
          task: "section_draft",
          project: currentProject,
          targetId: chapterId,
          userBrief: `${section.title}\n${userPrompt}`,
        },
        {
          onContent: (content) => {
            setGeneratedContent((prev) => prev + content);
          },
          onComplete: () => {
            setIsGenerating(false);
            setAbortController(null);
          },
          onError: (err) => {
            setError(err);
            setIsGenerating(false);
            setAbortController(null);
          },
          signal: controller.signal,
        }
      );
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      setAbortController(null);
    }
  }

  function handleCancelGeneration() {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
    }
  }

  function handleAcceptContent() {
    if (!currentProject || !generatedContent || !sectionId) return;

    // Simply pass the generated content to the parent for insertion
    onContentGenerated?.(generatedContent);

    setGeneratedContent("");
    setUserPrompt("");
  }

  function handleRejectContent() {
    setGeneratedContent("");
  }

  const chapter = currentProject?.chapters.find((ch) => ch.id === chapterId);
  const section = chapter?.sections.find((s) => s.id === sectionId);

  return (
    <aside className="w-96 border-l border-border bg-card overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        {!isOnline && (
          <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            Offline - AI features disabled
          </div>
        )}
      </div>

      {!sectionId ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a section to generate AI content</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Current Section Info */}
          {section && (
            <div className="p-3 bg-muted/50 rounded-md border border-border">
              <div className="text-xs text-muted-foreground mb-1">Generating for:</div>
              <div className="font-medium text-sm">{section.title}</div>
            </div>
          )}

          {/* User Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Section Brief
              </label>
            <button
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              disabled={isGenerating || !isOnline}
              className={`flex items-center gap-1 px-2 py-1 text-xs border border-input rounded hover:bg-accent disabled:opacity-50 ${
                showVoiceRecorder ? "bg-accent" : ""
              }`}
            >
              <Mic className="w-3 h-3" />
              {showVoiceRecorder ? "Hide" : "Voice"}
            </button>
          </div>
          
          {showVoiceRecorder && (
            <div className="mb-3 p-3 border border-primary/20 bg-primary/5 rounded-md">
              <VoiceRecorder
                inline={true}
                onTranscriptionComplete={handleVoiceTranscription}
                onError={(err) => console.error("Voice error:", err)}
              />
            </div>
          )}
          
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Describe what you want in this section... (type or use voice)"
            className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
            rows={6}
            disabled={isGenerating || !isOnline}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateSection}
          disabled={isGenerating || !isOnline}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate Section</span>
            </>
          )}
        </button>

        {/* Cancel Button */}
        {isGenerating && (
          <button
            onClick={handleCancelGeneration}
            className="w-full px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Generated Content</span>
              <button
                onClick={handleRejectContent}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto bg-background">
              <pre className="text-xs whitespace-pre-wrap font-sans">
                {generatedContent}
              </pre>
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <button
                onClick={handleAcceptContent}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Accept & Replace
              </button>
              <button
                onClick={handleRejectContent}
                className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Section Info */}
        {section && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Section Info</h4>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Word Count:</dt>
                <dd className="font-medium">
                  {section.content.split(/\s+/).filter(Boolean).length}
                </dd>
              </div>
              {currentProject?.targets.minSectionWords && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Target:</dt>
                  <dd className="font-medium">
                    {currentProject.targets.minSectionWords}–
                    {currentProject.targets.maxSectionWords} words
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
        </div>
      )}
    </aside>
  );
}
