# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice-to-Book is a local-first, offline-capable book creation tool that enables authors to create books using voice prompts, AI-assisted drafting, manual editing, and export to EPUB/PDF formats. The application runs entirely client-side with no server database.

## Development Commands

### Next.js Development
- `npm run dev` - Start development server (uses --turbopack for faster builds)
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint code linting
- `npm run type-check` - TypeScript type checking

### Testing (when implemented)
- `npm test` - Run all tests
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- <filename>` - Run specific test file

## Architecture

### Technology Stack
- **Framework**: Next.js (App Router) with TypeScript
- **UI**: React 19, TailwindCSS, shadcn/ui, lucide-react icons
- **Editor**: TipTap (Markdown + rich text)
- **State Management**: Zustand (separate slices for project data and UI state)
- **Client Storage**: IndexedDB via Dexie or idb-keyval for projects and media blobs; localStorage for UI preferences
- **AI Integration**: Next.js Route Handlers as stateless proxies to OpenAI and other providers
- **PWA**: Service Worker for offline support, app shell caching, and request queueing
- **Workers**: Web Worker for audio encoding; optional Worker for EPUB building

### Offline-First Design
- All editing, outlining, importing, exporting, image placement, EPUB/PDF generation work offline
- Network required ONLY for: AI generation, transcription, image generation
- Offline state: AI buttons disabled with tooltips; optional queue for retry when online
- Service Worker caches app shell, fonts, and latest project snapshot

## Data Architecture

### Storage Strategy
Three IndexedDB stores:
1. **projects**: BookProject objects keyed by meta.id
2. **media**: Audio/image blobs keyed by UUID
3. **snapshots**: Frozen BookProject states for version control

Autosave: 1-second debounce with version increment

### Core Data Model (types/book.ts)

Key interfaces:
- `BookProject`: Top-level container with meta, premise, outline, chapters, targets, style preset
- `Chapter`: Contains sections array, status ('outline'|'draft'|'revising'|'final'), word count
- `Section`: Individual content units with Markdown content, images, audio references
- `OutlineNode`: Hierarchical tree (part → chapter → section)
- `StylePreset`: POV, tense, voice, constraints (the "style lock")
- `AuthorTargets`: Min/max word counts for chapters and sections
- `MediaRef`: References to stored audio/image blobs

All interfaces validated with Zod schemas

## API Routes (Stateless Proxies)

### POST /api/transcribe
Converts audio to text via Whisper API
- Input: `{ audio: Blob, mime: string, language?: string }`
- Output: `{ text: string, durationMs: number }`

### POST /api/generate
Streams AI-generated content via SSE
- Tasks: 'outline', 'revise_outline', 'chapter_draft', 'section_draft', 'rewrite', 'style_check'
- Input: `{ task, project, targetId?, userBrief?, controls? }`
- Output: Streaming text or JSON

### POST /api/image
Generates/edits images via DALL-E
- Tasks: 'generate', 'variation', 'edit'
- Input: `{ task, prompt?, referencedImageId?, mask? }`
- Output: `{ mediaId: UUID }`

All API keys stored server-side via environment variables. Routes enforce size limits and MIME validation.

## Style Lock System

The "style lock" is a core concept enforcing consistency:
- **POV**: '1p' | '3p-limited' | 'omniscient'
- **Tense**: 'past' | 'present'
- **Voice**: Freeform description
- **Constraints**: Array of rules (e.g., "no profanity", "short sentences")

Enforcement:
1. All AI prompts include explicit style lock parameters
2. StyleCheck runs heuristics (POV pronouns, tense markers, sentence cadence)
3. Optional LLM-based style audit when online
4. User must override to apply AI outputs that violate the lock

## Target Enforcement

Authors set numeric targets:
- `minChapterWords` / `maxChapterWords`
- `minSectionWords` / `maxSectionWords`

Live UI meters show compliance:
- Green: within range
- Amber: out of range
- Export wizard flags violations but allows force export

## AI Prompting Strategy

All prompts follow a consistent pattern:
1. System message establishes role and enforces style lock
2. Context includes premise, outline node, prior chapter summaries
3. Targets explicitly stated with min/max word counts
4. User brief (transcribed or typed) provides specific direction
5. Output format specified (JSON for outline, Markdown for content)

Key prompts in `lib/ai/prompts.ts`:
- Outline generation with hierarchical JSON output
- Chapter drafting with continuity from prior chapters
- Section drafting with focus on word targets
- Rewrite operations (clarify, condense, expand, adjust tone)
- Style check audits

## Component Structure

### Layout Components
- `EditorShell.tsx`: Main workspace layout with top bar and status
- `OfflineGuard.tsx`: Disables AI features and shows queue when offline

### Content Creation
- `NewProjectModal.tsx`: Setup wizard with selects for audience, genre, structure, style, targets
- `OutlineTree.tsx`: Drag-drop tree editor with node conversion
- `ChapterList.tsx`: Status pills and compliance badges
- `ChapterEditor.tsx`: TipTap editor with Markdown pane

### AI Interaction
- `VoiceRecorder.tsx`: Record/pause/trim with hotkey 'R'
- `PromptBar.tsx`: Combined text/voice prompt input
- `DiffPreview.tsx`: Split diff with accept/reject for AI edits

### Validation & Feedback
- `TargetMeter.tsx`: Live word count compliance indicator
- `StyleLockBadge.tsx`: Visual reminder of current style constraints

### Export & Versioning
- `ExportWizard.tsx`: Multi-step export with format selection (JSON/EPUB/PDF)
- `SnapshotManager.tsx`: Version history with diff viewer and restore
- `ImagePicker.tsx`: Upload/generate/select images with alt text and captions

## Export Formats

### EPUB 3
- Valid spine, nav.xhtml, per-chapter XHTML files
- Embedded images, cover support
- CSS with readable defaults (book.css)
- Metadata: title, creator, language, UUID identifier
- Built in Web Worker to avoid blocking main thread

### PDF (React-PDF)
- Deterministic typesetting independent of DOM
- Page sizes: US Letter, A4, 6×9", 5.5×8.5"
- Front matter: title page, copyright, ToC
- Running headers/footers: Book • Chapter • page #
- Markdown → React-PDF AST transform

### JSON
- `book-{slug}-{timestamp}.book.json` with schema version
- Optional Media Bundle: ZIP with /media/* and manifest.json

## File Structure

```
/app
  /(editor)
    /project/[id]/page.tsx        # Main workspace
    /export/page.tsx              # Export wizard
    /settings/page.tsx            # Style & targets, AI provider config
  /api/generate/route.ts          # AI generation proxy
  /api/transcribe/route.ts        # Speech-to-text proxy
  /api/image/route.ts             # Image generation proxy

/components
  EditorShell.tsx, NewProjectModal.tsx, OutlineTree.tsx,
  ChapterList.tsx, ChapterEditor.tsx, VoiceRecorder.tsx,
  PromptBar.tsx, DiffPreview.tsx, TargetMeter.tsx,
  StyleLockBadge.tsx, ImagePicker.tsx, ExportWizard.tsx,
  SnapshotManager.tsx, OfflineGuard.tsx

/lib
  idb.ts                          # IndexedDB persistence helpers
  epub/buildEpub.ts               # EPUB 3 builder (worker-capable)
  pdf/buildPdf.tsx                # React-PDF document generator
  ai/prompts.ts                   # System prompts for all AI tasks
  ai/generateClient.ts            # SSE stream client with cancel
  audio/encodeWorker.ts           # WAV/OGG encoder (Web Worker)
  images/manifest.ts              # Image placeholders, cover defaults

/store
  useProjectStore.ts              # Zustand store for book data
  useUIStore.ts                   # Zustand store for UI state

/types
  book.ts                         # Core data model interfaces
  api.ts                          # API request/response types
```

## Implementation Notes

### TipTap Integration
- Store canonical Markdown in data model
- Render to HTML for preview
- Sanitize HTML when converting for EPUB/PDF
- Use Markdown AST transform for React-PDF rendering

### Audio Processing
- Record in WebM/Opus format
- Worker-encode to WAV if API provider needs PCM
- Store blobs in IndexedDB by UUID
- Duration caps and MIME validation

### Performance Considerations
- Token estimator before long drafts to show approximate cost
- Draft in sections with streaming to keep UI responsive
- Cache summaries of prior chapters for continuity prompts
- EPUB build in Worker to avoid main-thread blocks on large books

### Snapshot System
- Diff viewer highlights chapter/section changes via jsondiffpatch
- Restore creates duplicate project with new UUID to avoid accidental overwrite
- Deep copy with timestamp for each snapshot

## Selectable Options

### Audience
Children, Middle Grade, Young Adult, Adult, Academic, Professional, General, Custom

### Structure
3-Act, 4-Part, Hero's Journey, Nonfiction Guide, How-To, Episodic, Custom

### Style Presets
- **Crisp Nonfiction**: 3p, present, concise, imperative lean
- **Warm Literary**: 3p-limited, past, descriptive, varied cadence
- **Snappy YA**: 1p, present, short paragraphs, high dialogue ratio
- **Thriller Pace**: 3p-limited, past, short sentences, high tension
- **Tech How-To**: 2nd person tone, present
- **Custom**: User-defined POV/tense/voice

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY` - OpenAI API for generation and transcription
- `OPENAI_ORG_ID` - (Optional) OpenAI organization ID

Optional providers:
- Additional AI provider keys as needed

## Security

- API keys only in Route Handlers, never exposed client-side
- Strict request size limits enforced
- Audio duration caps to prevent abuse
- MIME type validation on all uploads
- HTML sanitization for Markdown conversion
- No password encryption for JSON exports (per requirements)

## Testing Strategy

### Unit Tests
- Zod schema validation
- Prompt compiler functions
- EPUB manifest builder
- Word count validators
- Style check heuristics

### Integration Tests
- Full flow: record → transcribe → draft → edit → export
- Offline mode: service worker + AI controls disabled
- Large book soak: 30+ chapters, hundreds of sections, embedded images

### Snapshot Tests
- React-PDF document tree determinism
- EPUB structure validation

## MVP Definition of Done

- [ ] New project wizard with all selects (Audience/Genre/Structure/Style) and numeric Targets
- [ ] Premise capture via text or voice with AI outline generation
- [ ] Outline editor with drag-drop, manual editing, and AI-assisted prompt editing
- [ ] Chapter drafting flow: voice brief → transcription → AI draft → manual edit
- [ ] Section addition with text/voice briefs
- [ ] Image insertion (upload + AI generation)
- [ ] Style lock enforcement in prompts and editor checks
- [ ] Target meters with live compliance feedback
- [ ] Warnings in export wizard for out-of-range content
- [ ] Offline editing with AI features disabled when no network
- [ ] JSON/EPUB/PDF exports all functional
- [ ] No server database; all data stored locally in IndexedDB

## Development Workflow

1. Start with data model (types/book.ts) and Zod schemas
2. Implement IndexedDB persistence layer (lib/idb.ts)
3. Build Zustand stores with autosave logic
4. Create API routes as stateless proxies
5. Implement core components (EditorShell, ChapterEditor)
6. Add voice recording and transcription
7. Build AI generation flows with streaming
8. Implement export formats (JSON → EPUB → PDF)
9. Add snapshot/versioning system
10. Implement offline support with Service Worker
