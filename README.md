# Voice-to-Book Creator

A local-first, offline-capable book creation tool that enables authors to create books using voice prompts, AI-assisted drafting, manual editing, and export to multiple formats.

## Features

### Core Capabilities
- ✅ **Local-First Architecture**: All data stored in IndexedDB, no server database required
- ✅ **AI-Assisted Writing**: OpenAI GPT-4 integration with streaming generation
- ✅ **Voice Transcription**: Whisper API integration with floating recorder (Cmd/Ctrl+R)
- ✅ **Rich Text Editor**: TipTap editor with formatting toolbar and Markdown support
- ✅ **AI Generation UI**: Generate outlines and draft chapters with custom prompts
- ✅ **Style Lock System**: Enforces consistent POV, tense, and voice throughout your book
- ✅ **Word Count Targets**: Set and track min/max word counts with visual indicators
- ✅ **Multiple Export Formats**: JSON (complete), EPUB 3 (planned), PDF (planned)
- ✅ **Offline Support**: Full editing capabilities without internet connection
- 🚧 **Drag-and-Drop Outline**: Visual outline editor (coming soon)
- 🚧 **Image Generation**: DALL-E integration for cover and chapter images (API ready, UI pending)

### Built With
- **Next.js 16** (App Router) with TypeScript
- **React 19** for UI components
- **TailwindCSS 4** for styling
- **Zustand** for state management
- **Dexie** for IndexedDB persistence
- **Zod** for runtime type validation
- **OpenAI API** for AI features

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd book-creator
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a New Project

1. Click "New Project" on the home page
2. Fill in project details:
   - **Title & Subtitle**: Your book's name
   - **Author Name**: Your name
   - **Genre**: Fiction, Nonfiction, etc.
   - **Audience**: Target readership
   - **Structure**: 3-Act, Hero's Journey, etc.
   - **Style Preset**: Choose from predefined writing styles
   - **Word Count Targets**: Set min/max for chapters and sections

### Writing Your Book

1. **Enter Premise**: Describe your book idea (optional: use voice input)
2. **Generate Outline**: Click "Generate AI Outline" for structure suggestions
3. **Add Chapters**: Click "Add Chapter" in the sidebar
4. **Use AI Assistant**: Click "AI" button to show generation sidebar
   - Enter a brief describing what you want
   - Click "Generate Chapter" to draft with AI
   - Review and accept/reject generated content
5. **Manual Editing**: Use the rich text editor with formatting toolbar
6. **Voice Input**: Click "Voice" or press Cmd/Ctrl+R to dictate
7. **Track Progress**: Word count updates automatically with target indicators
8. **Auto-Save**: Changes save automatically every 1 second

### Style Presets

The app includes 5 predefined style presets:

- **Crisp Nonfiction**: 3rd person, present tense, concise and direct
- **Warm Literary**: 3rd person limited, past tense, descriptive
- **Snappy YA**: 1st person, present tense, contemporary and fast-paced
- **Thriller Pace**: 3rd person limited, past tense, high tension
- **Tech How-To**: Instructional, present tense, step-by-step

Each preset locks POV, tense, and voice for consistency.

### Exporting Your Book

1. Click "Export" in the project workspace
2. Choose format:
   - **JSON**: Full project backup with all metadata
   - **EPUB 3**: E-book format (coming soon)
   - **PDF**: Printable document (coming soon)

## Project Structure

```
book-creator/
├── app/
│   ├── api/                    # API routes for AI services
│   │   ├── generate/           # Text generation endpoint
│   │   ├── transcribe/         # Audio transcription endpoint
│   │   └── image/              # Image generation endpoint
│   ├── project/[id]/           # Project workspace
│   ├── export/                 # Export wizard
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── ui/                     # Reusable UI components
│   └── NewProjectModal.tsx     # Project creation modal
├── lib/
│   ├── ai/                     # AI prompt templates
│   ├── idb.ts                  # IndexedDB operations
│   └── utils.ts                # Utility functions
├── store/
│   ├── useProjectStore.ts      # Project data store
│   └── useUIStore.ts           # UI state store
├── types/
│   ├── book.ts                 # Core data models
│   └── api.ts                  # API types
├── CLAUDE.md                   # Claude Code instructions
└── README.md                   # This file
```

## Data Model

### BookProject
The main data structure containing:
- **meta**: Title, author, dates, version
- **premise**: Core book idea
- **outline**: Hierarchical structure (parts → chapters → sections)
- **chapters**: Array of chapter objects with sections
- **targets**: Word count min/max settings
- **stylePresetId**: Selected style lock
- **history**: Change records for undo/redo

### Storage
All data is stored locally in IndexedDB with three stores:
1. **projects**: BookProject objects
2. **media**: Audio/image blobs
3. **snapshots**: Version history snapshots

## API Routes

### POST /api/transcribe
Converts audio to text using OpenAI Whisper
- Input: FormData with audio file
- Output: `{ text: string, durationMs: number }`

### POST /api/generate
Streams AI-generated content
- Tasks: outline, chapter_draft, section_draft, rewrite, style_check
- Input: `{ task, project, targetId?, userBrief?, controls? }`
- Output: Server-Sent Events stream

### POST /api/image
Generates images using DALL-E
- Tasks: generate, variation, edit
- Input: `{ task, prompt?, referencedImageId? }`
- Output: `{ mediaId, data, mime }`

## Development

### Commands
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

### Environment Variables
```env
OPENAI_API_KEY=     # Required for AI features
OPENAI_ORG_ID=      # Optional organization ID
```

## Roadmap

### V1.0 Features (Complete)
- ✅ Project creation and management
- ✅ Chapter and section editing with TipTap
- ✅ Auto-save functionality
- ✅ JSON export
- ✅ Style lock system
- ✅ Word count tracking with targets
- ✅ API routes for AI services
- ✅ Voice recording and transcription
- ✅ AI-assisted outline generation
- ✅ AI-assisted chapter drafting with streaming
- ✅ Premise capture with voice option
- ✅ Rich text editor with toolbar

### Next Steps (V1.1+)
- 🚧 Drag-and-drop outline editor with reordering
- 🚧 EPUB 3 export implementation
- 🚧 PDF export with React-PDF
- 🚧 Service Worker for true offline PWA
- 🚧 Image generation and embedding UI
- 🚧 Snapshot/version management UI
- 🚧 Style check UI with suggestions
- 🚧 Section-level AI rewriting (clarify, condense, expand)
- 🚧 Character/concept tracking

## Architecture Decisions

### Why Local-First?
- **Privacy**: Your writing stays on your device
- **Performance**: No network latency for editing
- **Offline**: Work anywhere, anytime
- **Control**: You own your data completely

### Why IndexedDB?
- Handles large projects efficiently
- Supports binary data (audio/images)
- Asynchronous API doesn't block UI
- Built into all modern browsers

### Why Zustand?
- Minimal boilerplate
- TypeScript-friendly
- No context provider hell
- Easy persistence middleware

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## License

ISC

## Acknowledgments

Built with guidance from the comprehensive PRD in `prd.md`. Architecture optimized for local-first, offline-capable book creation with AI assistance.
