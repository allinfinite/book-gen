import { NextRequest, NextResponse } from "next/server";
import { ImageRequestSchema } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ImageRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error },
        { status: 400 }
      );
    }

    const { task, prompt, referencedImageId, mask } = parsed.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    let response: Response;
    const mediaId = crypto.randomUUID();

    switch (task) {
      case "generate":
        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt required for image generation" },
            { status: 400 }
          );
        }

        response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "url",
          }),
        });
        break;

      case "variation":
      case "edit":
        // Note: These require actual image data from IndexedDB
        // For now, return a placeholder response
        return NextResponse.json(
          { error: "Image variation/edit not yet implemented" },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: "Invalid image task" },
          { status: 400 }
        );
    }

    if (!response.ok) {
      const error = await response.text();
      console.error("DALL-E API error:", error);
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const imageUrl = result.data[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL returned" },
        { status: 500 }
      );
    }

    // Fetch the image and return it as bytes
    // The client will store it in IndexedDB
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();

    return NextResponse.json({
      mediaId,
      data: Buffer.from(arrayBuffer).toString("base64"),
      mime: imageBlob.type,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
