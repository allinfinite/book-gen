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
 */
function textToHtml(text: string): string {
  if (!text) return "";
  
  // If already HTML (contains tags), return as-is
  if (text.includes("<p>") || text.includes("<h1>") || text.includes("<div>")) {
    return text;
  }
  
  // Split by double newlines to preserve paragraph breaks
  const paragraphs = text
    .split(/\n\n+/) // Split on 2+ newlines
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Convert markdown-like patterns to HTML
  return paragraphs
    .map(p => {
      let html = p;
      
      // Convert markdown headings: ## Heading -> <h2>Heading</h2>
      if (html.startsWith("### ")) {
        return `<h3>${html.substring(4)}</h3>`;
      }
      if (html.startsWith("## ")) {
        return `<h2>${html.substring(3)}</h2>`;
      }
      if (html.startsWith("# ")) {
        return `<h1>${html.substring(2)}</h1>`;
      }
      
      // Convert markdown bold: **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      
      // Convert markdown italic: *text* or _text_ -> <em>text</em>
      // Use underscore for italic to avoid conflicts with bold
      html = html.replace(/_(.+?)_/g, "<em>$1</em>");
      
      // Replace single newlines with <br> tags
      html = html.replace(/\n/g, "<br>");
      
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
      editor.commands.setContent(htmlContent, false); // false = don't emit update event
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
