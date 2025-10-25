import { create } from "zustand";
import { BookProject, Chapter, Section, OutlineNode, ChangeRecord, DocumentRef, CustomStyleAnalysis, MediaRef } from "@/types/book";
import { saveProject, getProject, createSnapshot, deleteProject as deleteProjectFromDB } from "@/lib/idb";

interface ProjectState {
  currentProject: BookProject | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: string | null;

  // Actions
  loadProject: (id: string) => Promise<void>;
  setProject: (project: BookProject) => void;
  deleteProject: (id: string) => Promise<void>;
  updateMeta: (updates: Partial<BookProject["meta"]>) => void;
  updatePremise: (premise: string) => void;
  updateOutline: (outline: OutlineNode[]) => void;
  updateTargets: (targets: Partial<BookProject["targets"]>) => void;
  updateStylePreset: (presetId: string) => void;

  // Chapter operations
  addChapter: (chapter: Chapter) => void;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapters: (chapterIds: string[]) => void;

  // Section operations
  addSection: (chapterId: string, section: Section) => void;
  updateSection: (chapterId: string, sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (chapterId: string, sectionId: string) => void;

  // Document operations
  addDocument: (document: DocumentRef, kind: "reference" | "style") => void;
  removeDocument: (documentId: string, kind: "reference" | "style") => void;
  updateDocument: (documentId: string, updates: Partial<DocumentRef>, kind: "reference" | "style") => void;
  setCustomStyleAnalysis: (analysis: CustomStyleAnalysis | undefined) => void;

  // Image operations
  updateCoverImage: (imageId: string | undefined) => void;
  updateChapterImage: (chapterId: string, imageId: string | undefined) => void;
  addSectionImage: (chapterId: string, sectionId: string, mediaRef: MediaRef) => void;
  removeSectionImage: (chapterId: string, sectionId: string, imageId: string) => void;

  // History
  addChangeRecord: (record: Omit<ChangeRecord, "id" | "timestamp">) => void;

  // Persistence
  save: () => Promise<void>;
  snapshot: (label?: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  isLoading: false,
  isSaving: false,
  lastSaved: null,

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const project = await getProject(id);
      set({ currentProject: project || null, isLoading: false });
    } catch (error) {
      console.error("Failed to load project:", error);
      set({ isLoading: false });
    }
  },

  setProject: (project: BookProject) => {
    set({ currentProject: project });
  },

  deleteProject: async (id: string) => {
    await deleteProjectFromDB(id);
    const { currentProject } = get();
    if (currentProject?.meta.id === id) {
      set({ currentProject: null });
    }
  },

  updateMeta: (updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      meta: {
        ...currentProject.meta,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updatePremise: (premise) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      premise,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateOutline: (outline) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      outline,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateTargets: (targets) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      targets: {
        ...currentProject.targets,
        ...targets,
      },
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateStylePreset: (presetId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      stylePresetId: presetId,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  addChapter: (chapter) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: [...currentProject.chapters, chapter],
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateChapter: (chapterId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, ...updates } : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  deleteChapter: (chapterId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.filter((ch) => ch.id !== chapterId),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  reorderChapters: (chapterIds) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const chapterMap = new Map(currentProject.chapters.map((ch) => [ch.id, ch]));
    const reordered = chapterIds
      .map((id) => chapterMap.get(id))
      .filter((ch): ch is Chapter => ch !== undefined);

    const updated: BookProject = {
      ...currentProject,
      chapters: reordered,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  addSection: (chapterId, section) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId
          ? { ...ch, sections: [...ch.sections, section] }
          : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateSection: (chapterId, sectionId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              sections: ch.sections.map((sec) =>
                sec.id === sectionId ? { ...sec, ...updates } : sec
              ),
            }
          : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  deleteSection: (chapterId, sectionId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              sections: ch.sections.filter((sec) => sec.id !== sectionId),
            }
          : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  addDocument: (document, kind) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const field = kind === "reference" ? "referenceDocuments" : "styleDocuments";
    const existingDocs = currentProject[field] || [];

    const updated: BookProject = {
      ...currentProject,
      [field]: [...existingDocs, document],
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  removeDocument: (documentId, kind) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const field = kind === "reference" ? "referenceDocuments" : "styleDocuments";
    const existingDocs = currentProject[field] || [];

    const updated: BookProject = {
      ...currentProject,
      [field]: existingDocs.filter((doc) => doc.id !== documentId),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateDocument: (documentId, updates, kind) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const field = kind === "reference" ? "referenceDocuments" : "styleDocuments";
    const existingDocs = currentProject[field] || [];

    const updated: BookProject = {
      ...currentProject,
      [field]: existingDocs.map((doc) =>
        doc.id === documentId ? { ...doc, ...updates } : doc
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  setCustomStyleAnalysis: (analysis) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      customStyleAnalysis: analysis,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateCoverImage: (imageId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      coverImageId: imageId,
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  updateChapterImage: (chapterId, imageId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, imageId } : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  addSectionImage: (chapterId, sectionId, mediaRef) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              sections: ch.sections.map((sec) =>
                sec.id === sectionId
                  ? { 
                      ...sec, 
                      images: [...(sec.images || []), mediaRef] 
                    }
                  : sec
              ),
            }
          : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  removeSectionImage: (chapterId, sectionId, imageId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated: BookProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              sections: ch.sections.map((sec) =>
                sec.id === sectionId
                  ? {
                      ...sec,
                      images: (sec.images || []).filter((img) => img.id !== imageId),
                    }
                  : sec
              ),
            }
          : ch
      ),
      meta: {
        ...currentProject.meta,
        updatedAt: new Date().toISOString(),
        version: currentProject.meta.version + 1,
      },
    };
    set({ currentProject: updated });
    get().save();
  },

  addChangeRecord: (record) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const changeRecord: ChangeRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updated: BookProject = {
      ...currentProject,
      history: [...(currentProject.history || []), changeRecord],
    };
    set({ currentProject: updated });
  },

  save: async () => {
    const { currentProject, isSaving } = get();
    if (!currentProject || isSaving) return;

    set({ isSaving: true });
    try {
      await saveProject(currentProject);
      set({ lastSaved: new Date().toISOString(), isSaving: false });
    } catch (error) {
      console.error("Failed to save project:", error);
      set({ isSaving: false });
    }
  },

  snapshot: async (label) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await createSnapshot(currentProject.meta.id, currentProject, label);
    } catch (error) {
      console.error("Failed to create snapshot:", error);
    }
  },
}));

// Auto-save with debounce
let saveTimeout: NodeJS.Timeout | null = null;
useProjectStore.subscribe((state) => {
  if (state.currentProject && !state.isSaving) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      state.save();
    }, 1000);
  }
});
