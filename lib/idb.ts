import Dexie, { type Table } from "dexie";
import { BookProject, MediaRef } from "@/types/book";

// Media Store Interface
export interface MediaBlob {
  id: string;
  kind: "audio" | "image";
  mime: string;
  bytes: ArrayBuffer;
  createdAt: string;
  meta?: Record<string, any>;
}

// Document Store Interface
export interface DocumentBlob {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  bytes: ArrayBuffer;
  createdAt: string;
}

// Snapshot Interface
export interface ProjectSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  project: BookProject;
  label?: string;
}

// Database Class
export class BookCreatorDB extends Dexie {
  projects!: Table<BookProject, string>;
  media!: Table<MediaBlob, string>;
  snapshots!: Table<ProjectSnapshot, string>;
  documents!: Table<DocumentBlob, string>;

  constructor() {
    super("BookCreatorDB");

    this.version(1).stores({
      projects: "meta.id, meta.title, meta.updatedAt",
      media: "id, kind, createdAt",
      snapshots: "id, projectId, timestamp",
    });

    // Version 2: Add documents table
    this.version(2).stores({
      projects: "meta.id, meta.title, meta.updatedAt",
      media: "id, kind, createdAt",
      snapshots: "id, projectId, timestamp",
      documents: "id, projectId, createdAt",
    });
  }
}

// Singleton instance
export const db = new BookCreatorDB();

// Project operations
export async function saveProject(project: BookProject): Promise<void> {
  await db.projects.put(project);
}

export async function getProject(id: string): Promise<BookProject | undefined> {
  return await db.projects.get(id);
}

export async function getAllProjects(): Promise<BookProject[]> {
  return await db.projects.orderBy("meta.updatedAt").reverse().toArray();
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
  // Also delete snapshots
  const snapshots = await db.snapshots.where("projectId").equals(id).toArray();
  await Promise.all(snapshots.map((s) => db.snapshots.delete(s.id)));
}

// Media operations
export async function saveMedia(
  id: string,
  kind: "audio" | "image",
  mime: string,
  bytes: ArrayBuffer,
  meta?: Record<string, any>
): Promise<void> {
  const mediaBlob: MediaBlob = {
    id,
    kind,
    mime,
    bytes,
    createdAt: new Date().toISOString(),
    meta,
  };
  await db.media.put(mediaBlob);
}

export async function getMedia(id: string): Promise<MediaBlob | undefined> {
  return await db.media.get(id);
}

export async function deleteMedia(id: string): Promise<void> {
  await db.media.delete(id);
}

export async function getMediaAsBlob(id: string): Promise<Blob | null> {
  const media = await getMedia(id);
  if (!media) return null;
  return new Blob([media.bytes], { type: media.mime });
}

export async function getMediaAsDataURL(id: string): Promise<string | null> {
  const blob = await getMediaAsBlob(id);
  if (!blob) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Snapshot operations
export async function createSnapshot(
  projectId: string,
  project: BookProject,
  label?: string
): Promise<string> {
  const snapshot: ProjectSnapshot = {
    id: crypto.randomUUID(),
    projectId,
    timestamp: new Date().toISOString(),
    project: structuredClone(project), // Deep copy
    label,
  };
  await db.snapshots.put(snapshot);
  return snapshot.id;
}

export async function getSnapshot(
  id: string
): Promise<ProjectSnapshot | undefined> {
  return await db.snapshots.get(id);
}

export async function getProjectSnapshots(
  projectId: string
): Promise<ProjectSnapshot[]> {
  return await db.snapshots
    .where("projectId")
    .equals(projectId)
    .reverse()
    .sortBy("timestamp");
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}

export async function restoreSnapshot(
  snapshotId: string
): Promise<BookProject> {
  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  // Create a new project with a new ID to avoid overwriting
  const restoredProject: BookProject = {
    ...structuredClone(snapshot.project),
    meta: {
      ...snapshot.project.meta,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      title: `${snapshot.project.meta.title} (Restored)`,
    },
  };

  await saveProject(restoredProject);
  return restoredProject;
}

// Utility: Clean up orphaned media
export async function cleanupOrphanedMedia(): Promise<number> {
  const projects = await getAllProjects();
  const usedMediaIds = new Set<string>();

  // Collect all media IDs referenced in projects
  projects.forEach((project) => {
    if (project.coverImageId) {
      usedMediaIds.add(project.coverImageId);
    }
    project.chapters.forEach((chapter) => {
      chapter.sections.forEach((section) => {
        section.images?.forEach((img) => usedMediaIds.add(img.id));
        section.audioRefs?.forEach((audioId) => usedMediaIds.add(audioId));
      });
    });
  });

  // Delete media not in the used set
  const allMedia = await db.media.toArray();
  const orphanedMedia = allMedia.filter((m) => !usedMediaIds.has(m.id));

  await Promise.all(orphanedMedia.map((m) => deleteMedia(m.id)));

  return orphanedMedia.length;
}

// Export for backup
export async function exportDatabase(): Promise<{
  projects: BookProject[];
  media: MediaBlob[];
  snapshots: ProjectSnapshot[];
}> {
  const [projects, media, snapshots] = await Promise.all([
    db.projects.toArray(),
    db.media.toArray(),
    db.snapshots.toArray(),
  ]);

  return { projects, media, snapshots };
}

// Import from backup
export async function importDatabase(data: {
  projects?: BookProject[];
  media?: MediaBlob[];
  snapshots?: ProjectSnapshot[];
}): Promise<void> {
  if (data.projects) {
    await db.projects.bulkPut(data.projects);
  }
  if (data.media) {
    await db.media.bulkPut(data.media);
  }
  if (data.snapshots) {
    await db.snapshots.bulkPut(data.snapshots);
  }
}

// Document operations
export async function saveDocument(
  id: string,
  projectId: string,
  name: string,
  mime: string,
  bytes: ArrayBuffer
): Promise<void> {
  const documentBlob: DocumentBlob = {
    id,
    projectId,
    name,
    mime,
    bytes,
    createdAt: new Date().toISOString(),
  };
  await db.documents.put(documentBlob);
}

export async function getDocument(id: string): Promise<DocumentBlob | undefined> {
  return await db.documents.get(id);
}

export async function getDocumentsByProject(projectId: string): Promise<DocumentBlob[]> {
  return await db.documents.where("projectId").equals(projectId).toArray();
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}

export async function getDocumentAsBlob(id: string): Promise<Blob | null> {
  const doc = await getDocument(id);
  if (!doc) return null;
  return new Blob([doc.bytes], { type: doc.mime });
}
