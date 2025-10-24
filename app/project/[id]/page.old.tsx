"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";
import { Chapter } from "@/types/book";
import { Book, Plus, Save, ArrowLeft, FileDown } from "lucide-react";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    currentProject,
    isLoading,
    lastSaved,
    loadProject,
    addChapter,
    updateChapter,
    save,
  } = useProjectStore();

  const {
    selectedChapterId,
    setSelectedChapter,
    selectedSectionId,
    setSelectedSection,
  } = useUIStore();

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    if (selectedChapterId && currentProject) {
      const chapter = currentProject.chapters.find(
        (ch) => ch.id === selectedChapterId
      );
      if (chapter) {
        setChapterTitle(chapter.title);
        // Combine all section content for simple editing
        setChapterContent(
          chapter.sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n")
        );
      }
    }
  }, [selectedChapterId, currentProject]);

  async function handleAddChapter() {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: "Untitled Chapter",
      synopsis: "",
      sections: [
        {
          id: crypto.randomUUID(),
          title: "Section 1",
          content: "",
        },
      ],
      status: "outline",
      notes: "",
    };
    addChapter(newChapter);
    setSelectedChapter(newChapter.id);
  }

  async function handleSaveChapter() {
    if (!selectedChapterId || !currentProject) return;

    setIsSaving(true);
    const chapter = currentProject.chapters.find(
      (ch) => ch.id === selectedChapterId
    );
    if (!chapter) return;

    // Parse content into sections (simple implementation)
    const sections = chapterContent
      .split(/\n## /)
      .filter((s) => s.trim())
      .map((sectionText, idx) => {
        const [titleLine, ...contentLines] = sectionText.split("\n");
        return {
          id: chapter.sections[idx]?.id || crypto.randomUUID(),
          title: titleLine.replace(/^## /, "").trim() || `Section ${idx + 1}`,
          content: contentLines.join("\n").trim(),
        };
      });

    updateChapter(selectedChapterId, {
      title: chapterTitle,
      sections: sections.length > 0 ? sections : chapter.sections,
      status: "draft",
    });

    await save();
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg mb-4">Project not found</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Book className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{currentProject.meta.title}</h1>
              {currentProject.meta.subtitle && (
                <p className="text-sm text-muted-foreground">
                  {currentProject.meta.subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-sm text-muted-foreground">
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleSaveChapter}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => router.push("/export")}
              className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chapter List */}
        <aside className="w-64 border-r border-border overflow-y-auto bg-card">
          <div className="p-4">
            <button
              onClick={handleAddChapter}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mb-4"
            >
              <Plus className="w-4 h-4" />
              Add Chapter
            </button>

            <div className="space-y-2">
              {currentProject.chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chapters yet
                </p>
              ) : (
                currentProject.chapters.map((chapter, idx) => (
                  <div
                    key={chapter.id}
                    onClick={() => setSelectedChapter(chapter.id)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedChapterId === chapter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="text-sm font-medium">
                      Chapter {idx + 1}: {chapter.title}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {chapter.sections.length} sections • {chapter.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          {selectedChapterId ? (
            <div className="max-w-4xl mx-auto p-8">
              <div className="mb-6">
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full text-3xl font-bold bg-transparent border-none outline-none mb-2"
                  placeholder="Chapter Title"
                />
                <div className="h-px bg-border"></div>
              </div>

              <textarea
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                className="w-full min-h-[600px] bg-transparent border border-input rounded-md p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Start writing your chapter... Use ## for section headings."
              />

              <div className="mt-4 text-sm text-muted-foreground">
                Word count: {chapterContent.split(/\s+/).filter(Boolean).length}
                {currentProject.targets.minChapterWords && (
                  <span className="ml-4">
                    Target: {currentProject.targets.minChapterWords}–
                    {currentProject.targets.maxChapterWords} words
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Book className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a chapter or create a new one to start writing</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
