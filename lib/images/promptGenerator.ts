import { BookProject, Chapter, Section } from "@/types/book";

/**
 * Generate an image prompt for a book cover based on project metadata
 */
export function generateCoverPrompt(project: BookProject): string {
  const { title, subtitle, genre } = project.meta;
  const { premise } = project;

  const parts: string[] = [];
  
  // Start with clear cover description
  parts.push(`Book cover design for "${title}"`);
  
  if (subtitle && subtitle.trim().length > 0) {
    parts.push(`subtitle: "${subtitle}"`);
  }
  
  // Add premise for thematic context
  if (premise && premise.trim().length > 30) {
    const cleanPremise = premise
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250);
    parts.push(`Theme: ${cleanPremise}`);
  }
  
  // Genre-specific styling
  if (genre) {
    const genreStyles: Record<string, string> = {
      "Fiction": "Contemporary fiction cover style, elegant typography",
      "Fantasy": "Fantasy book cover with magical elements, epic style",
      "Science Fiction": "Sci-fi cover with futuristic design elements",
      "Mystery": "Mystery novel cover, intriguing and atmospheric",
      "Thriller": "Thriller book cover, bold and dramatic",
      "Romance": "Romance novel cover, emotional and warm tones",
      "Horror": "Horror book cover, dark and eerie atmosphere",
      "Historical Fiction": "Historical fiction cover, period-appropriate style",
      "Literary Fiction": "Literary fiction cover, artistic and sophisticated",
      "Nonfiction": "Professional nonfiction cover, clean and authoritative",
      "Biography": "Biography cover, portrait-focused and professional",
      "Memoir": "Memoir cover, personal and evocative",
      "Self-Help": "Self-help book cover, inspiring and modern",
      "Business": "Business book cover, professional and impactful",
      "Technical": "Technical book cover, clean and informative design",
      "How-To": "How-to book cover, clear and approachable",
    };
    
    const style = genreStyles[genre] || `${genre} book cover, professional design`;
    parts.push(style);
  } else {
    parts.push("Professional book cover design");
  }
  
  parts.push("High-quality, publishable cover art, eye-catching design");
  
  return parts.join(". ") + ".";
}

/**
 * Generate an image prompt for a chapter based on its content and context
 */
export function generateChapterPrompt(
  chapter: Chapter,
  project: BookProject
): string {
  const { title, synopsis } = chapter;
  const { genre } = project.meta;

  const parts: string[] = [];
  
  // Start with a clear description
  if (synopsis && synopsis.trim().length > 0) {
    // Use synopsis as the main content descriptor - it's usually the best source
    const cleanSynopsis = synopsis
      .replace(/<[^>]*>/g, " ") // Strip HTML
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .slice(0, 300);
    
    parts.push(`A scene depicting: ${cleanSynopsis}`);
  } else {
    // If no synopsis, create a generic but clear prompt based on title and genre
    parts.push(`A scene from the chapter "${title}"`);
    
    // Try to extract meaningful content from first section
    if (chapter.sections.length > 0) {
      const firstSectionContent = chapter.sections[0].content
        .replace(/<[^>]*>/g, " ") // Strip HTML
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      
      // Only use section content if it's substantial and coherent
      if (firstSectionContent.length > 50) {
        const sentences = firstSectionContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
        if (sentences.length > 0) {
          // Take first meaningful sentence
          const firstSentence = sentences[0].trim().slice(0, 200);
          parts.push(`Scene: ${firstSentence}`);
        }
      }
    }
  }
  
  // Add genre/style guidance
  if (genre) {
    const styleMap: Record<string, string> = {
      "Fiction": "realistic fiction style",
      "Fantasy": "fantasy art style with magical elements",
      "Science Fiction": "sci-fi style with futuristic elements",
      "Mystery": "mysterious, atmospheric style",
      "Thriller": "tense, dramatic style",
      "Romance": "warm, emotional style",
      "Horror": "dark, eerie style",
      "Historical Fiction": "historical period style",
      "Literary Fiction": "artistic, literary style",
      "Self-Help": "inspiring, uplifting style",
      "Business": "professional, modern style",
      "Technical": "clean, informative style",
    };
    
    const styleGuide = styleMap[genre] || `${genre.toLowerCase()} style`;
    parts.push(styleGuide);
  }
  
  parts.push("Professional book illustration, high quality, detailed");
  
  return parts.join(". ") + ".";
}

/**
 * Generate an image prompt for a section based on its content
 */
export function generateSectionPrompt(
  section: Section,
  chapter: Chapter,
  project: BookProject
): string {
  const { title, content, summary } = section;
  const { genre } = project.meta;

  const parts: string[] = [];
  
  // Use summary if available - it's the most concise
  if (summary && summary.trim().length > 0) {
    const cleanSummary = summary
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250);
    parts.push(`A scene depicting: ${cleanSummary}`);
  } else if (content && content.trim().length > 0) {
    // Extract meaningful content
    const cleanContent = content
      .replace(/<[^>]*>/g, " ") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    
    if (cleanContent.length > 50) {
      // Extract first few coherent sentences
      const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      if (sentences.length > 0) {
        // Take first 1-2 sentences for better context
        const snippet = sentences.slice(0, 2).join(". ").trim().slice(0, 300);
        parts.push(`A scene from: ${snippet}`);
      } else {
        // Content exists but is fragmented - use title context instead
        parts.push(`An illustration for "${title || 'this section'}"`);
      }
    } else {
      parts.push(`An illustration for "${title || 'this section'}"`);
    }
  } else {
    // No content available
    parts.push(`An illustration for the section "${title || 'in ' + chapter.title}"`);
  }
  
  // Add genre styling
  if (genre) {
    const styleMap: Record<string, string> = {
      "Fiction": "realistic fiction style",
      "Fantasy": "fantasy art style",
      "Science Fiction": "sci-fi illustration style",
      "Mystery": "mysterious atmosphere",
      "Thriller": "tense, dramatic style",
      "Romance": "warm, emotional style",
      "Horror": "dark, atmospheric style",
      "Self-Help": "inspiring, uplifting style",
    };
    
    const styleGuide = styleMap[genre] || `${genre.toLowerCase()} style`;
    parts.push(styleGuide);
  }
  
  parts.push("Professional book illustration, detailed and atmospheric");
  
  return parts.join(". ") + ".";
}

/**
 * Clean and optimize a user-provided prompt
 */
export function optimizePrompt(userPrompt: string): string {
  // Basic cleanup: trim, normalize spaces
  let cleaned = userPrompt.trim().replace(/\s+/g, " ");
  
  // Ensure it ends with punctuation
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  
  return cleaned;
}

