Voice-to-Book (Next.js, No-DB) — Complete Developer Outline

0) Scope & Non-Goals
	•	Scope: local-first book creator with voice prompts, AI-assisted drafting, manual editing, image support, EPUB/PDF export, JSON import/export, offline-first shell.
	•	Non-Goals: server databases; multi-user real-time collaboration; cloud sync; DRM; payment systems.

⸻

1) Architecture
	•	Framework: Next.js (App Router) + TypeScript.
	•	UI: React 19, TailwindCSS, shadcn/ui, lucide-react icons, TipTap editor (Markdown + rich text).
	•	State: Zustand (project + UI slices).
	•	Storage: IndexedDB (Dexie or idb-keyval) for projects and media blobs; localStorage for small UI prefs.
	•	AI access: Next.js Route Handlers as stateless proxies to providers (OpenAI, etc.). No persistence server-side.
	•	PWA: Service Worker caches app shell, fonts, and latest project snapshot; offline indicator and queueing for AI calls.
	•	Workers: Web Worker for audio encoding; optional Worker for EPUB build to keep UI responsive.

⸻

2) Offline Policy
	•	Full editing, outlining, importing, exporting, image placement, EPUB/PDF generation work offline.
	•	Network required only for AI calls (LLM drafting/rewrite, transcription, image generation).
	•	If offline, AI buttons disabled with tooltip; a small “Queue when online” toggle can enqueue requests for automatic retry.

⸻

3) Data Model (Client-Side Only)

// /types/book.ts
export type UUID = string;

export interface StylePreset {
  id: UUID;
  name: string;                 // e.g., "Crisp Nonfiction", "Warm Literary", "Snappy YA"
  pov: '1p'|'3p-limited'|'omniscient';
  tense: 'past'|'present';
  voice: string;                // freeform description
  constraints?: string[];       // e.g., "no profanity", "short sentences"
}

export interface AuthorTargets {
  audience: string;             // free text; also offered via select
  minChapterWords?: number;
  maxChapterWords?: number;
  minSectionWords?: number;
  maxSectionWords?: number;
}

export interface BookMeta {
  id: UUID;
  title: string;
  subtitle?: string;
  authorName?: string;
  language: string;             // BCP-47, e.g., "en"
  genre?: string;
  tagline?: string;
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
  version: number;
}

export interface MediaRef {
  id: UUID;                     // key in media store
  kind: 'audio'|'image';
  mime: string;
  createdAt: string;
  altText?: string;             // for images
  caption?: string;             // images
}

export interface Section {
  id: UUID;
  title: string;
  summary?: string;
  content: string;              // Markdown
  images?: MediaRef[];          // embedded images
  audioRefs?: UUID[];           // recorded prompts
}

export interface Chapter {
  id: UUID;
  title: string;
  synopsis?: string;
  sections: Section[];
  notes?: string;
  status: 'outline'|'draft'|'revising'|'final';
  wordCount?: number;           // computed
}

export interface OutlineNode {
  id: UUID;
  type: 'part'|'chapter'|'section';
  title: string;
  children?: OutlineNode[];
}

export interface ChangeRecord {
  id: UUID;
  timestamp: string;
  path: string;                 // json-pointer-like
  prev?: any;
  next?: any;
}

export interface BookProject {
  meta: BookMeta;
  premise: string;
  outline: OutlineNode[];
  chapters: Chapter[];
  targets: AuthorTargets;       // author-chosen targets
  stylePresetId: UUID;          // selected style lock
  customStyle?: StylePreset;    // optional custom
  history?: ChangeRecord[];
  coverImageId?: UUID;          // media store key (optional)
}

MediaStore (IndexedDB “blobs” store):

key: UUID → { kind, mime, bytes(ArrayBuffer), createdAt, meta? }

Validation: zod schemas for all interfaces; reject invalid imports and show actionable errors.

⸻

4) Select Options (Author-Defined)
	•	Audience: “Children”, “Middle Grade”, “Young Adult”, “Adult”, “Academic”, “Professional”, “General”, “Custom”.
	•	Genre: selectable list + “Custom”.
	•	Structure: “3-Act”, “4-Part”, “Hero’s Journey”, “Nonfiction Guide”, “How-To”, “Episodic”, “Custom”.
	•	Style Presets (style lock):
	•	Crisp Nonfiction (3p, present, concise, imperative lean).
	•	Warm Literary (3p-limited, past, descriptive, varied cadence).
	•	Snappy YA (1p, present, short paras, high dialogue ratio).
	•	Thriller Pace (3p-limited, past, short sentences, high tension).
	•	Tech How-To (2nd person tone via instructions, present).
	•	Custom (author defines POV/tense/voice; becomes locked).
	•	Targets:
	•	Min/Max Chapter Words (numeric).
	•	Min/Max Section Words (numeric).

Enforcement: soft-hard gates. Warnings at editor level; AI prompts include numeric targets; export wizard flags chapters outside min/max.

⸻

5) Core Flows

5.1 New Project → Premise → Outline
	1.	New Project Modal: Title, Author, Language, Genre, Audience (select), Structure (select), Style (select), Targets (min/max words).
	2.	Premise Capture: textarea + Record (MediaRecorder → /api/transcribe).
	3.	Generate Outline: /api/generate with task:'outline', structure, genre, audience, targets, style lock.
	4.	Outline Editor: tree view with drag-drop, add/remove nodes, convert nodes (section→chapter), “Edit via Prompt” uses /api/generate task:'revise_outline' and shows diff preview.

5.2 Chapter Drafting & Editing
	1.	Select chapter → Brief via text or record voice → /api/transcribe.
	2.	/api/generate task:'chapter_draft' streams Markdown into editor.
	3.	Editor:
	•	Markdown + rich formatting; word count; target compliance meter.
	•	AI actions: “Clarify/Condense/Expand/Adjust Tone”, each via /api/generate task:'rewrite' with style lock.
	•	Add Section: text/voice brief → /api/generate task:'section_draft'.
	•	Insert Images: upload or generate via /api/image task:'generate' with prompt; images stored in media store; embed via Markdown figure component.
	•	“Style Check” runs synchronous heuristics (POV pronouns, tense markers) and an optional quick LLM check (when online).

5.3 Versioning, Snapshots, Undo/Redo
	•	Undo/Redo from history records.
	•	“Snapshot Now” saves deep copy with timestamp; snapshot diff viewer via jsondiffpatch; restore snapshot.

5.4 Import/Export
	•	Import .book.json → validate with zod → add as new project or replace current.
	•	Export:
	•	JSON bundle.
	•	EPUB 3: valid spine, nav, per-chapter XHTML, embedded images, cover.
	•	PDF: React-PDF typeset, consistent margins, ToC, running headers/footers.

⸻

6) API Route Handlers (stateless)

POST /api/transcribe
body: { audio: Blob, mime: string, language?: string }
resp: { text: string, durationMs: number }

POST /api/generate    // streams SSE
body: {
  task: 'outline'|'revise_outline'|'chapter_draft'|'section_draft'|'rewrite'|'style_check',
  project: Partial<BookProject>,     // only necessary context
  targetId?: UUID,                   // chapter/section
  userBrief?: string,                // transcribed or typed
  controls?: { temperature?: number; maxTokens?: number }
}

POST /api/image
body: {
  task: 'generate'|'variation'|'edit',
  prompt?: string, referencedImageId?: UUID, mask?: string
}
resp: { mediaId: UUID }             // stored client-side; route returns bytes then client persists

Provider keys remain server-side via environment variables. Size limits enforced.

⸻

7) Prompting (Style-Locked)

Outline

System: Professional book architect. Enforce author's style lock and numeric targets.
Style Lock: POV={{pov}}, Tense={{tense}}, Voice="{{voice}}", Constraints={{constraints}}
Targets: Chapters words {{minCh}}–{{maxCh}}, Sections {{minSec}}–{{maxSec}}
Structure={{structure}}, Genre={{genre}}, Audience={{audience}}, Language={{lang}}
Task: Produce hierarchical JSON OutlineNode[] with Parts (optional) → Chapters → Section bullets.
Rules: escalating stakes (fiction) or logical progression (nonfiction), end-of-chapter hooks, avoid redundancy.
Return JSON only.

Chapter Draft

System: Senior author collaborating with user. Obey style lock strictly.
Context: Premise={{premise}}, Outline node={{outlineNode}}, Prior chapter summaries={{prior}}
Targets: Chapter words {{minCh}}–{{maxCh}}; Sections {{minSec}}–{{maxSec}}
Author Brief: {{brief}}
Task: Draft chapter in Markdown with H2 for sections. Keep continuity, avoid recap. Fit within targets.

Section Draft

System: Section writer. Obey style lock and targets.
Context: Chapter synopsis={{synopsis}}; Section intent={{brief}}
Task: Draft a single section in Markdown. Fit within {{minSec}}–{{maxSec}} words.

Rewrite

System: Editor. Operation={{op}}. Obey style lock. Preserve facts/continuity.
Input: <<<{{excerpt}}>>> 
Output: Revised Markdown only.

Style Check (optional LLM)

System: Style auditor. Verify POV={{pov}}, Tense={{tense}}, Voice~"{{voice}}".
Report JSON: { povOk, tenseOk, notes[], suggestedEdits? }


⸻

8) UI Composition

/app
  /(editor)
    /project/[id]/page.tsx        // Workspace
    /export/page.tsx              // Export wizard
    /settings/page.tsx            // Style & targets, AI providers
  /api/generate/route.ts
  /api/transcribe/route.ts
  /api/image/route.ts

/components
  EditorShell.tsx                 // layout, top bar, status
  NewProjectModal.tsx
  OutlineTree.tsx                 // drag-drop tree
  ChapterList.tsx                 // statuses, compliance badges
  ChapterEditor.tsx               // TipTap + Markdown pane
  VoiceRecorder.tsx               // record/pause/trim
  PromptBar.tsx                   // text+voice prompt
  DiffPreview.tsx                 // split diff accept/reject
  TargetMeter.tsx                 // min/max compliance
  StyleLockBadge.tsx
  ImagePicker.tsx                 // upload/generate/select
  ExportWizard.tsx
  SnapshotManager.tsx
  OfflineGuard.tsx                // disables AI and shows queue

/lib
  idb.ts                          // persistence helpers
  epub/buildEpub.ts               // worker-capable
  pdf/buildPdf.tsx                // React-PDF doc
  ai/prompts.ts
  ai/generateClient.ts            // SSE stream client with cancel
  audio/encodeWorker.ts           // WAV/OGG encoder
  images/manifest.ts              // image placeholders, cover defaults

/store
  useProjectStore.ts
  useUIStore.ts

/types
  book.ts
  api.ts

Key UI elements:
	•	Left: OutlineTree + ChapterList with status pills and target meters.
	•	Center: ChapterEditor with word count, section navigator.
	•	Right: AI Sidebar (PromptBar, DiffPreview, StyleCheck panel, transcription log).
	•	Floating VoiceRecorder with hotkey R.

⸻

9) Persistence & Autosave
	•	IndexedDB stores:
	•	projects (BookProject by meta.id).
	•	media (audio/image blobs).
	•	snapshots (frozen BookProject states).
	•	Autosave: 1s debounce; version increment.
	•	On export, images optionally bundled (EPUB embeds; JSON references may include base64 or instruct separate media zip).

⸻

10) Export Details

10.1 EPUB 3
	•	Files:
	•	mimetype (stored, no compression)
	•	META-INF/container.xml
	•	OEBPS/content.opf
	•	OEBPS/nav.xhtml
	•	OEBPS/cover.xhtml + images/cover.(jpg|png) if present
	•	OEBPS/ch-XX.xhtml per chapter; sections as anchors
	•	Embedded images per chapter under OEBPS/images/*
	•	Metadata: title, creator, language, UUID identifier, modified date.
	•	CSS: book.css with readable defaults; image figure styles; widows/orphans hints.
	•	Validation: run local epubcheck only if provided; otherwise basic manifest sanity.

10.2 PDF (React-PDF)
	•	Deterministic typesetting independent of DOM.
	•	Page size presets: US Letter, A4, 6×9”, 5.5×8.5”.
	•	Layout:
	•	Front matter: title page, copyright, ToC.
	•	Running header/footer: Book • Chapter • page #.
	•	Figure support: images with captions.
	•	Hyphenation disabled by default; font embedding (serif body, sans headers).

10.3 JSON
	•	book-{slug}-{timestamp}.book.json with schema version.
	•	Optional “Media Bundle” zip: JSON + /media/* with manifest.json mapping media IDs.

⸻

11) Image Support
	•	Insert uploaded images into sections; alt text and captions required.
	•	Cover generator:
	•	/api/image task:'generate' with style prompt; user can upload own cover instead.
	•	Basic image tools: resize constraints, alignment, caption toggle.

⸻

12) Style Lock Enforcement
	•	At generation: prompts pinned to selected StylePreset; POV/tense/voice included explicitly.
	•	At edit time: StyleCheck button runs heuristics:
	•	POV drift: pronoun scans; dialogue attribution checks.
	•	Tense drift: verb forms frequency.
	•	Sentence cadence heuristics against preset.
	•	Optional LLM style audit (online) returning small suggested edits.
	•	Blocks “Apply” for AI outputs that violate lock unless user overrides.

⸻

13) Targets Enforcement
	•	Live meters:
	•	Chapter: green within [minChapterWords, maxChapterWords], amber out-of-range.
	•	Section: per-section meters.
	•	Export wizard flags chapters/sections outside targets; allow force export.

⸻

14) Performance & Cost Controls
	•	Token estimator before long drafts; show approximate cost.
	•	Draft in sections (streaming) to keep UI responsive.
	•	Cache summaries of prior chapters for continuity prompts.

⸻

15) Security
	•	API keys only in Route Handlers; never exposed client-side.
	•	Strict request size limits; audio duration caps; MIME validation.
	•	Sanitize HTML when converting Markdown for EPUB/PDF.
	•	No password encryption for JSON per requirements.

⸻

16) Testing
	•	Unit: zod schemas, prompt compilers, EPUB manifest builder, word-count validators.
	•	Integration: record→transcribe→draft→edit→export flow.
	•	Snapshot tests for React-PDF document tree.
	•	Offline tests: service worker + AI controls disabled.
	•	Large book soak: 30+ chapters, hundreds of sections, images embedded.

⸻

17) MVP Definition of Done
	•	New project with selects for Audience/Genre/Structure/Style and numeric Targets.
	•	Premise capture (text/voice), AI outline generation, outline edit via prompt and manual.
	•	Chapter flow: voice brief → transcription → AI draft → edit; add sections; image insertion.
	•	Style lock enforced in prompts and editor checks.
	•	Target meters live; warnings in export.
	•	Offline editing; AI disabled offline; JSON/EPUB/PDF exports work.
	•	No server DB; all data local.

⸻

18) File Skeleton

/app
  /layout.tsx
  /page.tsx
  /project/[id]/page.tsx
  /export/page.tsx
  /settings/page.tsx
  /api/generate/route.ts
  /api/transcribe/route.ts
  /api/image/route.ts
/components
  EditorShell.tsx
  NewProjectModal.tsx
  OutlineTree.tsx
  ChapterList.tsx
  ChapterEditor.tsx
  VoiceRecorder.tsx
  PromptBar.tsx
  DiffPreview.tsx
  TargetMeter.tsx
  StyleLockBadge.tsx
  ImagePicker.tsx
  ExportWizard.tsx
  SnapshotManager.tsx
  OfflineGuard.tsx
/lib
  idb.ts
  epub/buildEpub.ts
  pdf/buildPdf.tsx
  ai/prompts.ts
  ai/generateClient.ts
  audio/encodeWorker.ts
  images/manifest.ts
/store
  useProjectStore.ts
  useUIStore.ts
/types
  book.ts
  api.ts


⸻

19) Implementation Notes
	•	TipTap: store canonical Markdown; render to HTML for preview and for EPUB XHTML generation with a sanitizer.
	•	Audio: record WebM/Opus; worker-encode WAV if provider needs PCM; store as blobs by UUID.
	•	React-PDF: implement a dedicated renderer mapping Markdown → React-PDF elements with a small AST transform; consistent typography across exports.
	•	EPUB build in a Worker to avoid main-thread blocks on large books.
	•	Snapshots: diff viewer highlights chapter/section changes; restore duplicates project with new UUID to avoid accidental overwrite.

⸻

20) Fast-Follows
	•	Character/Concept Bible auto-extraction.
	•	TTS read-aloud per chapter.
	•	Dual-language export via translate-on-export.
	•	JSON three-way merge for manual “collab”.
	•	Themeable cover templates with deterministic layouts.