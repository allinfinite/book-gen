import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/types/api";
import {
  buildOutlinePrompt,
  buildChapterDraftPrompt,
  buildSectionDraftPrompt,
  buildSectionsGeneratorPrompt,
  buildRewritePrompt,
  buildStyleCheckPrompt,
  buildReviseOutlinePrompt,
} from "@/lib/ai/prompts";

const MAX_COMPLETION_TOKENS = 8000; // Maximum tokens in the AI response (increased for large outlines)
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5"; // Use GPT-5 by default

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await req.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Invalid request" })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const { task, project, targetId, userBrief, controls, context } = parsed.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "API key not configured" })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Build prompts based on task
    let systemPrompt: string;
    let userPrompt: string;

    switch (task) {
      case "outline":
        const outlinePrompts = buildOutlinePrompt(project, userBrief);
        systemPrompt = outlinePrompts.system;
        userPrompt = outlinePrompts.user;
        break;

      case "revise_outline":
        if (!project.outline || !userBrief) {
          throw new Error("Outline and user brief required");
        }
        const revisePrompts = buildReviseOutlinePrompt(
          project,
          project.outline,
          userBrief
        );
        systemPrompt = revisePrompts.system;
        userPrompt = revisePrompts.user;
        break;

      case "chapter_draft":
        if (!targetId) {
          throw new Error("Chapter ID required");
        }
        const chapterPrompts = buildChapterDraftPrompt(project, targetId, userBrief);
        systemPrompt = chapterPrompts.system;
        userPrompt = chapterPrompts.user;
        break;

      case "section_draft":
        if (!targetId || !userBrief) {
          throw new Error("Chapter ID and section brief required");
        }
        const sectionPrompts = buildSectionDraftPrompt(
          project,
          targetId,
          userBrief.split("\n")[0], // First line as title
          userBrief
        );
        systemPrompt = sectionPrompts.system;
        userPrompt = sectionPrompts.user;
        break;

      case "sections":
        if (!targetId) {
          throw new Error("Chapter ID required");
        }
        const sectionsPrompts = buildSectionsGeneratorPrompt(
          project,
          targetId,
          context || {}
        );
        systemPrompt = sectionsPrompts.system;
        userPrompt = sectionsPrompts.user;
        break;

      case "rewrite":
        if (!userBrief) {
          throw new Error("Text excerpt required");
        }
        // Extract operation from userBrief (format: "operation:excerpt")
        const [operation, ...excerptParts] = userBrief.split(":");
        const excerpt = excerptParts.join(":");
        const rewritePrompts = buildRewritePrompt(
          project,
          excerpt,
          operation as any
        );
        systemPrompt = rewritePrompts.system;
        userPrompt = rewritePrompts.user;
        break;

      case "style_check":
        if (!userBrief) {
          throw new Error("Text excerpt required");
        }
        const stylePrompts = buildStyleCheckPrompt(project, userBrief);
        systemPrompt = stylePrompts.system;
        userPrompt = stylePrompts.user;
        break;

      default:
        throw new Error("Invalid task");
    }

    // Call OpenAI API with streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // GPT-5 only supports default temperature (1), don't send custom values
        ...(DEFAULT_MODEL !== "gpt-5" && {
          temperature: controls?.temperature ?? DEFAULT_TEMPERATURE,
        }),
        max_completion_tokens: controls?.maxTokens ?? MAX_COMPLETION_TOKENS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" })}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
