import { z } from "zod";
import { BookProject } from "./book";

// Transcription API
export const TranscribeRequestSchema = z.object({
  audio: z.instanceof(Blob),
  mime: z.string(),
  language: z.string().optional(),
});

export type TranscribeRequest = {
  audio: Blob;
  mime: string;
  language?: string;
};

export const TranscribeResponseSchema = z.object({
  text: z.string(),
  durationMs: z.number(),
});

export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

// Generation API
export const GenerateTaskSchema = z.enum([
  "outline",
  "revise_outline",
  "chapter_draft",
  "section_draft",
  "sections", // Generate all sections for a chapter
  "rewrite",
  "style_check",
]);

export type GenerateTask = z.infer<typeof GenerateTaskSchema>;

export const GenerateRequestSchema = z.object({
  task: GenerateTaskSchema,
  project: z.custom<Partial<BookProject>>(),
  targetId: z.string().optional(),
  userBrief: z.string().optional(),
  context: z.any().optional(), // For sections generation
  controls: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
});

export type GenerateRequest = {
  task: GenerateTask;
  project: Partial<BookProject>;
  targetId?: string;
  userBrief?: string;
  context?: any; // For sections generation
  controls?: {
    temperature?: number;
    maxTokens?: number;
  };
};

// Image Generation API
export const ImageTaskSchema = z.enum(["generate", "variation", "edit"]);

export type ImageTask = z.infer<typeof ImageTaskSchema>;

export const ImageRequestSchema = z.object({
  task: ImageTaskSchema,
  prompt: z.string().optional(),
  referencedImageId: z.string().optional(),
  mask: z.string().optional(),
});

export type ImageRequest = z.infer<typeof ImageRequestSchema>;

export const ImageResponseSchema = z.object({
  mediaId: z.string(),
});

export type ImageResponse = z.infer<typeof ImageResponseSchema>;

// Style Check Response
export const StyleCheckResponseSchema = z.object({
  povOk: z.boolean(),
  tenseOk: z.boolean(),
  notes: z.array(z.string()),
  suggestedEdits: z.array(z.string()).optional(),
});

export type StyleCheckResponse = z.infer<typeof StyleCheckResponseSchema>;
