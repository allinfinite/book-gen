import { NextRequest, NextResponse } from "next/server";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DURATION = 600; // 10 minutes in seconds

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    const language = formData.get("language") as string | null;

    if (!audio) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate size
    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const validMimeTypes = ["audio/webm", "audio/wav", "audio/mp3", "audio/m4a", "audio/ogg"];
    if (!validMimeTypes.includes(audio.type)) {
      return NextResponse.json(
        { error: `Invalid audio format. Supported: ${validMimeTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("Transcribing audio:", {
      size: audio.size,
      type: audio.type,
      name: audio.name,
    });

    const startTime = Date.now();

    // Call OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audio);
    whisperFormData.append("model", "whisper-1");
    if (language) {
      whisperFormData.append("language", language);
    }
    // Add prompt to help with context
    whisperFormData.append("prompt", "This is a dictation for writing a book chapter.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Whisper API error:", error);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const durationMs = Date.now() - startTime;

    console.log("Transcription result:", {
      textLength: result.text?.length || 0,
      text: result.text,
      durationMs,
    });

    return NextResponse.json({
      text: result.text,
      durationMs,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
