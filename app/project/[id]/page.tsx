"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIStore } from "@/store/useUIStore";
import { Chapter } from "@/types/book";
import { ChapterEditor } from "@/components/ChapterEditor";
import { AISidebar } from "@/components/AISidebar";
import { GenerateOutlineModal } from "@/components/GenerateOutlineModal";
import { BookSettingsModal } from "@/components/BookSettingsModal";
import { Book, Plus, Save, ArrowLeft, FileDown, Trash2, Sparkles, ChevronDown, Settings, ChevronRight } from "lucide-react";

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
    deleteChapter,
    deleteProject,
    save,
  } = useProjectStore();

  const {
    selectedChapterId,
    setSelectedChapter,
    showAISidebar,
    toggleAISidebar,
  } = useUIStore();

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAddChapterMenu, setShowAddChapterMenu] = useState(false);
  const [showGenerateOutlineModal, setShowGenerateOutlineModal] = useState(false);
  const [showBookSettings, setShowBookSettings] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

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
        // Combine all section content
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
          title: "Opening",
          content: "",
        },
      ],
      status: "outline",
      notes: "",
    };
    addChapter(newChapter);
    setSelectedChapter(newChapter.id);
  }

  function handleGenerateOutline() {
    setShowGenerateOutlineModal(true);
    setShowAddChapterMenu(false);
  }

  function toggleChapterExpansion(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  function scrollToSection(sectionTitle: string) {
    // Find the section heading in the editor and scroll to it
    const editorElement = document.querySelector('.chapter-editor');
    if (!editorElement) return;
    
    const headings = editorElement.querySelectorAll('h2, h3');
    for (const heading of headings) {
      if (heading.textContent?.includes(sectionTitle)) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }

  async function handleSaveChapter() {
    if (!selectedChapterId || !currentProject) return;

    setIsSaving(true);
    const chapter = currentProject.chapters.find(
      (ch) => ch.id === selectedChapterId
    );
    if (!chapter) return;

    // Parse content into sections
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

    const wordCount = chapterContent.split(/\s+/).filter(Boolean).length;

    updateChapter(selectedChapterId, {
      title: chapterTitle,
      sections: sections.length > 0 ? sections : chapter.sections,
      status: "draft",
      wordCount,
    });

    await save();
    setIsSaving(false);
  }


  async function handleDeleteChapter(chapterId: string) {
    if (!confirm("Are you sure you want to delete this chapter? This action cannot be undone.")) {
      return;
    }

    deleteChapter(chapterId);
    await save();

    // If we deleted the currently selected chapter, clear selection
    if (selectedChapterId === chapterId) {
      setSelectedChapter(null);
    }
  }

  async function handleDeleteProject() {
    if (!currentProject) return;

    if (!confirm(`Are you sure you want to delete "${currentProject.meta.title}"? This action cannot be undone.`)) {
      return;
    }

    await deleteProject(currentProject.meta.id);
    router.push("/");
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

  const wordCount = chapterContent.split(/\s+/).filter(Boolean).length;
  const isInRange =
    currentProject.targets.minChapterWords &&
    currentProject.targets.maxChapterWords
      ? wordCount >= currentProject.targets.minChapterWords &&
        wordCount <= currentProject.targets.maxChapterWords
      : true;

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
            <button
              onClick={() => setShowBookSettings(true)}
              className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent"
              title="Book Settings"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={toggleAISidebar}
              className={`flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent ${
                showAISidebar ? "bg-accent" : ""
              }`}
              title="Toggle AI Assistant"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
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
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chapter List */}
        <aside className="w-64 border-r border-border overflow-y-auto bg-card">
          <div className="p-4">
            {/* Add Chapter Button with Dropdown */}
            <div className="relative mb-4">
              <div className="flex gap-1">
                <button
                  onClick={handleAddChapter}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-l-md hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add Chapter
                </button>
                <button
                  onClick={() => setShowAddChapterMenu(!showAddChapterMenu)}
                  className="px-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 border-l border-primary-foreground/20"
                  title="More options"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              
              {/* Dropdown Menu */}
              {showAddChapterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAddChapterMenu(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        handleAddChapter();
                        setShowAddChapterMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent text-left text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Empty Chapter</div>
                        <div className="text-xs text-muted-foreground">Write from scratch</div>
                      </div>
                    </button>
                    <button
                      onClick={handleGenerateOutline}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent text-left text-sm border-t border-border"
                    >
                      <Sparkles className="w-4 h-4" />
                      <div>
                        <div className="font-medium">AI Generated Outline</div>
                        <div className="text-xs text-muted-foreground">Create chapter structure (titles only)</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              {currentProject.chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chapters yet
                </p>
              ) : (
                currentProject.chapters.map((chapter, idx) => {
                  const isExpanded = expandedChapters.has(chapter.id);
                  const isSelected = selectedChapterId === chapter.id;
                  
                  return (
                    <div key={chapter.id} className="space-y-1">
                      <div
                        className={`rounded-md transition-colors relative group ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <div className="flex items-start gap-1 p-3 pr-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChapterExpansion(chapter.id);
                            }}
                            className="p-0.5 hover:bg-background/10 rounded transition-colors mt-0.5"
                            title={isExpanded ? "Collapse sections" : "Expand sections"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div
                            onClick={() => setSelectedChapter(chapter.id)}
                            className="cursor-pointer flex-1"
                          >
                            <div className="text-sm font-medium">
                              Chapter {idx + 1}: {chapter.title}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {chapter.sections.length} sections • {chapter.status}
                            </div>
                            {chapter.wordCount && (
                              <div className="text-xs opacity-75 mt-1">
                                {chapter.wordCount} words
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(chapter.id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                          title="Delete chapter"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                      
                      {/* Nested Sections */}
                      {isExpanded && chapter.sections.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {chapter.sections.map((section, sectionIdx) => (
                            <button
                              key={section.id}
                              onClick={() => {
                                setSelectedChapter(chapter.id);
                                setTimeout(() => scrollToSection(section.title), 100);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                isSelected
                                  ? "bg-primary/20 hover:bg-primary/30"
                                  : "bg-muted/50 hover:bg-muted"
                              }`}
                            >
                              <div className="font-medium">{section.title}</div>
                              {section.content && (
                                <div className="text-muted-foreground mt-0.5">
                                  {section.content.split(/\s+/).length} words
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
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

              <ChapterEditor
                content={chapterContent}
                onChange={setChapterContent}
                placeholder="Start writing your chapter... Use ## for section headings."
              />

              <div className="mt-4 flex items-center justify-between text-sm">
                <span
                  className={`${
                    isInRange ? "text-muted-foreground" : "text-destructive"
                  }`}
                >
                  Word count: {wordCount}
                  {currentProject.targets.minChapterWords && (
                    <span className="ml-2">
                      (Target: {currentProject.targets.minChapterWords}–
                      {currentProject.targets.maxChapterWords})
                    </span>
                  )}
                </span>
                {!isInRange && (
                  <span className="text-destructive">⚠ Outside target range</span>
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

        {/* AI Sidebar */}
        {showAISidebar && selectedChapterId && (
          <AISidebar chapterId={selectedChapterId} />
        )}
      </div>

      {/* Generate Outline Modal */}
      <GenerateOutlineModal
        isOpen={showGenerateOutlineModal}
        onClose={() => setShowGenerateOutlineModal(false)}
      />

      {/* Book Settings Modal */}
      <BookSettingsModal
        isOpen={showBookSettings}
        onClose={() => setShowBookSettings(false)}
      />
    </div>
  );
}
