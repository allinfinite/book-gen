# Quick Start Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Set Up Environment
```bash
cp .env.example .env.local
# Edit .env.local and add your OpenAI API key
```

## 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 4. Create Your First Book

1. Click **"New Project"**
2. Fill in the details:
   - Title: "My First Book"
   - Choose genre, audience, and style preset
   - Set word count targets (optional)
3. Click **"Create Project"**

## 5. Start Writing

1. Click **"Add Chapter"** in the sidebar
2. Click on the chapter to open the editor
3. Enter a chapter title
4. Write your content (use `## Section Title` for sections)
5. Changes auto-save every second

## 6. Export Your Work

1. Click **"Export"** in the top-right
2. Choose **JSON** format
3. Click **"Export as JSON"**
4. Your book will download as a .book.json file

## What's Included

✅ **Local-first storage** - All data in your browser's IndexedDB
✅ **Auto-save** - Never lose your work
✅ **AI generation** - Streaming chapter drafts and outlines
✅ **Voice transcription** - Press Cmd/Ctrl+R to dictate
✅ **Rich text editor** - TipTap with formatting toolbar
✅ **Style lock** - Enforces consistent POV, tense, voice
✅ **Word targets** - Track chapter/section length with visual indicators
✅ **JSON export** - Full project backup

## Key Features

### Voice Input
- Click "Voice" button or press **Cmd/Ctrl+R**
- Speak your content or premise
- Automatic transcription via Whisper API

### AI Generation
- Click **"AI"** button to open sidebar
- Enter a brief describing what you want
- Click **"Generate Chapter"** for AI-drafted content
- Review and accept/reject generated text

### Premise & Outline
- Describe your book idea in the premise modal
- Click **"Generate AI Outline"** for structure
- Outline appears for review before starting

## What's Coming Soon

🚧 Drag-and-drop outline editor
🚧 EPUB export
🚧 PDF export
🚧 Image generation UI
🚧 Section-level rewriting

## Need Help?

See the full [README.md](./README.md) for detailed documentation.
