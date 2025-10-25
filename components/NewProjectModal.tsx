"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/useUIStore";
import { useProjectStore } from "@/store/useProjectStore";
import {
  BookProject,
  BookMeta,
  DocumentRef,
  DEFAULT_STYLE_PRESETS,
  AUDIENCE_OPTIONS,
  GENRE_OPTIONS,
  STRUCTURE_OPTIONS,
} from "@/types/book";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { DocumentUpload } from "./DocumentUpload";

export function NewProjectModal() {
  const router = useRouter();
  const { showNewProjectModal, closeNewProjectModal } = useUIStore();
  const setProject = useProjectStore((state) => state.setProject);
  const save = useProjectStore((state) => state.save);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [genre, setGenre] = useState<string>("Fiction");
  const [audience, setAudience] = useState<string>("Adult");
  const [structure, setStructure] = useState<string>("3-Act");
  const [stylePresetId, setStylePresetId] = useState(
    DEFAULT_STYLE_PRESETS[0].id
  );
  const [minChapterWords, setMinChapterWords] = useState(2000);
  const [maxChapterWords, setMaxChapterWords] = useState(5000);
  const [minSectionWords, setMinSectionWords] = useState(500);
  const [maxSectionWords, setMaxSectionWords] = useState(1500);
  
  // Document management
  const [referenceDocuments, setReferenceDocuments] = useState<DocumentRef[]>([]);
  const [styleDocuments, setStyleDocuments] = useState<DocumentRef[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);

  if (!showNewProjectModal) return null;

  async function handleCreate() {
    if (!title.trim()) {
      alert("Please enter a project title");
      return;
    }

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const meta: BookMeta = {
      id: projectId,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      authorName: authorName.trim() || undefined,
      language: "en",
      genre: genre || undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const newProject: BookProject = {
      meta,
      premise: "",
      outline: [],
      chapters: [],
      targets: {
        audience,
        minChapterWords,
        maxChapterWords,
        minSectionWords,
        maxSectionWords,
      },
      stylePresetId,
      referenceDocuments: referenceDocuments.length > 0 ? referenceDocuments : undefined,
      styleDocuments: styleDocuments.length > 0 ? styleDocuments : undefined,
    };

    setProject(newProject);
    await save(); // Save to IndexedDB immediately
    closeNewProjectModal();
    router.push(`/project/${projectId}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">New Book Project</h2>
          <button
            onClick={closeNewProjectModal}
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Audience
              </label>
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
            </div>
          </div>

          {/* Structure & Style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Structure
              </label>
              <select
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                {STRUCTURE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Style Preset
              </label>
              <select
                value={stylePresetId}
                onChange={(e) => setStylePresetId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                {DEFAULT_STYLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Word Count Targets */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Word Count Targets
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Min Chapter Words
                </label>
                <input
                  type="number"
                  value={minChapterWords}
                  onChange={(e) =>
                    setMinChapterWords(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Max Chapter Words
                </label>
                <input
                  type="number"
                  value={maxChapterWords}
                  onChange={(e) =>
                    setMaxChapterWords(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Min Section Words
                </label>
                <input
                  type="number"
                  value={minSectionWords}
                  onChange={(e) =>
                    setMinSectionWords(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Max Section Words
                </label>
                <input
                  type="number"
                  value={maxSectionWords}
                  onChange={(e) =>
                    setMaxSectionWords(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
            </div>
          </div>

          {/* Documents Section (Optional) */}
          <div>
            <button
              type="button"
              onClick={() => setShowDocuments(!showDocuments)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <label className="block text-sm font-medium">
                  Documents (Optional)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload reference materials or writing style samples
                </p>
              </div>
              {showDocuments ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {showDocuments && (
              <div className="mt-4 space-y-6">
                <DocumentUpload
                  kind="reference"
                  documents={referenceDocuments}
                  projectId={undefined}
                  onAdd={(doc) => setReferenceDocuments([...referenceDocuments, doc])}
                  onRemove={(id) =>
                    setReferenceDocuments(referenceDocuments.filter((d) => d.id !== id))
                  }
                  onUpdate={(id, updates) =>
                    setReferenceDocuments(
                      referenceDocuments.map((d) => (d.id === id ? { ...d, ...updates } : d))
                    )
                  }
                />

                <DocumentUpload
                  kind="style"
                  documents={styleDocuments}
                  projectId={undefined}
                  onAdd={(doc) => setStyleDocuments([...styleDocuments, doc])}
                  onRemove={(id) =>
                    setStyleDocuments(styleDocuments.filter((d) => d.id !== id))
                  }
                  onUpdate={(id, updates) =>
                    setStyleDocuments(
                      styleDocuments.map((d) => (d.id === id ? { ...d, ...updates } : d))
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={closeNewProjectModal}
            className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
