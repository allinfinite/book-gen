"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllProjects, deleteProject } from "@/lib/idb";
import { BookProject } from "@/types/book";
import { useUIStore } from "@/store/useUIStore";
import { NewProjectModal } from "@/components/NewProjectModal";
import { Book, Plus, FileText, Trash2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const openNewProjectModal = useUIStore((state) => state.openNewProjectModal);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteProject(projectId: string, projectTitle: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent navigation to project

    if (!confirm(`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProject(projectId);
      await loadProjects(); // Reload the list
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  }

  return (
    <>
      <NewProjectModal />
      <div className="min-h-screen bg-background">
        {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">Voice-to-Book Creator</h1>
            </div>
            <button
              onClick={openNewProjectModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first book project to get started
            </p>
            <button
              onClick={openNewProjectModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.meta.id}
                onClick={() => router.push(`/project/${project.meta.id}`)}
                className="border border-border rounded-lg p-6 hover:border-primary cursor-pointer transition-colors relative group"
              >
                <h3 className="text-lg font-semibold mb-2 pr-8">
                  {project.meta.title}
                </h3>
                {project.meta.subtitle && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {project.meta.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{project.chapters.length} chapters</span>
                  {project.meta.genre && <span>• {project.meta.genre}</span>}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Updated{" "}
                  {new Date(project.meta.updatedAt).toLocaleDateString()}
                </div>
                <button
                  onClick={(e) => handleDeleteProject(project.meta.id, project.meta.title, e)}
                  className="absolute top-4 right-4 p-2 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
