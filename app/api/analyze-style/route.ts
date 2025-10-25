import { NextRequest, NextResponse } from "next/server";
import { StyleAnalysisRequestSchema } from "@/types/api";
import { buildStyleAnalysisPrompt } from "@/lib/ai/styleAnalyzer";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = StyleAnalysisRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { texts } = parsed.data;

    if (!texts || texts.length === 0) {
      return NextResponse.json(
        { error: "No texts provided for analysis" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Build analysis prompt
    const { system, user } = buildStyleAnalysisPrompt(texts);

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "style_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                pov: { type: "string" },
                tense: { type: "string" },
                voice: { type: "string" },
                patterns: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["pov", "tense", "voice", "patterns"],
              additionalProperties: false
            }
          }
        },
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Style analysis failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON response
    const analysis = JSON.parse(content);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Style analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

