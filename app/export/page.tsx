"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { ArrowLeft, FileJson, FileText, Download, BookOpen, FileType } from "lucide-react";
import { generateEPUB, downloadEPUB } from "@/lib/epub/generator";
import { generatePDF, downloadPDF } from "@/lib/pdf/generator";
import { generateDOCX, downloadDOCX } from "@/lib/docx/generator";

export default function ExportPage() {
  const router = useRouter();
  const currentProject = useProjectStore((state) => state.currentProject);
  const [exportFormat, setExportFormat] = useState<"json" | "epub" | "pdf" | "docx">("json");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>("");

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No project loaded. Please go back and select a project.</p>
      </div>
    );
  }

  async function handleExport() {
    if (!currentProject) return;

    setIsExporting(true);
    setExportStatus("");

    try {
      const filename = currentProject.meta.title.replace(/[^a-z0-9]/gi, "_");

      if (exportFormat === "json") {
        setExportStatus("Preparing JSON export...");
        // Export as JSON
        const jsonString = JSON.stringify(currentProject, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.book.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportStatus("JSON export complete!");
      } else if (exportFormat === "epub") {
        setExportStatus("Generating EPUB (Amazon KDP compatible)...");
        // Generate and download EPUB
        const epubBlob = await generateEPUB(currentProject);
        downloadEPUB(epubBlob, filename);
        setExportStatus("EPUB export complete! Ready for Amazon KDP.");
      } else if (exportFormat === "pdf") {
        setExportStatus("Generating PDF (6x9\" KDP format)...");
        // Generate and download PDF
        const pdfBlob = await generatePDF(currentProject);
        downloadPDF(pdfBlob, filename);
        setExportStatus("PDF export complete! Ready for Amazon KDP.");
      } else if (exportFormat === "docx") {
        setExportStatus("Generating Word document (.docx)...");
        // Generate and download DOCX
        const docxBlob = await generateDOCX(currentProject);
        downloadDOCX(docxBlob, filename);
        setExportStatus("Word document export complete!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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

              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="format"
                  value="epub"
                  checked={exportFormat === "epub"}
                  onChange={(e) => setExportFormat("epub")}
                  className="w-4 h-4"
                />
                <BookOpen className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">EPUB 3 (Amazon KDP)</div>
                  <div className="text-sm text-muted-foreground">
                    Professional e-book format compatible with Amazon Kindle, Apple Books, and all major e-readers. Includes TOC, metadata, and KDP-compliant styling.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === "pdf"}
                  onChange={(e) => setExportFormat("pdf")}
                  className="w-4 h-4"
                />
                <FileType className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">PDF (6×9" Trade Paperback)</div>
                  <div className="text-sm text-muted-foreground">
                    Print-ready PDF with KDP standard 6×9" trim size, proper margins, page numbers, and professional formatting. Ready to upload for paperback printing.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-input rounded-md cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="format"
                  value="docx"
                  checked={exportFormat === "docx"}
                  onChange={(e) => setExportFormat("docx")}
                  className="w-4 h-4"
                />
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Word Document (.docx)</div>
                  <div className="text-sm text-muted-foreground">
                    Microsoft Word format with all images included. Perfect for editing, sharing, or further formatting in Word or Google Docs.
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

          {/* Export Status */}
          {exportStatus && (
            <div className={`p-4 rounded-md text-sm ${
              exportStatus.includes("failed") 
                ? "bg-destructive/10 text-destructive" 
                : exportStatus.includes("complete")
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-primary/10 text-primary"
            }`}>
              {exportStatus}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className={`w-5 h-5 ${isExporting ? "animate-bounce" : ""}`} />
            {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
          </button>

          {/* Format Info */}
          {(exportFormat === "epub" || exportFormat === "pdf" || exportFormat === "docx") && !isExporting && (
            <div className="mt-4 p-4 bg-muted/50 rounded-md text-sm">
              <h3 className="font-semibold mb-2">
                {exportFormat === "docx" ? "📝 Editable Format" : "📚 Amazon KDP Ready"}
              </h3>
              <p className="text-muted-foreground">
                {exportFormat === "epub" 
                  ? "This EPUB is formatted to Amazon Kindle Direct Publishing standards. Upload directly to KDP for e-book distribution."
                  : exportFormat === "pdf"
                  ? "This PDF uses KDP's standard 6×9\" trade paperback format with proper margins and bleeds. Upload to KDP for print-on-demand paperback distribution."
                  : "This Word document includes all your content and images. Open in Microsoft Word, Google Docs, or any compatible word processor for further editing."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
