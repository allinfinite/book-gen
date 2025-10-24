"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { ArrowLeft, FileJson, FileText, Download } from "lucide-react";

export default function ExportPage() {
  const router = useRouter();
  const currentProject = useProjectStore((state) => state.currentProject);
  const [exportFormat, setExportFormat] = useState<"json" | "epub" | "pdf">("json");
  const [isExporting, setIsExporting] = useState(false);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No project loaded. Please go back and select a project.</p>
      </div>
    );
  }

  async function handleExport() {
    setIsExporting(true);

    try {
      if (exportFormat === "json" && currentProject) {
        // Export as JSON
        const jsonString = JSON.stringify(currentProject, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentProject.meta.title.replace(/[^a-z0-9]/gi, "_")}.book.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === "epub") {
        alert("EPUB export is not yet implemented. Coming soon!");
      } else if (exportFormat === "pdf") {
        alert("PDF export is not yet implemented. Coming soon!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Export Project</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Export Format</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={(e) => setExportFormat("json")}
                  className="w-4 h-4"
                />
                <FileJson className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">JSON</div>
                  <div className="text-sm text-muted-foreground">
                    Export project data for backup or sharing. Can be re-imported later.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent opacity-50">
                <input
                  type="radio"
                  name="format"
                  value="epub"
                  checked={exportFormat === "epub"}
                  onChange={(e) => setExportFormat("epub")}
                  className="w-4 h-4"
                  disabled
                />
                <FileText className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">EPUB 3</div>
                  <div className="text-sm text-muted-foreground">
                    E-book format (Coming Soon)
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent opacity-50">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === "pdf"}
                  onChange={(e) => setExportFormat("pdf")}
                  className="w-4 h-4"
                  disabled
                />
                <FileText className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">PDF</div>
                  <div className="text-sm text-muted-foreground">
                    Printable document (Coming Soon)
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold mb-4">Project Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Title:</dt>
                <dd className="font-medium">{currentProject.meta.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Chapters:</dt>
                <dd className="font-medium">{currentProject.chapters.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total Sections:</dt>
                <dd className="font-medium">
                  {currentProject.chapters.reduce(
                    (sum, ch) => sum + ch.sections.length,
                    0
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </main>
    </div>
  );
}
