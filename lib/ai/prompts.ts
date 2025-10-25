import { BookProject, StylePreset, DEFAULT_STYLE_PRESETS, DocumentRef } from "@/types/book";
import { styleAnalysisToPreset } from "./styleAnalyzer";
import { formatReferenceContext } from "./citations";

export function getStylePreset(
  project: Partial<BookProject>
): StylePreset | undefined {
  // Priority: customStyleAnalysis > customStyle > stylePresetId > default
  if (project.customStyleAnalysis) {
    return styleAnalysisToPreset(project.customStyleAnalysis);
  }
  if (project.customStyle) {
    return project.customStyle;
  }
  if (project.stylePresetId) {
    // If user selected "custom-from-uploads" but no analysis exists, fall back to default
    if (project.stylePresetId === "custom-from-uploads" && !project.customStyleAnalysis) {
      return DEFAULT_STYLE_PRESETS[0];
    }
    return DEFAULT_STYLE_PRESETS.find((p) => p.id === project.stylePresetId);
  }
  return DEFAULT_STYLE_PRESETS[0]; // Default to Crisp Nonfiction
}

export function buildOutlinePrompt(
  project: Partial<BookProject>,
  userBrief?: string,
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are a professional book architect. You enforce the author's style lock and numeric targets strictly.

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Targets:
${targets?.minChapterWords ? `- Chapter words: ${targets.minChapterWords}–${targets.maxChapterWords}` : ""}
${targets?.minSectionWords ? `- Section words: ${targets.minSectionWords}–${targets.maxSectionWords}` : ""}

Book Details:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${project.targets?.audience || "General"}
- Language: ${project.meta?.language || "en"}

Task: Produce a hierarchical outline. Return a JSON object with an "outline" key containing an array of OutlineNode objects. Each node has:
{
  id: string (UUID),
  type: "part" | "chapter" | "section",
  title: string,
  children: OutlineNode[]
}

Rules:
- For fiction: escalating stakes, end-of-chapter hooks, avoid redundancy
- For nonfiction: logical progression, clear learning objectives
- Keep titles concise and clear (under 60 characters each)
- Return ONLY valid JSON in the exact format specified
- Use the structured output format provided

Example format:
{
  "outline": [
    {
      "id": "uuid-1",
      "type": "part",
      "title": "Part I: The Beginning",
      "children": [
        {
          "id": "uuid-2",
          "type": "chapter",
          "title": "First Steps",
          "children": [
            {
              "id": "uuid-3",
              "type": "section",
              "title": "Opening scene"
            }
          ]
        }
      ]
    }
  ]
}`;

  const user = `Premise: ${project.premise || ""}

${userBrief ? `Additional instructions: ${userBrief}` : ""}
${refContext}

Generate the outline now.`;

  return { system, user };
}

export function buildChapterDraftPrompt(
  project: Partial<BookProject>,
  chapterId: string,
  userBrief?: string,
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const chapter = project.chapters?.find((ch) => ch.id === chapterId);
  const chapterIndex = project.chapters?.findIndex((ch) => ch.id === chapterId) ?? 0;
  const priorChapters = project.chapters?.slice(0, chapterIndex) ?? [];
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are a senior author collaborating with the user. You MUST obey the style lock strictly.

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${targets?.audience || "General"}

Style Lock (ENFORCE STRICTLY):
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Targets:
${targets?.minChapterWords ? `- Chapter words: ${targets.minChapterWords}–${targets.maxChapterWords}` : "- Aim for substantial chapter content"}
${targets?.minSectionWords ? `- Section words: ${targets.minSectionWords}–${targets.maxSectionWords}` : ""}

Rules:
- Draft in Markdown with H2 (##) for section headings
- Match genre conventions and audience expectations
- Keep continuity with prior chapters
- Avoid recap unless necessary
- Fit within word targets
- Stay in character with style lock
- USE CORRECT GRAMMAR: Singular "they" always uses plural verb forms (they do, they are, they have, NOT they does/they is/they has)
${refContext ? "- When quoting from reference materials, maintain accuracy" : ""}`;

  const priorSummaries = priorChapters
    .map((ch, idx) => `Chapter ${idx + 1}: ${ch.title}\n${ch.synopsis || ""}`)
    .join("\n\n");

  const user = `Premise: ${project.premise || ""}

${priorSummaries ? `Prior chapters:\n${priorSummaries}\n` : ""}
Current chapter: ${chapter?.title || "Untitled"}
${chapter?.synopsis ? `Synopsis: ${chapter.synopsis}` : ""}

${userBrief ? `Author's brief: ${userBrief}` : ""}
${refContext}

Draft the chapter now in Markdown.`;

  return { system, user };
}

export function buildSectionDraftPrompt(
  project: Partial<BookProject>,
  chapterId: string,
  sectionTitle: string,
  userBrief?: string,
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const chapter = project.chapters?.find((ch) => ch.id === chapterId);
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are a section writer. You MUST obey the style lock and targets.

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${targets?.audience || "General"}

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Target:
${targets?.minSectionWords ? `- Section words: ${targets.minSectionWords}–${targets.maxSectionWords}` : "- Aim for substantial section content"}

Grammar Rule (CRITICAL):
- Singular "they" always uses plural verb forms: they do, they are, they have, they notice, they stand (NOT they does/is/has/notices/stands)

Task: Draft a single section in Markdown. No heading needed (it will be added separately). Match genre conventions.
${refContext ? "When quoting from reference materials, maintain accuracy." : ""}`;

  const user = `Chapter: ${chapter?.title || "Untitled"}
${chapter?.synopsis ? `Chapter synopsis: ${chapter.synopsis}` : ""}

Section title: ${sectionTitle}
${userBrief ? `Author's intent: ${userBrief}` : ""}
${refContext}

Draft the section content now.`;

  return { system, user };
}

export function buildSectionsGeneratorPrompt(
  project: Partial<BookProject>,
  chapterId: string,
  context: {
    chapterTitle: string;
    chapterSynopsis?: string;
    existingSections?: string[];
    userBrief?: string;
  },
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are a professional chapter architect. You create complete sections with full content for a chapter. You MUST obey the style lock strictly.

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${targets?.audience || "General"}

Style Lock (ENFORCE STRICTLY):
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Targets:
${targets?.minSectionWords ? `- Section words: ${targets.minSectionWords}–${targets.maxSectionWords}` : "- Aim for substantial section content (300-800 words each)"}

Task: Generate sections with FULL CONTENT (not just titles). Return a JSON object with a "sections" key containing an array of section objects.

Rules:
- Generate 3-6 sections for the chapter
- Each section must have COMPLETE, READY-TO-READ content
- Match genre conventions and audience expectations
- Keep continuity and logical flow between sections
- Stay strictly within style lock (POV, tense, voice)
- USE CORRECT GRAMMAR: Singular "they" always uses plural verb forms (they do, they are, they have, NOT they does/they is/they has)
- Return ONLY valid JSON in the exact format specified
- Use the structured output format provided
- Every section MUST have both "title" and "content" fields
- Content should be substantial prose, not outlines or placeholders
${refContext ? "- When quoting from reference materials, maintain accuracy" : ""}

Example format:
{
  "sections": [
    {
      "title": "Opening Scene",
      "content": "The morning sun crept through the blinds, painting golden stripes across the hardwood floor. Sarah hadn't slept. She sat at her kitchen table..."
    },
    {
      "title": "The Discovery",
      "content": "Three hours later, Sarah stood in front of the old bookstore on Fifth Avenue. The faded sign read 'Antiquarian Books & Curiosities'..."
    }
  ]
}`;

  const user = `Book premise: ${project.premise || ""}

Chapter: ${context.chapterTitle}
${context.chapterSynopsis ? `Synopsis: ${context.chapterSynopsis}` : ""}
${context.existingSections?.length ? `\nCurrent section titles (for reference): ${context.existingSections.join(", ")}` : ""}

${context.userBrief ? `Additional instructions: ${context.userBrief}` : ""}
${refContext}

Generate the sections with full content now.`;

  return { system, user };
}

export function buildRewritePrompt(
  project: Partial<BookProject>,
  excerpt: string,
  userPrompt: string,
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are an editor helping the author revise their text. You MUST obey the style lock and preserve facts/continuity.

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${project.targets?.audience || "General"}

Style Lock (ENFORCE STRICTLY):
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Grammar Rule (CRITICAL):
- Singular "they" always uses plural verb forms: they do, they are, they have, they notice, they stand (NOT they does/is/has/notices/stands)

Task: Apply the author's revision request to the text below. Output ONLY the revised text in plain text format. Do not add any explanations, markdown formatting, or commentary. Just return the revised text that can directly replace the original.
${refContext ? "\nWhen quoting from reference materials, maintain accuracy." : ""}`;

  const user = `Original text:
<<<\n${excerpt}\n>>>

Revision request: ${userPrompt}
${refContext}

Revise now. Output only the revised text.`;

  return { system, user };
}

export function buildInlineGeneratePrompt(
  project: Partial<BookProject>,
  context: string,
  userPrompt: string,
  referenceDocuments?: DocumentRef[]
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const refContext = referenceDocuments ? formatReferenceContext(referenceDocuments) : "";

  const system = `You are a creative writing assistant helping the author generate new text. You MUST obey the style lock strictly.

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${project.targets?.audience || "General"}

Style Lock (ENFORCE STRICTLY):
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Grammar Rule (CRITICAL):
- Singular "they" always uses plural verb forms: they do, they are, they have, they notice, they stand (NOT they does/is/has/notices/stands)

Task: Generate new text based on the author's request. Output ONLY the new text in plain text format. Do not add any explanations, markdown formatting, or commentary. Just return the text that can be inserted into the document.
${refContext ? "\nWhen quoting from reference materials, maintain accuracy." : ""}`;

  const user = `${context ? `Surrounding context:\n<<<\n${context}\n>>>\n\n` : ""}Generation request: ${userPrompt}
${refContext}

Generate the text now. Output only the new text.`;

  return { system, user };
}

export function buildStyleCheckPrompt(
  project: Partial<BookProject>,
  excerpt: string
): { system: string; user: string } {
  const preset = getStylePreset(project);

  const system = `You are a style auditor. Verify the text adheres to the style lock.

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"

Task: Analyze the text and return a JSON object:
{
  povOk: boolean,
  tenseOk: boolean,
  notes: string[],
  suggestedEdits?: string[]
}

Check for:
- POV consistency (pronouns, perspective)
- Tense consistency (verb forms)
- Voice alignment (sentence structure, word choice)`;

  const user = `<<<\n${excerpt}\n>>>

Analyze now.`;

  return { system, user };
}

export function buildReviseOutlinePrompt(
  project: Partial<BookProject>,
  currentOutline: any[],
  userBrief: string
): { system: string; user: string } {
  const preset = getStylePreset(project);

  const system = `You are a book architect revising an outline. Obey the author's style lock.

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"

Task: Revise the outline based on the user's instructions. Return the complete revised outline as JSON (OutlineNode[] format).`;

  const user = `Current outline:
${JSON.stringify(currentOutline, null, 2)}

Revision request: ${userBrief}

Return the revised outline now.`;

  return { system, user };
}
