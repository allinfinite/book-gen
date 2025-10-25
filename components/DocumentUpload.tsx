"use client";

import { useState, useRef } from "react";
import { DocumentRef } from "@/types/book";
import { extractTextFromPDF, isPDFFile, formatFileSize, countWords } from "@/lib/pdf/extractor";
import { saveDocument, deleteDocument as deleteDocumentFromDB } from "@/lib/idb";
import { Upload, File, Trash2, Check, X, AlertCircle } from "lucide-react";

interface DocumentUploadProps {
  kind: "reference" | "style";
  documents: DocumentRef[];
  projectId?: string;
  onAdd: (document: DocumentRef) => void;
  onRemove: (documentId: string) => void;
  onUpdate: (documentId: string, updates: Partial<DocumentRef>) => void;
}

export function DocumentUpload({
  kind,
  documents,
  projectId,
  onAdd,
  onRemove,
  onUpdate,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = kind === "reference" ? "Reference Documents" : "Writing Style Samples";
  const description =
    kind === "reference"
      ? "Upload PDFs containing reference materials and sources for your book. These can be automatically cited when quoted."
      : "Upload PDFs of your previous writings. The AI will analyze your style and match it in generated content.";

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    
    setError("");
    setIsUploading(true);
    setUploadProgress("Processing PDF...");

    try {
      const file = files[0];

      // Validate file type
      if (!isPDFFile(file)) {
        throw new Error("Please upload a PDF file.");
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB.");
      }

      // Extract text from PDF
      setUploadProgress("Extracting text from PDF...");
      const extractedText = await extractTextFromPDF(file);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from this PDF. It may be image-based or encrypted.");
      }

      // Check word count
      const wordCount = countWords(extractedText);
      if (wordCount > 50000) {
        throw new Error(`Document is too large (${wordCount.toLocaleString()} words). Maximum is 50,000 words.`);
      }

      // Save PDF blob to IndexedDB if project exists
      const docId = crypto.randomUUID();
      if (projectId) {
        setUploadProgress("Saving document...");
        const arrayBuffer = await file.arrayBuffer();
        await saveDocument(docId, projectId, file.name, file.type, arrayBuffer);
      }

      // Create document reference
      const documentRef: DocumentRef = {
        id: docId,
        name: file.name,
        kind,
        extractedText,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        includeInGeneration: true,
      };

      onAdd(documentRef);
      setUploadProgress("");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemove(docId: string) {
    if (!confirm("Are you sure you want to remove this document?")) return;
    
    try {
      // Delete from IndexedDB
      await deleteDocumentFromDB(docId);
      // Remove from project
      onRemove(docId);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  }

  function handleToggleInclude(docId: string, currentValue: boolean) {
    onUpdate(docId, { includeInGeneration: !currentValue });
  }

  // Drag and drop handlers
  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />

        {isUploading ? (
          <div>
            <p className="text-sm font-medium">{uploadProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait...</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium mb-1">
              Drag and drop a PDF here, or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: 10MB | Maximum words: 50,000
            </p>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button
            onClick={() => setError("")}
            className="text-destructive hover:text-destructive/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Documents</h4>
          <div className="space-y-2">
            {documents.map((doc) => {
              const wordCount = countWords(doc.extractedText);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-md bg-card"
                >
                  <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)} · {wordCount.toLocaleString()} words
                    </p>
                  </div>

                  {kind === "reference" && (
                    <button
                      onClick={() => handleToggleInclude(doc.id, doc.includeInGeneration)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        doc.includeInGeneration
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={doc.includeInGeneration ? "Included in AI generation" : "Not included in AI generation"}
                    >
                      {doc.includeInGeneration ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Include</span>
                        </>
                      ) : (
                        <span>Excluded</span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleRemove(doc.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {documents.length === 0 && !isUploading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No documents uploaded yet
        </p>
      )}
    </div>
  );
}

