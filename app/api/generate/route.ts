import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/types/api";
import {
  buildOutlinePrompt,
  buildChapterDraftPrompt,
  buildSectionDraftPrompt,
  buildSectionsGeneratorPrompt,
  buildRewritePrompt,
  buildInlineGeneratePrompt,
  buildStyleCheckPrompt,
  buildReviseOutlinePrompt,
} from "@/lib/ai/prompts";

const MAX_COMPLETION_TOKENS = 16000; // Maximum tokens in the AI response (increased for very large outlines)
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

    const { task, project, targetId, userBrief, controls, context, referenceDocuments, excerpt, userPrompt: customPrompt } = parsed.data;

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
    let responseFormat: any = undefined; // JSON schema for structured outputs

    switch (task) {
      case "outline":
        const outlinePrompts = buildOutlinePrompt(project, userBrief, referenceDocuments);
        systemPrompt = outlinePrompts.system;
        userPrompt = outlinePrompts.user;
        // Use structured output for reliable JSON
        responseFormat = {
          type: "json_schema",
          json_schema: {
            name: "book_outline",
            strict: true,
            schema: {
              type: "object",
              properties: {
                outline: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      type: { type: "string", enum: ["part", "chapter"] },
                      title: { type: "string" },
                      children: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["chapter", "section"] },
                            title: { type: "string" },
                            children: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  type: { type: "string", enum: ["section"] },
                                  title: { type: "string" }
                                },
                                required: ["id", "type", "title"],
                                additionalProperties: false
                              }
                            }
                          },
                          required: ["id", "type", "title", "children"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["id", "type", "title", "children"],
                    additionalProperties: false
                  }
                }
              },
              required: ["outline"],
              additionalProperties: false
            }
          }
        };
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
        const chapterPrompts = buildChapterDraftPrompt(project, targetId, userBrief, referenceDocuments);
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
          userBrief,
          referenceDocuments
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
          context || {},
          referenceDocuments
        );
        systemPrompt = sectionsPrompts.system;
        userPrompt = sectionsPrompts.user;
        // Use structured output for reliable JSON
        responseFormat = {
          type: "json_schema",
          json_schema: {
            name: "chapter_sections",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" }
                    },
                    required: ["title", "content"],
                    additionalProperties: false
                  }
                }
              },
              required: ["sections"],
              additionalProperties: false
            }
          }
        };
        break;

      case "rewrite":
        if (!excerpt || !customPrompt) {
          throw new Error("Text excerpt and user prompt required");
        }
        const rewritePrompts = buildRewritePrompt(
          project,
          excerpt,
          customPrompt,
          referenceDocuments
        );
        systemPrompt = rewritePrompts.system;
        userPrompt = rewritePrompts.user;
        break;

      case "inline_generate":
        if (!customPrompt) {
          throw new Error("User prompt required");
        }
        const generatePrompts = buildInlineGeneratePrompt(
          project,
          context || "",
          customPrompt,
          referenceDocuments
        );
        systemPrompt = generatePrompts.system;
        userPrompt = generatePrompts.user;
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
        // Add structured output format if specified
        ...(responseFormat && { response_format: responseFormat }),
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
