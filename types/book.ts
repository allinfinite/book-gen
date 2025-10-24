import { z } from "zod";

export type UUID = string;

// Style Preset Schema
export const StylePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  pov: z.enum(["1p", "3p-limited", "omniscient"]),
  tense: z.enum(["past", "present"]),
  voice: z.string(),
  constraints: z.array(z.string()).optional(),
});

export type StylePreset = z.infer<typeof StylePresetSchema>;

// Author Targets Schema
export const AuthorTargetsSchema = z.object({
  audience: z.string(),
  minChapterWords: z.number().optional(),
  maxChapterWords: z.number().optional(),
  minSectionWords: z.number().optional(),
  maxSectionWords: z.number().optional(),
});

export type AuthorTargets = z.infer<typeof AuthorTargetsSchema>;

// Book Meta Schema
export const BookMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  authorName: z.string().optional(),
  language: z.string().default("en"),
  genre: z.string().optional(),
  tagline: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().default(1),
});

export type BookMeta = z.infer<typeof BookMetaSchema>;

// Media Reference Schema
export const MediaRefSchema = z.object({
  id: z.string(),
  kind: z.enum(["audio", "image"]),
  mime: z.string(),
  createdAt: z.string(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

export type MediaRef = z.infer<typeof MediaRefSchema>;

// Section Schema
export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  content: z.string(),
  images: z.array(MediaRefSchema).optional(),
  audioRefs: z.array(z.string()).optional(),
});

export type Section = z.infer<typeof SectionSchema>;

// Chapter Schema
export const ChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  synopsis: z.string().optional(),
  sections: z.array(SectionSchema),
  notes: z.string().optional(),
  status: z.enum(["outline", "draft", "revising", "final"]).default("outline"),
  wordCount: z.number().optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;

// Outline Node Schema (recursive)
export const OutlineNodeSchema: z.ZodType<{
  id: string;
  type: "part" | "chapter" | "section";
  title: string;
  children?: OutlineNode[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(["part", "chapter", "section"]),
    title: z.string(),
    children: z.array(OutlineNodeSchema).optional(),
  })
);

export type OutlineNode = z.infer<typeof OutlineNodeSchema>;

// Change Record Schema
export const ChangeRecordSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  path: z.string(),
  prev: z.any().optional(),
  next: z.any().optional(),
});

export type ChangeRecord = z.infer<typeof ChangeRecordSchema>;

// Book Project Schema
export const BookProjectSchema = z.object({
  meta: BookMetaSchema,
  premise: z.string(),
  outline: z.array(OutlineNodeSchema),
  chapters: z.array(ChapterSchema),
  targets: AuthorTargetsSchema,
  stylePresetId: z.string(),
  customStyle: StylePresetSchema.optional(),
  history: z.array(ChangeRecordSchema).optional(),
  coverImageId: z.string().optional(),
});

export type BookProject = z.infer<typeof BookProjectSchema>;

// Predefined Style Presets
export const DEFAULT_STYLE_PRESETS: StylePreset[] = [
  {
    id: "crisp-nonfiction",
    name: "Crisp Nonfiction",
    pov: "3p-limited",
    tense: "present",
    voice: "Concise, imperative lean, clear and direct",
    constraints: ["short sentences", "active voice preferred"],
  },
  {
    id: "warm-literary",
    name: "Warm Literary",
    pov: "3p-limited",
    tense: "past",
    voice: "Descriptive, varied cadence, rich imagery",
    constraints: ["varied sentence length", "show don't tell"],
  },
  {
    id: "snappy-ya",
    name: "Snappy YA",
    pov: "1p",
    tense: "present",
    voice: "Short paragraphs, high dialogue ratio, contemporary",
    constraints: ["accessible vocabulary", "fast paced"],
  },
  {
    id: "thriller-pace",
    name: "Thriller Pace",
    pov: "3p-limited",
    tense: "past",
    voice: "Short sentences, high tension, urgent",
    constraints: ["no long descriptions", "maintain suspense"],
  },
  {
    id: "tech-howto",
    name: "Tech How-To",
    pov: "3p-limited",
    tense: "present",
    voice: "Second person instructional, step-by-step",
    constraints: ["clear instructions", "concrete examples"],
  },
];

// Select Options
export const AUDIENCE_OPTIONS = [
  "Children",
  "Middle Grade",
  "Young Adult",
  "Adult",
  "Academic",
  "Professional",
  "General",
  "Custom",
] as const;

export const GENRE_OPTIONS = [
  "Fiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Thriller",
  "Romance",
  "Horror",
  "Historical Fiction",
  "Literary Fiction",
  "Nonfiction",
  "Biography",
  "Memoir",
  "Self-Help",
  "Business",
  "Technical",
  "How-To",
  "Academic",
  "Custom",
] as const;

export const STRUCTURE_OPTIONS = [
  "3-Act",
  "4-Part",
  "Hero's Journey",
  "Nonfiction Guide",
  "How-To",
  "Episodic",
  "Custom",
] as const;

export type Audience = (typeof AUDIENCE_OPTIONS)[number];
export type Genre = (typeof GENRE_OPTIONS)[number];
export type Structure = (typeof STRUCTURE_OPTIONS)[number];
