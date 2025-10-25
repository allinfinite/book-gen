"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, Mic } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { streamGenerate } from "@/lib/ai/generateClient";
import { VoiceRecorder } from "./VoiceRecorder";
import { Section } from "@/types/book";

interface GenerateSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
}

interface SectionDraft {
  title: string;
  content: string;
}

export function GenerateSectionsModal({ isOpen, onClose, chapterId }: GenerateSectionsModalProps) {
  const { currentProject, updateChapter, save } = useProjectStore();
  const [brief, setBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSections, setGeneratedSections] = useState<SectionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [rawResponse, setRawResponse] = useState("");

  const chapter = currentProject?.chapters.find((ch) => ch.id === chapterId);

  if (!isOpen) return null;

  function handleClose() {
    if (isGenerating) return;
    setBrief("");
    setGeneratedSections([]);
    setError(null);
    setRawResponse("");
    setShowVoiceRecorder(false);
    onClose();
  }

  function handleVoiceTranscription(transcript: string) {
    setBrief((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }

  async function handleGenerateSections() {
    if (!currentProject || !chapter) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedSections([]);
    setRawResponse("");

    let fullContent = "";

    // Get reference documents that are enabled for generation
    const referenceDocuments = currentProject.referenceDocuments?.filter(
      (doc) => doc.includeInGeneration
    );

    try {
      await streamGenerate(
        {
          project: currentProject,
          task: "sections",
          targetId: chapterId,
          context: {
            chapterTitle: chapter.title,
            chapterSynopsis: chapter.synopsis || "",
            existingSections: chapter.sections.map((s) => s.title),
            userBrief: brief,
          },
          referenceDocuments,
        },
        {
          onChunk: (chunk) => {
            fullContent += chunk;
          },
          onComplete: () => {
          setRawResponse(fullContent);
          
          try {
            // Parse the structured JSON response
            const parsed = JSON.parse(fullContent.trim());
            
            // Extract sections from structured response
            if (parsed && parsed.sections && Array.isArray(parsed.sections)) {
              setGeneratedSections(parsed.sections);
              setError(null);
            } else {
              setError("Invalid format received from AI");
            }
          } catch (e) {
            console.error("Failed to parse sections:", e);
            console.error("Raw content:", fullContent);
            setError(`Failed to parse AI response: ${e instanceof Error ? e.message : "Unknown error"}`);
          }
          setIsGenerating(false);
        },
        onError: (err) => {
          console.error("Generation error:", err);
          setError(err || "Failed to generate sections");
          setIsGenerating(false);
        },
      });
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An error occurred");
      setIsGenerating(false);
    }
  }

  async function handleAcceptSections() {
    if (!chapter || generatedSections.length === 0) return;

    const newSections: Section[] = generatedSections.map((s) => ({
      id: crypto.randomUUID(),
      title: s.title,
      content: s.content,
    }));

    updateChapter(chapterId, {
      sections: newSections,
    });

    await save();
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Generate Sections
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {chapter ? `For chapter: ${chapter.title}` : ""}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-2 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
                {rawResponse && (
                  <button
                    onClick={() => {
                      console.log("Raw AI response:", rawResponse);
                      alert("Check browser console for raw AI response");
                    }}
                    className="text-xs underline"
                  >
                    Show raw response
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Section Brief (Optional)
              </label>
              <button
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                disabled={isGenerating}
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
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe what you want in these sections... (leave blank to use chapter synopsis)"
              className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
              rows={4}
              disabled={isGenerating}
            />
            
            <button
              onClick={handleGenerateSections}
              disabled={isGenerating}
              className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating sections...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Sections
                </>
              )}
            </button>
          </div>

          {/* Generated Sections Preview */}
          {generatedSections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">
                  Generated {generatedSections.length} Section{generatedSections.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b border-border">
                  <span className="text-sm font-medium">Sections with Content</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto bg-background space-y-4">
                  {generatedSections.map((section, idx) => (
                    <div key={idx} className="border border-border rounded-md p-4">
                      <h4 className="font-semibold text-lg mb-2">{section.title}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {section.content.substring(0, 300)}
                        {section.content.length > 300 && "..."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {section.content.split(/\s+/).filter(Boolean).length} words
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            This will replace all existing sections in this chapter
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            {generatedSections.length > 0 && (
              <button
                onClick={handleAcceptSections}
                className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Accept & Replace Sections
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

