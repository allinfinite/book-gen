import { GenerateRequest } from "@/types/api";

export interface StreamOptions {
  onContent?: (content: string) => void;
  onChunk?: (chunk: string) => void; // Alias for onContent
  onComplete?: () => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamGenerate(
  request: GenerateRequest,
  options: StreamOptions
): Promise<void> {
  const { onContent, onChunk, onComplete, onError, signal } = options;
  const contentHandler = onContent || onChunk;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onComplete?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              onError?.(parsed.error);
              return;
            }
            if (parsed.content) {
              contentHandler?.(parsed.content);
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn("Failed to parse SSE data:", data);
          }
        }
      }
    }

    onComplete?.();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Generation cancelled");
      return;
    }
    onError?.(error.message || "Failed to generate content");
  }
}

// Helper for non-streaming requests (like style check)
export async function generate(request: GenerateRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullContent = "";

    streamGenerate(request, {
      onContent: (content) => {
        fullContent += content;
      },
      onComplete: () => {
        resolve(fullContent);
      },
      onError: (error) => {
        reject(new Error(error));
      },
    });
  });
}
