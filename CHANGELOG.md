# Changelog

All notable changes to Voice-to-Book Creator will be documented in this file.

## [1.0.0] - 2025-10-24

### 🎉 Initial Release

A fully functional local-first book creation tool with AI assistance, voice input, and rich text editing.

### ✅ Added

#### Core Features
- **Project Management**
  - New project creation with comprehensive setup wizard
  - Project list view on home page
  - Auto-save with 1-second debounce
  - IndexedDB persistence for all data

#### AI Integration
- **OpenAI GPT-4 Integration**
  - Streaming chapter generation
  - Outline generation from premise
  - Style-locked prompts (POV, tense, voice)
  - Real-time content streaming with SSE
  - Cancellable AI requests

- **Whisper API Integration**
  - Voice-to-text transcription
  - Multiple audio format support
  - 25MB file size limit
  - Duration and quality optimization

#### Editing Experience
- **TipTap Rich Text Editor**
  - Formatting toolbar (bold, italic, headings, lists, quotes)
  - Undo/redo support
  - Markdown-compatible
  - Real-time word count
  - Section-based structure with ## headings

- **Voice Input**
  - Floating recorder button
  - Keyboard shortcut (Cmd/Ctrl+R)
  - Real-time transcription
  - Append to content

#### AI Assistance
- **AI Sidebar**
  - Custom prompt/brief input
  - Streaming generation display
  - Accept/reject workflow
  - Context-aware (includes prior chapters)
  - Offline detection and graceful degradation

- **Premise Modal**
  - Voice or text input
  - AI outline generation
  - Hierarchical outline preview
  - Optional skip for manual writing

#### Style System
- **5 Predefined Style Presets**
  - Crisp Nonfiction (3p, present)
  - Warm Literary (3p-limited, past)
  - Snappy YA (1p, present)
  - Thriller Pace (3p-limited, past)
  - Tech How-To (instructional, present)

- **Style Lock Enforcement**
  - Applied to all AI prompts
  - Maintains consistency across chapters
  - POV, tense, and voice specifications

#### Word Count System
- **Target Configuration**
  - Min/Max chapter words
  - Min/Max section words
  - Set during project creation

- **Visual Tracking**
  - Live word count updates
  - Target range indicators (green/red)
  - Per-chapter statistics
  - Warning when outside range

#### Data Management
- **IndexedDB Storage**
  - Projects store
  - Media blobs store
  - Snapshots store (prepared)

- **Zustand State Management**
  - Project store with full CRUD operations
  - UI store with preferences
  - Persistent localStorage for UI settings

#### Export
- **JSON Export**
  - Complete project backup
  - All metadata included
  - Downloadable .book.json file

#### Type System
- **Comprehensive TypeScript Definitions**
  - 20+ interfaces with Zod validation
  - Strict mode enabled
  - Runtime type checking
  - API request/response types

#### API Routes
- **POST /api/transcribe** - Whisper transcription
- **POST /api/generate** - GPT-4 streaming generation
- **POST /api/image** - DALL-E image generation (prepared)

### 🏗️ Technical Stack

- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.9.3 (strict mode)
- **Styling**: TailwindCSS 4.1.16
- **Editor**: TipTap 3.8.0
- **State**: Zustand 5.0.8
- **Storage**: Dexie 4.2.1 (IndexedDB)
- **Validation**: Zod 4.1.12
- **Icons**: Lucide React 0.548.0
- **UI Components**: Radix UI

### 📚 Documentation

- `README.md` - Comprehensive documentation
- `QUICKSTART.md` - Getting started guide
- `CLAUDE.md` - Developer guide for AI assistance
- `FEATURES.md` - Complete feature overview
- `prd.md` - Original product requirements
- `.env.example` - Environment configuration template

### 🎯 Metrics

- **Build Time**: ~1 second with Turbopack
- **Production Build**: ✅ Successful
- **Type Checking**: ✅ Passes
- **Components**: 8 major, 15+ total
- **Lines of Code**: 4,500+

### 🚧 Known Limitations

- EPUB export not yet implemented
- PDF export not yet implemented
- Drag-and-drop outline editor pending
- Image generation UI pending
- Snapshot/version UI pending
- Service Worker for offline PWA pending

---

## [Unreleased]

### Planned for V1.1

#### High Priority
- Drag-and-drop outline editor with reordering
- EPUB 3 export with proper structure
- PDF export via React-PDF
- Service Worker for offline PWA support

#### Medium Priority
- Image generation and embedding UI
- Section-level AI rewriting (clarify, condense, expand)
- Snapshot/version management UI
- Style check UI with suggestions
- Settings page for editing targets and style

#### Low Priority
- Character/concept tracking system
- TTS read-aloud feature
- Multi-language support
- Custom theme creation
- Keyboard shortcuts panel

---

## Development Notes

### Build Status
- ✅ Production builds successfully
- ✅ TypeScript strict mode passing
- ✅ No runtime errors in base implementation
- ✅ All API routes functional

### Architecture Decisions
1. **Local-First**: All data in IndexedDB, no server database
2. **Streaming AI**: SSE for real-time generation feedback
3. **Type Safety**: Zod + TypeScript for runtime and compile-time validation
4. **State Management**: Zustand for simplicity and performance
5. **Rich Text**: TipTap for extensibility and Markdown compatibility

### Performance Optimizations
- Auto-save debouncing (1 second)
- Streaming AI responses
- IndexedDB for large data sets
- Turbopack for fast dev builds
- Production bundle optimization

---

**Legend**:
- ✅ Fully implemented and tested
- 🚧 In progress or partially complete
- 📝 Planned for future release
