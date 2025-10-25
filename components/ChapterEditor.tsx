"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useState, useRef } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Undo,
  Redo,
  Sparkles,
} from "lucide-react";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { useProjectStore } from "@/store/useProjectStore";

interface ChapterEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onAIAssistClick?: () => void;
  onRewritePreview?: (
    preview: {
      mode: "rewrite" | "generate";
      isGenerating: boolean;
      generatedText: string;
      error?: string;
      waitingForPrompt?: boolean;
      onSubmitPrompt?: (prompt: string) => void;
    } | null,
    handlers?: {
      onAccept: () => void;
      onReject: () => void;
    }
  ) => void;
}

/**
 * Convert plain text with newlines and markdown to HTML paragraphs for TipTap
 * Intelligently handles both single and double newlines from AI-generated content
 */
function textToHtml(text: string): string {
  if (!text) return "";
  
  // If already HTML (contains tags), return as-is
  if (text.includes("<p>") || text.includes("<h1>") || text.includes("<div>")) {
    return text;
  }
  
  // Step 1: Normalize line endings and preserve intentional paragraph breaks
  // Replace Windows line endings and multiple spaces
  let normalized = text.replace(/\r\n/g, "\n").replace(/  +/g, " ");
  
  // Step 2: Split into blocks (paragraphs, headings, etc.)
  // First try double newlines (proper paragraph breaks)
  let blocks = normalized.split(/\n\n+/);
  
  // If no double newlines found, treat each single newline as a paragraph break
  // This handles AI content that uses single newlines for paragraphs
  if (blocks.length === 1 && normalized.includes("\n")) {
    // Check if this looks like prose with single-line paragraphs
    // (common in AI output) vs. a code block or list
    const lines = normalized.split("\n");
    if (lines.length > 1 && !lines[0].trim().startsWith("-") && !lines[0].trim().startsWith("*")) {
      blocks = lines;
    }
  }
  
  // Filter out empty blocks
  blocks = blocks.map(b => b.trim()).filter(b => b.length > 0);
  
  // Step 3: Convert each block to HTML
  return blocks
    .map(block => {
      let html = block;
      
      // Convert markdown headings: ### Heading -> <h3>Heading</h3>
      if (html.startsWith("### ")) {
        return `<h3>${html.substring(4).trim()}</h3>`;
      }
      if (html.startsWith("## ")) {
        return `<h2>${html.substring(3).trim()}</h2>`;
      }
      if (html.startsWith("# ")) {
        return `<h1>${html.substring(2).trim()}</h1>`;
      }
      
      // Check for bullet lists (lines starting with - or *)
      if (html.match(/^[-*]\s/m)) {
        const items = html
          .split("\n")
          .filter(line => line.trim().startsWith("-") || line.trim().startsWith("*"))
          .map(line => line.replace(/^[-*]\s+/, "").trim())
          .map(item => `<li>${item}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      
      // Convert markdown bold: **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      
      // Convert markdown italic: *text* or _text_ -> <em>text</em>
      html = html.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
      html = html.replace(/_([^_]+?)_/g, "<em>$1</em>");
      
      // If there are still internal newlines in this block,
      // replace them with <br> tags (for poetry, addresses, etc.)
      if (html.includes("\n")) {
        html = html.replace(/\n/g, "<br>");
      }
      
      return `<p>${html}</p>`;
    })
    .join("");
}

export function ChapterEditor({
  content,
  onChange,
  placeholder = "Start writing your chapter...",
  onAIAssistClick,
  onRewritePreview,
}: ChapterEditorProps) {
  const currentProject = useProjectStore((state) => state.currentProject);
  
  // Bubble menu state
  const [bubbleMenuMode, setBubbleMenuMode] = useState<"rewrite" | "generate" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  const [generationError, setGenerationError] = useState<string | undefined>();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [waitingForPrompt, setWaitingForPrompt] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const acceptRejectHandlersRef = useRef<{ onAccept: () => void; onReject: () => void } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Get HTML and convert back to markdown-like text
      const html = editor.getHTML();
      onChange(html);
    },
    onSelectionUpdate: ({ editor }) => {
      // Update bubble menu visibility based on selection
      const { from, to, empty } = editor.state.selection;
      
      // Calculate menu position
      if (typeof window !== "undefined" && editorContainerRef.current) {
        const { view } = editor;
        const coords = view.coordsAtPos(from);
        const editorRect = editorContainerRef.current.getBoundingClientRect();
        
        // Position relative to editor container
        const top = coords.top - editorRect.top - 50; // 50px above selection
        const left = coords.left - editorRect.left;
        
        setMenuPosition({ top, left });
      }
      
      if (empty) {
        // Check if cursor is in an empty paragraph
        const node = editor.state.doc.nodeAt(from);
        if (node && node.type.name === "paragraph" && node.content.size === 0) {
          setBubbleMenuMode("generate");
        } else {
          setBubbleMenuMode(null);
          setMenuPosition(null);
        }
      } else {
        // Text is selected
        setBubbleMenuMode("rewrite");
        setSelectedRange({ from, to });
      }
      
      // Reset state when selection changes
      if (!isGenerating && !waitingForPrompt) {
        setGeneratedText("");
        setGenerationError(undefined);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[600px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    
    // Convert plain text to HTML if needed
    const htmlContent = textToHtml(content);
    
    // Only update if content has actually changed
    // Compare the HTML content to avoid unnecessary updates
    const currentHtml = editor.getHTML();
    if (htmlContent !== currentHtml) {
      editor.commands.setContent(htmlContent, { emitUpdate: false });
    }
  }, [content, editor]);

  // Notify parent of preview state changes
  useEffect(() => {
    if (onRewritePreview) {
      if (waitingForPrompt || isGenerating || generatedText || generationError) {
        onRewritePreview(
          {
            mode: bubbleMenuMode || "rewrite",
            isGenerating,
            generatedText,
            error: generationError,
            waitingForPrompt,
            onSubmitPrompt: handleSubmitPrompt,
          },
          acceptRejectHandlersRef.current || undefined
        );
      } else {
        onRewritePreview(null);
      }
    }
  }, [waitingForPrompt, isGenerating, generatedText, generationError, bubbleMenuMode, onRewritePreview]);

  // Handler functions
  const handleRewriteClick = () => {
    // Set waiting state and let parent know to show prompt in sidebar
    setWaitingForPrompt(true);
    // Trigger sidebar opening through the parent
    onAIAssistClick?.();
  };

  const handleGenerateClick = () => {
    // Set waiting state and let parent know to show prompt in sidebar
    setWaitingForPrompt(true);
    // Trigger sidebar opening through the parent
    onAIAssistClick?.();
  };

  // Export this function so parent can call it when user submits prompt from sidebar
  const handleSubmitPrompt = async (prompt: string) => {
    setWaitingForPrompt(false);
    if (!editor || !currentProject) return;
    
    setIsGenerating(true);
    setGenerationError(undefined);
    
    try {
      // Get reference documents that are enabled for generation
      const enabledRefDocs = currentProject.referenceDocuments?.filter(
        (doc) => doc.includeInGeneration
      );

      if (bubbleMenuMode === "rewrite" && selectedRange) {
        // Get selected text
        const { from, to } = selectedRange;
        const selectedText = editor.state.doc.textBetween(from, to);
        
        // Call API
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "rewrite",
            project: currentProject,
            excerpt: selectedText,
            userPrompt: prompt,
            referenceDocuments: enabledRefDocs,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate rewrite");
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  result += parsed.content;
                  setGeneratedText(result);
                  console.log("Generated text updated (rewrite):", result.length, "chars");
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        
        // Log final result for rewrite
        console.log("Rewrite complete. Total text:", result.length, "chars");
        console.log("Final rewrite text:", result);
      } else if (bubbleMenuMode === "generate") {
        // Get surrounding context (previous paragraph if any)
        const { from } = editor.state.selection;
        const contextFrom = Math.max(0, from - 500); // Get up to 500 chars before
        const contextText = editor.state.doc.textBetween(contextFrom, from);
        
        // Call API
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "inline_generate",
            project: currentProject,
            context: contextText,
            userPrompt: prompt,
            referenceDocuments: enabledRefDocs,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate text");
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  result += parsed.content;
                  setGeneratedText(result);
                  console.log("Generated text updated:", result.length, "chars");
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        
        // Log final result for generate
        console.log("Generate complete. Total text:", result.length, "chars");
        console.log("Final generated text:", result);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
      console.log("isGenerating set to false, generatedText:", generatedText);
    }
  };

  const handleAcceptRewrite = () => {
    if (!editor || !generatedText) return;
    
    // Convert plain text to HTML paragraphs
    const htmlContent = textToHtml(generatedText);
    
    if (bubbleMenuMode === "rewrite" && selectedRange) {
      // Replace selected text
      const { from, to } = selectedRange;
      
      // Delete the selected range and insert new content
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(htmlContent)
        .run();
    } else if (bubbleMenuMode === "generate") {
      // Insert at cursor position
      editor.chain().focus().insertContent(htmlContent).run();
    }
    
    // Reset state
    setGeneratedText("");
    setBubbleMenuMode(null);
    setSelectedRange(null);
    setMenuPosition(null);
    setWaitingForPrompt(false);
  };

  const handleRejectRewrite = () => {
    setGeneratedText("");
    setGenerationError(undefined);
    setWaitingForPrompt(false);
    // Keep bubble menu open unless user clicks away
  };

  // Store accept/reject handlers
  acceptRejectHandlersRef.current = {
    onAccept: handleAcceptRewrite,
    onReject: handleRejectRewrite,
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/50 px-4 py-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("bold") ? "bg-accent" : ""
          }`}
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("italic") ? "bg-accent" : ""
          }`}
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("bulletList") ? "bg-accent" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("orderedList") ? "bg-accent" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive("blockquote") ? "bg-accent" : ""
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Cmd+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </button>

        {/* AI Assistant Button */}
        {onAIAssistClick && (
          <>
            <div className="flex-1" />
            <button
              onClick={onAIAssistClick}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1.5"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div ref={editorContainerRef} className="relative">
        <EditorContent editor={editor} />
        
        {/* Custom Floating Menu for Rewrite/Generate */}
        {editor && bubbleMenuMode && menuPosition && (
          <div
            className="absolute z-50"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            <EditorBubbleMenu
              mode={bubbleMenuMode}
              onRewriteClick={handleRewriteClick}
              onGenerateClick={handleGenerateClick}
            />
          </div>
        )}
        
      </div>
    </div>
  );
}
