/**
 * PDF Text Extraction Utilities
 * 
 * Uses pdfjs-dist for client-side PDF parsing
 */

// Dynamic import to avoid SSR issues with pdfjs-dist
let pdfjsLib: any = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  // @ts-ignore - dynamic import
  const pdfjs = await import('pdfjs-dist');
  
  // Set worker - try local file first, then fall back to CDN
  if (typeof window !== 'undefined') {
    // Use the local worker file from public directory
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  
  pdfjsLib = pdfjs;
  return pdfjs;
}

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const textPages: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into a single string
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      textPages.push(pageText);
    }
    
    // Join all pages with double newlines
    return textPages.join('\n\n').trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('password')) {
        throw new Error('This PDF is password-protected and cannot be processed.');
      }
      if (error.message.includes('Invalid PDF')) {
        throw new Error('This file appears to be corrupted or is not a valid PDF.');
      }
    }
    
    throw new Error('Failed to extract text from PDF. Please ensure it is a valid, unencrypted PDF file.');
  }
}

/**
 * Get basic metadata from a PDF file
 */
export async function getPDFMetadata(file: File): Promise<{
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
}> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const metadata = await pdf.getMetadata();
    
    return {
      numPages: pdf.numPages,
      title: metadata.info?.Title,
      author: metadata.info?.Author,
      subject: metadata.info?.Subject,
    };
  } catch (error) {
    console.error('PDF metadata error:', error);
    throw new Error('Failed to read PDF metadata.');
  }
}

/**
 * Validate if a file is a valid PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Count approximate word count from text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

