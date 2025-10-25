import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, content, genre, subtitle } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Build the system prompt based on type
    let systemPrompt = "";
    let userPrompt = "";

    if (type === "cover") {
      systemPrompt = `You are an expert at creating image prompts for book covers. Generate a detailed, visual prompt that would create a stunning, professional book cover. Focus on visual elements, mood, composition, and style. The prompt should be 2-3 sentences, highly descriptive, and designed to produce a publishable book cover.`;
      
      userPrompt = `Create an image prompt for a book cover with the following details:
Title: "${title}"
${subtitle ? `Subtitle: "${subtitle}"` : ""}
${genre ? `Genre: ${genre}` : ""}
${content ? `Book premise/description: ${content.slice(0, 1000)}` : ""}

Generate a prompt that captures the essence of this book in a visually compelling cover design.`;
    } else if (type === "chapter") {
      systemPrompt = `You are an expert at creating image prompts for book illustrations. Generate a detailed, visual prompt that would create an evocative illustration for this chapter. Focus on the key scene, mood, characters, setting, and visual atmosphere. The prompt should be 2-3 sentences, highly descriptive, and designed to produce a professional chapter illustration.`;
      
      userPrompt = `Create an image prompt for a chapter illustration with the following details:
Chapter Title: "${title}"
${genre ? `Book Genre: ${genre}` : ""}

Full Chapter Content:
${content || "No content provided yet."}

Generate a prompt that visualizes the most compelling scene or theme from this chapter.`;
    } else if (type === "section") {
      systemPrompt = `You are an expert at creating image prompts for book illustrations. Generate a detailed, visual prompt that would create an atmospheric illustration for this section. Focus on the key moment, mood, visual details, and emotional tone. The prompt should be 2-3 sentences, highly descriptive, and designed to produce a professional illustration.`;
      
      userPrompt = `Create an image prompt for a section illustration with the following details:
Section Title: "${title}"
${genre ? `Book Genre: ${genre}` : ""}

Full Section Content:
${content || "No content provided yet."}

Generate a prompt that captures the most visual and evocative moment from this section.`;
    }

    // Call OpenAI API directly using fetch
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate prompt from OpenAI" },
        { status: response.status }
      );
    }

    const completion = await response.json();
    const generatedPrompt = completion.choices[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      return NextResponse.json(
        { error: "Failed to generate prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompt: generatedPrompt,
    });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

