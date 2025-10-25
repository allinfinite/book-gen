/**
 * AI-Powered Writing Style Analyzer
 * 
 * Analyzes uploaded writing samples to extract style patterns
 */

import { CustomStyleAnalysis, StylePreset } from "@/types/book";

const STYLE_ANALYSIS_API_ENDPOINT = "/api/analyze-style";

/**
 * Analyze writing style from provided text samples
 */
export async function analyzeWritingStyle(
  texts: string[],
  sourceDocIds: string[]
): Promise<CustomStyleAnalysis> {
  try {
    const response = await fetch(STYLE_ANALYSIS_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const analysis = await response.json();

    return {
      id: crypto.randomUUID(),
      sourceDocIds,
      analysis: {
        pov: analysis.pov || "3p-limited",
        tense: analysis.tense || "past",
        voice: analysis.voice || "Descriptive and engaging",
        patterns: analysis.patterns || [],
      },
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Style analysis error:", error);
    throw new Error("Failed to analyze writing style. Please try again.");
  }
}

/**
 * Convert custom style analysis to a StylePreset for use in generation
 */
export function styleAnalysisToPreset(
  analysis: CustomStyleAnalysis
): StylePreset {
  return {
    id: "custom-from-uploads",
    name: "Custom (from uploads)",
    pov: mapPOVToEnum(analysis.analysis.pov),
    tense: mapTenseToEnum(analysis.analysis.tense),
    voice: analysis.analysis.voice,
    constraints: analysis.analysis.patterns,
  };
}

/**
 * Map analyzed POV string to valid enum value
 */
function mapPOVToEnum(
  pov: string
): "1p" | "3p-limited" | "omniscient" {
  const lowered = pov.toLowerCase();
  
  if (lowered.includes("first") || lowered.includes("1p")) {
    return "1p";
  }
  if (lowered.includes("omniscient")) {
    return "omniscient";
  }
  return "3p-limited"; // default
}

/**
 * Map analyzed tense string to valid enum value
 */
function mapTenseToEnum(tense: string): "past" | "present" {
  const lowered = tense.toLowerCase();
  
  if (lowered.includes("present")) {
    return "present";
  }
  return "past"; // default
}

/**
 * Build the system prompt for style analysis
 */
export function buildStyleAnalysisPrompt(texts: string[]): {
  system: string;
  user: string;
} {
  const system = `You are an expert literary analyst specializing in identifying writing style patterns.

Your task is to analyze writing samples and extract concrete style characteristics.

Return a JSON object with this structure:
{
  "pov": "first person" | "third person limited" | "omniscient",
  "tense": "past" | "present",
  "voice": "A detailed description of the writing voice (2-3 sentences)",
  "patterns": [
    "Array of specific style patterns observed",
    "Examples: 'frequent use of short sentences', 'rich sensory descriptions', 'minimal dialogue tags', etc."
  ]
}

Focus on:
1. POV: Identify the narrative perspective consistently used
2. Tense: Identify the primary verb tense
3. Voice: Describe the overall tone, cadence, and distinctive qualities
4. Patterns: List 3-5 concrete, observable writing patterns

Be specific and actionable - these characteristics will guide AI generation.`;

  const combinedSamples = texts
    .map((text, idx) => `=== Sample ${idx + 1} ===\n${text.slice(0, 3000)}`)
    .join("\n\n");

  const user = `Analyze the following writing samples and extract the style characteristics:

${combinedSamples}

Return the analysis as JSON now.`;

  return { system, user };
}

