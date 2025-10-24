"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import {
  DEFAULT_STYLE_PRESETS,
  AUDIENCE_OPTIONS,
  GENRE_OPTIONS,
} from "@/types/book";
import { X, Save } from "lucide-react";

interface BookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookSettingsModal({ isOpen, onClose }: BookSettingsModalProps) {
  const { currentProject, updateMeta, updateTargets, updateStylePreset } = useProjectStore();

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
    }
  }, [isOpen, currentProject]);

  if (!isOpen || !currentProject) return null;

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

        <div className="p-6 space-y-6">
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
    </div>
  );
}

