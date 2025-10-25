"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { BookProject, Chapter, Section } from "@/types/book";
import {
  generateCoverPrompt,
  generateChapterPrompt,
  generateSectionPrompt,
  optimizePrompt,
} from "@/lib/images/promptGenerator";
import { saveMedia } from "@/lib/idb";

export type ImageContext = 
  | { type: "cover"; project: BookProject }
  | { type: "chapter"; chapter: Chapter; project: BookProject }
  | { type: "section"; section: Section; chapter: Chapter; project: BookProject };

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: ImageContext;
  onImageGenerated: (imageId: string) => void;
}

export function ImageGenerationModal({
  isOpen,
  onClose,
  context,
  onImageGenerated,
}: ImageGenerationModalProps) {
  const [step, setStep] = useState<"choose" | "prompt" | "upload" | "generating" | "preview">("choose");
  const [promptMode, setPromptMode] = useState<"manual" | "auto" | "upload">("auto");
  const [prompt, setPrompt] = useState("");
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasGeneratedPrompt, setHasGeneratedPrompt] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setPromptMode("auto");
      setPrompt("");
      setGeneratedImageId(null);
      setGeneratedImageUrl(null);
      setError(null);
      setIsGenerating(false);
      setHasGeneratedPrompt(false);
    }
  }, [isOpen]);

  // Generate auto prompt when user selects auto mode
  useEffect(() => {
    if (step === "prompt" && promptMode === "auto" && !prompt && !hasGeneratedPrompt) {
      generateAutoPrompt();
      setHasGeneratedPrompt(true);
    }
  }, [step, promptMode, hasGeneratedPrompt]);

  async function generateAutoPrompt() {
    setIsGenerating(true);
    setError(null);

    try {
      let requestBody: any = {
        type: context.type,
      };

      if (context.type === "cover") {
        requestBody = {
          type: "cover",
          title: context.project.meta.title,
          subtitle: context.project.meta.subtitle,
          genre: context.project.meta.genre,
          content: context.project.premise,
        };
      } else if (context.type === "chapter") {
        // Get full chapter content by combining all sections
        const fullContent = context.chapter.sections
          .map((s) => {
            const cleanContent = s.content
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            return `${s.title ? s.title + ": " : ""}${cleanContent}`;
          })
          .join("\n\n");

        requestBody = {
          type: "chapter",
          title: context.chapter.title,
          genre: context.project.meta.genre,
          content: context.chapter.synopsis || fullContent,
        };
      } else if (context.type === "section") {
        const cleanContent = context.section.content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        requestBody = {
          type: "section",
          title: context.section.title,
          genre: context.project.meta.genre,
          content: context.section.summary || cleanContent,
        };
      }

      const response = await fetch("/api/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to generate prompt");
      }

      const result = await response.json();
      setPrompt(result.prompt);
    } catch (err) {
      console.error("Auto prompt generation error:", err);
      // Fallback to local generation if API fails
      let fallbackPrompt = "";
      if (context.type === "cover") {
        fallbackPrompt = generateCoverPrompt(context.project);
      } else if (context.type === "chapter") {
        fallbackPrompt = generateChapterPrompt(context.chapter, context.project);
      } else if (context.type === "section") {
        fallbackPrompt = generateSectionPrompt(
          context.section,
          context.chapter,
          context.project
        );
      }
      setPrompt(fallbackPrompt);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleChooseMode(mode: "manual" | "auto" | "upload") {
    setPromptMode(mode);
    setPrompt(""); // Reset prompt
    setHasGeneratedPrompt(false); // Reset generation flag
    if (mode === "upload") {
      setStep("upload");
    } else {
      setStep("prompt");
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const mediaId = crypto.randomUUID();

      // Save to IndexedDB
      await saveMedia(mediaId, "image", file.type, arrayBuffer);

      // Create data URL for preview
      const blob = new Blob([arrayBuffer], { type: file.type });
      const dataUrl = URL.createObjectURL(blob);

      setGeneratedImageId(mediaId);
      setGeneratedImageUrl(dataUrl);
      setStep("preview");
    } catch (err) {
      console.error("Image upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerateImage() {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep("generating");

    try {
      const optimizedPrompt = optimizePrompt(prompt);
      
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "generate",
          prompt: optimizedPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate image");
      }

      const result = await response.json();
      const { mediaId, data, mime } = result;

      // Convert base64 to ArrayBuffer and save to IndexedDB
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await saveMedia(mediaId, "image", mime, bytes.buffer);

      // Create data URL for preview
      const blob = new Blob([bytes], { type: mime });
      const dataUrl = URL.createObjectURL(blob);

      setGeneratedImageId(mediaId);
      setGeneratedImageUrl(dataUrl);
      setStep("preview");
    } catch (err) {
      console.error("Image generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image");
      setStep("prompt");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAcceptImage() {
    if (generatedImageId) {
      onImageGenerated(generatedImageId);
      onClose();
    }
  }

  function handleRegenerate() {
    setStep("prompt");
    setGeneratedImageId(null);
    if (generatedImageUrl) {
      URL.revokeObjectURL(generatedImageUrl);
      setGeneratedImageUrl(null);
    }
  }

  function handleClose() {
    if (generatedImageUrl) {
      URL.revokeObjectURL(generatedImageUrl);
    }
    onClose();
  }

  if (!isOpen) return null;

  const contextTitle = 
    context.type === "cover" ? "Cover Image" :
    context.type === "chapter" ? `Chapter Image: ${context.chapter.title}` :
    `Section Image: ${context.section.title}`;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Generate {contextTitle}</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Choose Mode */}
          {step === "choose" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-6">
                How would you like to create the prompt for this image?
              </p>

              <button
                onClick={() => handleChooseMode("auto")}
                className="w-full p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-start gap-4">
                  <Sparkles className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <div className="font-semibold text-lg mb-2">
                      Auto-generate Prompt
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Let AI create a prompt based on your {context.type === "cover" ? "book details" : "content"}.
                      You can edit it before generating the image.
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChooseMode("manual")}
                className="w-full p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-start gap-4">
                  <ImageIcon className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <div className="font-semibold text-lg mb-2">
                      Write Your Own Prompt
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Create a custom prompt from scratch with full control over the image description.
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChooseMode("upload")}
                className="w-full p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-start gap-4">
                  <Upload className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <div className="font-semibold text-lg mb-2">
                      Upload Your Own Image
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Upload an existing image file from your computer (max 5MB).
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Edit Prompt */}
          {step === "prompt" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image Prompt
                  {promptMode === "auto" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (AI-generated, you can edit it)
                    </span>
                  )}
                </label>
                {isGenerating && !prompt ? (
                  <div className="flex items-center justify-center py-8 border border-border rounded-md bg-muted/20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Generating prompt...</span>
                  </div>
                ) : (
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[150px] font-mono text-sm"
                    placeholder="Describe the image you want to generate..."
                  />
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4">
                <button
                  onClick={() => setStep("choose")}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  {promptMode === "auto" && (
                    <button
                      onClick={() => {
                        setPrompt("");
                        setHasGeneratedPrompt(false);
                        generateAutoPrompt();
                      }}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      Regenerate Prompt
                    </button>
                  )}
                  <button
                    onClick={handleGenerateImage}
                    disabled={!prompt.trim() || isGenerating}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select an image file to upload (JPG, PNG, GIF, WebP)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-md cursor-pointer ${
                    isUploading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose File
                    </>
                  )}
                </label>
                <p className="text-xs text-muted-foreground mt-3">
                  Maximum file size: 5MB
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-start gap-3 pt-4">
                <button
                  onClick={() => setStep("choose")}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium mb-2">Generating your image...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments</p>
            </div>
          )}

          {/* Step 5: Preview */}
          {step === "preview" && generatedImageUrl && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <img
                  src={generatedImageUrl}
                  alt="Image preview"
                  className="w-full h-auto"
                />
              </div>

              {promptMode !== "upload" && prompt && (
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Prompt used:</p>
                  <p className="text-sm">{prompt}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4">
                {promptMode !== "upload" && (
                  <button
                    onClick={handleRegenerate}
                    className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
                  >
                    Edit & Regenerate
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAcceptImage}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Use This Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

