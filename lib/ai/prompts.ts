import { BookProject, StylePreset, DEFAULT_STYLE_PRESETS } from "@/types/book";

export function getStylePreset(
  project: Partial<BookProject>
): StylePreset | undefined {
  if (project.customStyle) {
    return project.customStyle;
  }
  if (project.stylePresetId) {
    return DEFAULT_STYLE_PRESETS.find((p) => p.id === project.stylePresetId);
  }
  return DEFAULT_STYLE_PRESETS[0]; // Default to Crisp Nonfiction
}

export function buildOutlinePrompt(
  project: Partial<BookProject>,
  userBrief?: string
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;

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

Task: Produce a hierarchical outline as a JSON array of OutlineNode objects. Each node has:
{
  id: string (UUID),
  type: "part" | "chapter" | "section",
  title: string,
  children?: OutlineNode[]
}

Rules:
- For fiction: escalating stakes, end-of-chapter hooks, avoid redundancy
- For nonfiction: logical progression, clear learning objectives
- Return ONLY valid JSON, no explanatory text`;

  const user = `Premise: ${project.premise || ""}

${userBrief ? `Additional instructions: ${userBrief}` : ""}

Generate the outline now.`;

  return { system, user };
}

export function buildChapterDraftPrompt(
  project: Partial<BookProject>,
  chapterId: string,
  userBrief?: string
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const chapter = project.chapters?.find((ch) => ch.id === chapterId);
  const chapterIndex = project.chapters?.findIndex((ch) => ch.id === chapterId) ?? 0;
  const priorChapters = project.chapters?.slice(0, chapterIndex) ?? [];

  const system = `You are a senior author collaborating with the user. You MUST obey the style lock strictly.

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
- Keep continuity with prior chapters
- Avoid recap unless necessary
- Fit within word targets
- Stay in character with style lock`;

  const priorSummaries = priorChapters
    .map((ch, idx) => `Chapter ${idx + 1}: ${ch.title}\n${ch.synopsis || ""}`)
    .join("\n\n");

  const user = `Premise: ${project.premise || ""}

${priorSummaries ? `Prior chapters:\n${priorSummaries}\n` : ""}
Current chapter: ${chapter?.title || "Untitled"}
${chapter?.synopsis ? `Synopsis: ${chapter.synopsis}` : ""}

${userBrief ? `Author's brief: ${userBrief}` : ""}

Draft the chapter now in Markdown.`;

  return { system, user };
}

export function buildSectionDraftPrompt(
  project: Partial<BookProject>,
  chapterId: string,
  sectionTitle: string,
  userBrief?: string
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;
  const chapter = project.chapters?.find((ch) => ch.id === chapterId);

  const system = `You are a section writer. You MUST obey the style lock and targets.

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Target:
${targets?.minSectionWords ? `- Section words: ${targets.minSectionWords}–${targets.maxSectionWords}` : "- Aim for substantial section content"}

Task: Draft a single section in Markdown. No heading needed (it will be added separately).`;

  const user = `Chapter: ${chapter?.title || "Untitled"}
${chapter?.synopsis ? `Chapter synopsis: ${chapter.synopsis}` : ""}

Section title: ${sectionTitle}
${userBrief ? `Author's intent: ${userBrief}` : ""}

Draft the section content now.`;

  return { system, user };
}

export function buildRewritePrompt(
  project: Partial<BookProject>,
  excerpt: string,
  operation: "clarify" | "condense" | "expand" | "adjust_tone"
): { system: string; user: string } {
  const preset = getStylePreset(project);

  const operationInstructions = {
    clarify: "Make the text clearer and more precise without changing the length significantly",
    condense: "Reduce word count while preserving key information",
    expand: "Add detail, description, or elaboration",
    adjust_tone: "Adjust the tone to better match the style lock",
  };

  const system = `You are an editor. Operation: ${operation}. You MUST obey the style lock and preserve facts/continuity.

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Task: ${operationInstructions[operation]}

Output: Revised Markdown ONLY. No explanations.`;

  const user = `<<<\n${excerpt}\n>>>

Revise now.`;

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
