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

Task: Draft a single section in Markdown. No heading needed (it will be added separately). Match genre conventions.`;

  const user = `Chapter: ${chapter?.title || "Untitled"}
${chapter?.synopsis ? `Chapter synopsis: ${chapter.synopsis}` : ""}

Section title: ${sectionTitle}
${userBrief ? `Author's intent: ${userBrief}` : ""}

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
  }
): { system: string; user: string } {
  const preset = getStylePreset(project);
  const targets = project.targets;

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
- Return ONLY valid JSON in the exact format specified
- Use the structured output format provided
- Every section MUST have both "title" and "content" fields
- Content should be substantial prose, not outlines or placeholders

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

Generate the sections with full content now.`;

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

Book Type:
- Genre: ${project.meta?.genre || "General"}
- Audience: ${project.targets?.audience || "General"}

Style Lock:
- POV: ${preset?.pov}
- Tense: ${preset?.tense}
- Voice: "${preset?.voice}"
${preset?.constraints?.length ? `- Constraints: ${preset.constraints.join(", ")}` : ""}

Task: ${operationInstructions[operation]}

Output: Revised Markdown ONLY. No explanations. Maintain genre conventions.`;

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
