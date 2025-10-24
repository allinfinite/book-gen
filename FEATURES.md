# Voice-to-Book Creator - Feature Overview

## Version 1.0 - Complete Features

### 🎯 Core Workflow

#### 1. Project Creation & Settings
- **New Project Modal** with comprehensive setup
  - Title, subtitle, author name
  - Genre selection (18 options)
  - Audience targeting (8 options)
  - Book structure presets (7 options)
  - Style lock selection (5 presets)
  - Word count targets (chapter and section min/max)

- **Book Settings Modal** (editable anytime)
  - Update all project details after creation
  - Change genre, audience, and style presets
  - Adjust word count targets
  - Accessible via "Settings" button in project header
  - All changes immediately apply to future AI generation

#### 2. Premise & Outline Generation
- **Premise Input** with voice or text
- **AI Outline Generation** via GPT-4
  - Streaming generation with live preview
  - Hierarchical structure (parts → chapters → sections)
  - Style-lock aware prompts
  - Optional: skip and write manually

#### 3. Chapter Writing
- **Rich Text Editor** (TipTap-based)
  - Bold, italic formatting
  - H2/H3 headings
  - Bullet and numbered lists
  - Block quotes
  - Undo/redo
  - Real-time word count

- **AI-Assisted Drafting**
  - Sidebar with generation options
  - Custom prompt/brief input
  - Streaming chapter generation
  - Accept/reject workflow
  - Context-aware (includes prior chapters)

- **Voice Input**
  - Integrated directly into AI sidebar
  - Inline recording interface
  - Real-time transcription via Whisper API
  - Auto-populates prompt field for AI generation
  - Seamless voice-to-AI workflow

#### 4. Chapter Management
- **Smart "Add Chapter" Button**
  - Split button with dropdown menu
  - **Quick add**: Empty chapter (write manually)
  - **AI Generated Outline**: Opens modal to generate chapter structure
    - Creates chapter and section **titles only** (not content)
    - Voice or text input for describing book structure
    - Generates hierarchical outline (parts, chapters, sections)
    - Preview structure before accepting
    - Adds all empty chapters to project with one click
    - You write the actual content yourself later

- **Chapter List Sidebar**
  - Visual status indicators
  - Section count display
  - Word count per chapter
  - Click to switch chapters
  - Delete chapter option

- **Word Count Tracking**
  - Live count updates
  - Target range indicators
  - Visual warning when outside range
  - Per-chapter and total tracking

#### 5. Data Persistence
- **Auto-Save** (1-second debounce)
- **IndexedDB Storage**
  - Projects
  - Media blobs
  - Snapshots (planned)
- **Version tracking** on each save

#### 6. Export & Import
- **JSON Export** (fully functional)
  - Complete project backup
  - All metadata included
  - Downloadable .book.json file
  
- **JSON Import** (fully functional)
  - Import previously exported projects
  - Accessible from home page header
  - Automatic ID generation (prevents conflicts)
  - Marks imported projects with "(Imported)" suffix
  - Validates file format before import
  - Auto-navigates to imported project
  
- **EPUB 3** (coming soon)
- **PDF** (coming soon)

---

## 🎨 Style Lock System

### Predefined Presets

1. **Crisp Nonfiction**
   - POV: 3rd person limited
   - Tense: Present
   - Voice: Concise, imperative lean

2. **Warm Literary**
   - POV: 3rd person limited
   - Tense: Past
   - Voice: Descriptive, varied cadence

3. **Snappy YA**
   - POV: 1st person
   - Tense: Present
   - Voice: Short paragraphs, high dialogue

4. **Thriller Pace**
   - POV: 3rd person limited
   - Tense: Past
   - Voice: Short sentences, high tension

5. **Tech How-To**
   - POV: 3rd person limited
   - Tense: Present
   - Voice: Instructional, step-by-step

### Style Lock Enforcement
- Applied to all AI generation prompts
- Includes POV, tense, voice, and constraints
- Helps maintain consistency across chapters

---

## 🤖 AI Integration

### Available AI Tasks

**All AI tasks automatically use your book settings:**
- ✅ **Genre** (enforces genre conventions)
- ✅ **Audience** (adjusts complexity and tone)
- ✅ **Style Lock** (POV, tense, voice, constraints)
- ✅ **Word Count Targets** (aims for specified ranges)

1. **Outline Generation**
   - Input: Premise, genre, audience, structure
   - Output: Hierarchical JSON outline
   - Respects style lock and word targets

2. **Chapter Drafting**
   - Input: Chapter title, brief, context
   - Output: Streaming Markdown content
   - Includes prior chapter summaries
   - Matches genre conventions and audience level
   - Enforces word count targets and style lock

3. **Section Drafting** (API ready)
   - Input: Section title and intent
   - Output: Single section content
   - Genre-aware and style-locked
   - Respects section word targets

4. **Content Rewriting** (API ready)
   - Operations: Clarify, condense, expand, adjust tone
   - Maintains style lock and genre conventions
   - Preserves facts and continuity

5. **Style Check** (API ready)
   - Verifies POV consistency
   - Checks tense alignment
   - Returns JSON with suggestions

### AI Features
- **Streaming responses** for real-time feedback
- **Cancellable requests** via AbortController
- **Error handling** with user-friendly messages
- **Offline detection** disables AI features gracefully

---

## 🎙️ Voice Input

### Recorder Features
- **Floating UI** in bottom-right corner
- **Keyboard shortcut**: Cmd/Ctrl+R
- **Real-time duration** display
- **Auto-transcription** after stopping
- **Format support**: WebM/Opus audio

### Integration Points
1. Premise input
2. Chapter content dictation
3. AI brief/prompt dictation (via premise modal)

---

## 💾 Data Architecture

### Type System
- **Zod validation** on all data models
- **TypeScript strict mode**
- **Comprehensive interfaces**:
  - BookProject
  - Chapter (with sections)
  - Section (with content and media)
  - OutlineNode (recursive)
  - StylePreset
  - AuthorTargets

### Storage Strategy
- **3 IndexedDB stores**:
  1. `projects` - BookProject objects
  2. `media` - Audio/image blobs
  3. `snapshots` - Version history

- **Zustand state management**:
  1. `useProjectStore` - Project data and operations
  2. `useUIStore` - UI state and preferences

---

## 🎯 Word Count Targets

### Configuration
- **Min/Max Chapter Words**
- **Min/Max Section Words**
- Set during project creation
- Editable in settings (planned)

### Visual Indicators
- **Green**: Within target range
- **Red/Warning**: Outside target range
- **Live updates** as you type
- **AI-aware**: Prompts include targets

---

## 🔌 API Routes

### POST /api/transcribe
- Whisper API integration
- Accepts: audio/webm, audio/wav, audio/mp3
- Max size: 25MB
- Returns: { text, durationMs }

### POST /api/generate
- GPT-4o-mini streaming
- Server-Sent Events (SSE)
- Tasks: outline, chapter_draft, section_draft, rewrite, style_check
- Cancellable via client abort

### POST /api/image
- DALL-E 3 integration
- Tasks: generate, variation, edit
- Returns: Base64 encoded image + mediaId

---

## 🚀 Performance

### Optimizations
- **Auto-save debouncing** (1 second)
- **IndexedDB** for large data
- **Streaming AI responses** for perceived speed
- **Virtual scrolling** ready for outline (when implemented)

### Build
- ✅ **Production builds** successfully
- ✅ **Type checking** passes
- ✅ **Zero runtime errors** in base implementation
- **Turbopack** for fast dev builds

---

## 🎨 UI/UX

### Design System
- **TailwindCSS 4** for styling
- **Radix UI** primitives
- **Lucide React** icons
- **Responsive layout**
- **Dark mode ready** (class-based toggle)

### Key Components
1. `NewProjectModal` - Project setup wizard
2. `ChapterEditor` - TipTap rich text editor
3. `AISidebar` - AI generation interface
4. `VoiceRecorder` - Floating voice input
5. `PremiseModal` - Premise and outline capture

---

## 📦 What's Next (V1.1+)

### High Priority
- [ ] Drag-and-drop outline editor
- [ ] EPUB 3 export with proper structure
- [ ] PDF export via React-PDF
- [ ] Service Worker for offline PWA

### Medium Priority
- [ ] Image generation UI
- [ ] Section-level rewriting UI
- [ ] Snapshot/version management UI
- [ ] Style check UI with suggestions
- [ ] Settings page for targets and style

### Low Priority
- [ ] Character/concept tracking
- [ ] TTS read-aloud
- [ ] Multi-language support
- [ ] Theme customization
- [ ] Keyboard shortcuts panel

---

## 🎓 Learning Resources

- **CLAUDE.md** - Development guide
- **README.md** - Full documentation
- **QUICKSTART.md** - Getting started
- **prd.md** - Original product requirements

---

## ⚡ Quick Stats

- **Lines of Code**: ~4,500+
- **Components**: 8 major, 15+ total
- **API Routes**: 3 fully functional
- **Type Definitions**: 20+ interfaces
- **Dependencies**: 40+ packages
- **Build Time**: ~1 second (Turbopack)
- **Bundle Size**: Optimized (Next.js production)

---

Built with ❤️ using Next.js 16, React 19, and OpenAI APIs.
