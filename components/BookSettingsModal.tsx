"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import {
  DEFAULT_STYLE_PRESETS,
  AUDIENCE_OPTIONS,
  GENRE_OPTIONS,
  DocumentRef,
} from "@/types/book";
import { X, Save, Sparkles, Image as ImageIcon, Trash2 } from "lucide-react";
import { DocumentUpload } from "./DocumentUpload";
import { analyzeWritingStyle } from "@/lib/ai/styleAnalyzer";
import { ImageGenerationModal } from "./ImageGenerationModal";
import { getMediaAsDataURL } from "@/lib/idb";

interface BookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookSettingsModal({ isOpen, onClose }: BookSettingsModalProps) {
  const {
    currentProject,
    updateMeta,
    updateTargets,
    updateStylePreset,
    addDocument,
    removeDocument,
    updateDocument,
    setCustomStyleAnalysis,
    updateCoverImage,
  } = useProjectStore();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [genre, setGenre] = useState("");
  const [audience, setAudience] = useState("");
  const [stylePresetId, setStylePresetId] = useState("");
  const [minChapterWords, setMinChapterWords] = useState(2000);
  const [maxChapterWords, setMaxChapterWords] = useState(5000);
  const [minSectionWords, setMinSectionWords] = useState(500);
  const [maxSectionWords, setMaxSectionWords] = useState(1500);
  
  // Active tab and analysis state
  const [activeTab, setActiveTab] = useState<"general" | "style" | "documents">("general");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>("");
  
  // Image generation state
  const [showImageModal, setShowImageModal] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Load current values when modal opens
  useEffect(() => {
    if (isOpen && currentProject) {
      setTitle(currentProject.meta.title);
      setSubtitle(currentProject.meta.subtitle || "");
      setAuthorName(currentProject.meta.authorName || "");
      setGenre(currentProject.meta.genre || "Fiction");
      setAudience(currentProject.targets.audience);
      setStylePresetId(currentProject.stylePresetId);
      setMinChapterWords(currentProject.targets.minChapterWords || 2000);
      setMaxChapterWords(currentProject.targets.maxChapterWords || 5000);
      setMinSectionWords(currentProject.targets.minSectionWords || 500);
      setMaxSectionWords(currentProject.targets.maxSectionWords || 1500);
      
      // Load cover image if exists
      if (currentProject.coverImageId) {
        getMediaAsDataURL(currentProject.coverImageId).then((url) => {
          if (url) setCoverImageUrl(url);
        });
      } else {
        setCoverImageUrl(null);
      }
    }
  }, [isOpen, currentProject]);

  if (!isOpen || !currentProject) return null;

  const referenceDocuments = currentProject.referenceDocuments || [];
  const styleDocuments = currentProject.styleDocuments || [];
  const hasStyleAnalysis = !!currentProject.customStyleAnalysis;

  async function handleAnalyzeStyle() {
    if (styleDocuments.length === 0) {
      setAnalysisError("Please upload at least one writing sample to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const texts = styleDocuments.map((doc) => doc.extractedText);
      const docIds = styleDocuments.map((doc) => doc.id);
      
      const analysis = await analyzeWritingStyle(texts, docIds);
      setCustomStyleAnalysis(analysis);
      
      // Auto-select the custom style preset
      updateStylePreset("custom-from-uploads");
      setStylePresetId("custom-from-uploads");
      
      alert("Style analysis complete! The custom style preset has been applied.");
    } catch (error) {
      console.error("Style analysis error:", error);
      setAnalysisError(
        error instanceof Error ? error.message : "Failed to analyze style"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSave() {
    // Update metadata
    updateMeta({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      authorName: authorName.trim() || undefined,
      genre: genre || undefined,
    });

    // Update targets
    updateTargets({
      audience,
      minChapterWords,
      maxChapterWords,
      minSectionWords,
      maxSectionWords,
    });

    // Update style preset
    updateStylePreset(stylePresetId);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Book Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "style"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Style & Targets
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Documents
            {(referenceDocuments.length + styleDocuments.length > 0) && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {referenceDocuments.length + styleDocuments.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="Optional subtitle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="Your name"
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div className="border-t border-border pt-6">
                <label className="block text-sm font-medium mb-3">
                  Cover Image
                </label>
                
                {coverImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={coverImageUrl}
                        alt="Book cover"
                        className="max-h-48 rounded-lg border border-border"
                      />
                      <button
                        onClick={() => {
                          updateCoverImage(undefined);
                          setCoverImageUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                        title="Remove cover image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Replace Cover Image
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Generate Cover Image
                  </button>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  AI-generated cover image for your book
                </p>
              </div>

              {/* Genre & Audience */}
              <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Used in AI generation prompts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Affects writing style and complexity
              </p>
            </div>
          </div>
            </div>
          )}

          {/* Style & Targets Tab */}
          {activeTab === "style" && (
            <div className="space-y-6">
              {/* Style Preset */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Writing Style Lock
                </label>
                <div className="space-y-3">
                  {DEFAULT_STYLE_PRESETS.map((preset) => (
                    <label
                      key={preset.id}
                      className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${
                        stylePresetId === preset.id
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="style"
                        value={preset.id}
                        checked={stylePresetId === preset.id}
                        onChange={(e) => setStylePresetId(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          POV: {preset.pov} | Tense: {preset.tense}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {preset.voice}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Style lock is enforced in all AI-generated content
                </p>
              </div>

              {/* Word Count Targets */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Word Count Targets
                </label>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-2">
                      Chapter Words
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Min</label>
                        <input
                          type="number"
                          value={minChapterWords}
                          onChange={(e) => setMinChapterWords(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          min="0"
                          step="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Max</label>
                        <input
                          type="number"
                          value={maxChapterWords}
                          onChange={(e) => setMaxChapterWords(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          min="0"
                          step="100"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-2">
                      Section Words
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Min</label>
                        <input
                          type="number"
                          value={minSectionWords}
                          onChange={(e) => setMinSectionWords(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          min="0"
                          step="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Max</label>
                        <input
                          type="number"
                          value={maxSectionWords}
                          onChange={(e) => setMaxSectionWords(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  AI will aim for these targets when generating content
                </p>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <DocumentUpload
                kind="reference"
                documents={referenceDocuments}
                projectId={currentProject.meta.id}
                onAdd={(doc) => addDocument(doc, "reference")}
                onRemove={(id) => removeDocument(id, "reference")}
                onUpdate={(id, updates) => updateDocument(id, updates, "reference")}
              />

              <div className="border-t border-border pt-6">
                <DocumentUpload
                  kind="style"
                  documents={styleDocuments}
                  projectId={currentProject.meta.id}
                  onAdd={(doc) => addDocument(doc, "style")}
                  onRemove={(id) => removeDocument(id, "style")}
                  onUpdate={(id, updates) => updateDocument(id, updates, "style")}
                />

                {/* Style Analysis */}
                {styleDocuments.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-1">
                          AI Style Analysis
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          {hasStyleAnalysis
                            ? "Your writing style has been analyzed and is ready to use."
                            : "Analyze your uploaded writing samples to create a custom style preset."}
                        </p>
                        {analysisError && (
                          <p className="text-xs text-destructive mb-2">
                            {analysisError}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleAnalyzeStyle}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          isAnalyzing
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isAnalyzing
                          ? "Analyzing..."
                          : hasStyleAnalysis
                          ? "Re-analyze"
                          : "Analyze Style"}
                      </button>
                    </div>
                    {hasStyleAnalysis && currentProject.customStyleAnalysis && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">
                          Detected Characteristics:
                        </p>
                        <div className="space-y-1 text-xs">
                          <p>
                            <span className="font-medium">POV:</span>{" "}
                            {currentProject.customStyleAnalysis.analysis.pov}
                          </p>
                          <p>
                            <span className="font-medium">Tense:</span>{" "}
                            {currentProject.customStyleAnalysis.analysis.tense}
                          </p>
                          <p>
                            <span className="font-medium">Voice:</span>{" "}
                            {currentProject.customStyleAnalysis.analysis.voice}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Image Generation Modal */}
      {currentProject && (
        <ImageGenerationModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          context={{ type: "cover", project: currentProject }}
          onImageGenerated={(imageId) => {
            updateCoverImage(imageId);
            // Reload the image preview
            getMediaAsDataURL(imageId).then((url) => {
              if (url) setCoverImageUrl(url);
            });
          }}
        />
      )}
    </div>
  );
}

