/**
 * Citation Detection and Formatting Utilities
 * 
 * Automatically detect quotes from reference documents and add citations
 */

import { DocumentRef } from "@/types/book";

export interface Citation {
  id: string;
  docId: string;
  docName: string;
  startIndex: number;
  endIndex: number;
  quote: string;
}

/**
 * Detect potential citations in generated text by matching against source documents
 */
export function detectCitations(
  text: string,
  sources: DocumentRef[]
): Citation[] {
  const citations: Citation[] = [];
  const minMatchLength = 30; // Minimum characters for a quote match
  
  if (!sources || sources.length === 0) return citations;
  
  sources.forEach((doc, docIndex) => {
    // Find substantial text matches (quotes)
    const matches = findTextMatches(text, doc.extractedText, minMatchLength);
    
    matches.forEach((match) => {
      citations.push({
        id: crypto.randomUUID(),
        docId: doc.id,
        docName: doc.name,
        startIndex: match.start,
        endIndex: match.end,
        quote: match.text,
      });
    });
  });
  
  // Sort by position in text
  citations.sort((a, b) => a.startIndex - b.startIndex);
  
  return citations;
}

/**
 * Find matching text segments between generated content and source
 */
function findTextMatches(
  text: string,
  source: string,
  minLength: number
): Array<{ start: number; end: number; text: string }> {
  const matches: Array<{ start: number; end: number; text: string }> = [];
  
  // Normalize texts for comparison (remove extra whitespace, case-insensitive)
  const normalizedText = normalizeForMatching(text);
  const normalizedSource = normalizeForMatching(source);
  
  // Use sliding window to find matches
  const words = normalizedText.split(/\s+/);
  const windowSizes = [15, 10, 7]; // Try different window sizes
  
  for (const windowSize of windowSizes) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const phrase = words.slice(i, i + windowSize).join(" ");
      
      if (phrase.length < minLength) continue;
      
      // Check if this phrase exists in source
      if (normalizedSource.includes(phrase)) {
        // Find actual position in original text
        const originalPhrase = words.slice(i, i + windowSize).join(" ");
        const startIndex = text.toLowerCase().indexOf(originalPhrase.toLowerCase());
        
        if (startIndex !== -1) {
          const endIndex = startIndex + originalPhrase.length;
          
          // Check if this overlaps with existing matches
          const overlaps = matches.some(
            (m) =>
              (startIndex >= m.start && startIndex < m.end) ||
              (endIndex > m.start && endIndex <= m.end)
          );
          
          if (!overlaps) {
            matches.push({
              start: startIndex,
              end: endIndex,
              text: text.substring(startIndex, endIndex),
            });
          }
        }
      }
    }
  }
  
  return matches;
}

/**
 * Normalize text for matching (lowercase, remove extra whitespace)
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/["""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

/**
 * Insert citation markers into text
 */
export function insertCitationMarkers(
  text: string,
  citations: Citation[]
): string {
  if (citations.length === 0) return text;
  
  // Sort citations by position (reverse order to maintain indices)
  const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  const citationNumbers = new Map<string, number>();
  let citationCounter = 1;
  
  // Assign numbers to unique documents
  citations.forEach((citation) => {
    if (!citationNumbers.has(citation.docId)) {
      citationNumbers.set(citation.docId, citationCounter++);
    }
  });
  
  // Insert markers (working backwards to preserve indices)
  sortedCitations.forEach((citation) => {
    const number = citationNumbers.get(citation.docId) || 0;
    const marker = `[${number}]`;
    
    // Insert marker after the quote
    result =
      result.substring(0, citation.endIndex) +
      marker +
      result.substring(citation.endIndex);
  });
  
  return result;
}

/**
 * Generate a references section from citations
 */
export function generateReferencesSection(
  citations: Citation[],
  sources: DocumentRef[]
): string {
  if (citations.length === 0) return "";
  
  // Get unique documents that were cited
  const citedDocIds = new Set(citations.map((c) => c.docId));
  const citedDocs = sources.filter((doc) => citedDocIds.has(doc.id));
  
  if (citedDocs.length === 0) return "";
  
  // Build references section
  let references = "\n\n---\n\n## References\n\n";
  
  citedDocs.forEach((doc, index) => {
    references += `[${index + 1}] ${doc.name}\n`;
  });
  
  return references;
}

/**
 * Format text with citations and references
 */
export function formatCitationText(
  content: string,
  citations: Citation[],
  sources: DocumentRef[]
): string {
  const textWithMarkers = insertCitationMarkers(content, citations);
  const referencesSection = generateReferencesSection(citations, sources);
  
  return textWithMarkers + referencesSection;
}

/**
 * Format reference documents for AI prompt context
 */
export function formatReferenceContext(docs: DocumentRef[]): string {
  if (!docs || docs.length === 0) return "";
  
  const filtered = docs.filter((doc) => doc.includeInGeneration);
  if (filtered.length === 0) return "";
  
  let context = "\n\nReference Materials (for FACTUAL CONTENT only):\n";
  context += "IMPORTANT: These documents are for FACTUAL content and citations ONLY. DO NOT copy the writing style from these documents. Your writing style must come ONLY from the Style Lock above.\n";
  context += "You may quote facts, data, or specific information from these documents when relevant. Citations will be added automatically.\n\n";
  
  filtered.forEach((doc, index) => {
    // Truncate very long documents
    const maxLength = 5000;
    const excerpt =
      doc.extractedText.length > maxLength
        ? doc.extractedText.substring(0, maxLength) + "... [truncated]"
        : doc.extractedText;
    
    context += `--- Document ${index + 1}: ${doc.name} ---\n${excerpt}\n\n`;
  });
  
  return context;
}

