import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Editor state
  selectedChapterId: string | null;
  selectedSectionId: string | null;
  isEditorFocused: boolean;
  showOutline: boolean;
  showAISidebar: boolean;

  // Offline state
  isOnline: boolean;
  queuedRequests: Array<{
    id: string;
    type: "transcribe" | "generate" | "image";
    payload: any;
    timestamp: string;
  }>;

  // Voice recorder state
  isRecording: boolean;
  recordingDuration: number;

  // Modals
  showNewProjectModal: boolean;
  showExportWizard: boolean;
  showSettingsModal: boolean;
  showSnapshotManager: boolean;

  // Toast notifications
  toasts: Array<{
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    timestamp: string;
  }>;

  // Actions
  setSelectedChapter: (chapterId: string | null) => void;
  setSelectedSection: (sectionId: string | null) => void;
  setEditorFocused: (focused: boolean) => void;
  toggleOutline: () => void;
  toggleAISidebar: () => void;
  setOnlineStatus: (online: boolean) => void;

  // Queue management
  addToQueue: (type: "transcribe" | "generate" | "image", payload: any) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;

  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  updateRecordingDuration: (duration: number) => void;

  // Modals
  openNewProjectModal: () => void;
  closeNewProjectModal: () => void;
  openExportWizard: () => void;
  closeExportWizard: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openSnapshotManager: () => void;
  closeSnapshotManager: () => void;

  // Toast
  addToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedChapterId: null,
      selectedSectionId: null,
      isEditorFocused: false,
      showOutline: true,
      showAISidebar: true,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      queuedRequests: [],
      isRecording: false,
      recordingDuration: 0,
      showNewProjectModal: false,
      showExportWizard: false,
      showSettingsModal: false,
      showSnapshotManager: false,
      toasts: [],

      // Editor actions
      setSelectedChapter: (chapterId) => set({ selectedChapterId: chapterId }),
      setSelectedSection: (sectionId) => set({ selectedSectionId: sectionId }),
      setEditorFocused: (focused) => set({ isEditorFocused: focused }),
      toggleOutline: () => set((state) => ({ showOutline: !state.showOutline })),
      toggleAISidebar: () => set((state) => ({ showAISidebar: !state.showAISidebar })),

      // Offline
      setOnlineStatus: (online) => set({ isOnline: online }),

      // Queue
      addToQueue: (type, payload) => {
        const request = {
          id: crypto.randomUUID(),
          type,
          payload,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          queuedRequests: [...state.queuedRequests, request],
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queuedRequests: state.queuedRequests.filter((req) => req.id !== id),
        }));
      },

      clearQueue: () => set({ queuedRequests: [] }),

      // Recording
      startRecording: () => set({ isRecording: true, recordingDuration: 0 }),
      stopRecording: () => set({ isRecording: false, recordingDuration: 0 }),
      updateRecordingDuration: (duration) => set({ recordingDuration: duration }),

      // Modals
      openNewProjectModal: () => set({ showNewProjectModal: true }),
      closeNewProjectModal: () => set({ showNewProjectModal: false }),
      openExportWizard: () => set({ showExportWizard: true }),
      closeExportWizard: () => set({ showExportWizard: false }),
      openSettingsModal: () => set({ showSettingsModal: true }),
      closeSettingsModal: () => set({ showSettingsModal: false }),
      openSnapshotManager: () => set({ showSnapshotManager: true }),
      closeSnapshotManager: () => set({ showSnapshotManager: false }),

      // Toast
      addToast: (message, type = "info") => {
        const toast = {
          id: crypto.randomUUID(),
          message,
          type,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeToast(toast.id);
        }, 5000);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      },
    }),
    {
      name: "book-creator-ui",
      partialize: (state) => ({
        showOutline: state.showOutline,
        showAISidebar: state.showAISidebar,
      }),
    }
  )
);

// Listen to online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useUIStore.getState().setOnlineStatus(true);
  });

  window.addEventListener("offline", () => {
    useUIStore.getState().setOnlineStatus(false);
  });
}
