"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";
import { streamGenerate } from "@/lib/ai/generateClient";
import { OutlineNode, Chapter } from "@/types/book";
import { Sparkles, Loader2, Mic, X } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";

interface GenerateOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateOutlineModal({ isOpen, onClose }: GenerateOutlineModalProps) {
  const { currentProject, addChapter } = useProjectStore();
  const isOnline = useUIStore((state) => state.isOnline);

  const [brief, setBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<OutlineNode[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string>("");

  if (!isOpen) return null;

  async function handleGenerateOutline() {
    if (!brief.trim() || !currentProject || !isOnline) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedOutline([]);
    setRawResponse("");

    let fullContent = "";

    // Get reference documents that are enabled for generation
    const referenceDocuments = currentProject.referenceDocuments?.filter(
      (doc) => doc.includeInGeneration
    );

    try {
      await streamGenerate(
        {
          task: "outline",
          project: currentProject,
          userBrief: brief,
          referenceDocuments,
        },
        {
          onContent: (content) => {
            fullContent += content;
          },
          onComplete: () => {
            setRawResponse(fullContent); // Store raw response for debugging
            
            try {
              // Parse the structured JSON response
              const parsed = JSON.parse(fullContent.trim());
              
              // Extract outline from structured response
              if (parsed && parsed.outline && Array.isArray(parsed.outline)) {
                setGeneratedOutline(parsed.outline);
                setError(null);
              } else {
                setError("Invalid outline format received from AI");
              }
            } catch (e) {
              console.error("Failed to parse outline:", e);
              console.error("Raw content:", fullContent);
              setError(`Failed to parse outline: ${e instanceof Error ? e.message : "Unknown error"}`);
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

  function convertOutlineToChapters(outline: OutlineNode[]): Chapter[] {
    const chapters: Chapter[] = [];

    function processNode(node: OutlineNode) {
      if (node.type === "chapter") {
        // Create a chapter with sections from children
        const sections = (node.children || [])
          .filter(child => child.type === "section")
          .map(section => ({
            id: crypto.randomUUID(),
            title: section.title,
            content: "",
          }));

        // If no sections, add a default one
        if (sections.length === 0) {
          sections.push({
            id: crypto.randomUUID(),
            title: "Opening",
            content: "",
          });
        }

        chapters.push({
          id: crypto.randomUUID(),
          title: node.title,
          synopsis: "",
          sections,
          status: "outline",
          notes: "",
        });
      } else if (node.type === "part" && node.children) {
        // Process children of parts
        node.children.forEach(processNode);
      }
    }

    outline.forEach(processNode);
    return chapters;
  }

  function handleAcceptOutline() {
    if (generatedOutline.length === 0) return;

    const chapters = convertOutlineToChapters(generatedOutline);
    
    // Add all chapters to the project
    chapters.forEach(chapter => addChapter(chapter));

    // Close modal
    handleClose();
  }

  function handleClose() {
    setBrief("");
    setGeneratedOutline([]);
    setError(null);
    setRawResponse("");
    setShowVoiceRecorder(false);
    onClose();
  }

  function handleVoiceTranscription(text: string) {
    setBrief((prev) => {
      if (prev.trim()) {
        return prev + "\n\n" + text;
      }
      return text;
    });
    setShowVoiceRecorder(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold mb-1">Generate Book Outline</h2>
            <p className="text-sm text-muted-foreground">
              Create chapter and section titles only - you'll write the content later
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Brief Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                What chapters should your book have?
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
                  onError={(err) => setError(err)}
                />
              </div>
            )}

            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Example: A 10-chapter mystery novel where each chapter reveals a new clue, building to a surprising conclusion in chapter 10..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
              rows={6}
              disabled={isGenerating || !isOnline}
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 This creates chapter structure only (titles and sections). You'll write the actual content yourself.
            </p>
          </div>

          {/* Generate Button */}
          {brief.trim() && !isGenerating && generatedOutline.length === 0 && (
            <button
              onClick={handleGenerateOutline}
              disabled={!isOnline}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              Generate Chapter Structure
            </button>
          )}

          {!isOnline && (
            <p className="text-xs text-destructive text-center">
              Offline - AI generation unavailable
            </p>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Creating chapter structure...</p>
                <p className="text-sm text-muted-foreground">
                  Generating titles only - no content
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="space-y-2">
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
              {rawResponse && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show raw AI response (for debugging)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto max-h-60 overflow-y-auto">
                    {rawResponse}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Generated Outline Preview */}
          {generatedOutline.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Generated Outline ({
                  countChapters(generatedOutline)
                } chapters) - Empty chapters ready for writing</span>
              </div>
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium">Chapter & Section Structure</span>
                  <span className="text-xs text-muted-foreground">Content will be empty</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto bg-background">
                  <OutlinePreview nodes={generatedOutline} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          {generatedOutline.length > 0 && (
            <button
              onClick={handleAcceptOutline}
              className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Add {countChapters(generatedOutline)} Chapters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function countChapters(outline: OutlineNode[]): number {
  let count = 0;
  
  function processNode(node: OutlineNode) {
    if (node.type === "chapter") {
      count++;
    } else if (node.children) {
      node.children.forEach(processNode);
    }
  }
  
  outline.forEach(processNode);
  return count;
}

function OutlinePreview({ nodes, depth = 0 }: { nodes: OutlineNode[]; depth?: number }) {
  return (
    <ul className={`space-y-2 ${depth > 0 ? "ml-6" : ""}`}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-start gap-2">
            <span className={`text-sm font-medium capitalize ${
              node.type === "chapter" ? "text-primary" : "text-muted-foreground"
            }`}>
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

