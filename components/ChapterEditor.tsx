"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Undo,
  Redo,
} from "lucide-react";

interface ChapterEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
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
}: ChapterEditorProps) {
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
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
