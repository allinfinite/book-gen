import JSZip from "jszip";
import { BookProject } from "@/types/book";
import { getMedia } from "@/lib/idb";

/**
 * Generate an EPUB 3 file compatible with Amazon KDP standards
 * Follows KDP EPUB specifications and best practices
 */
export async function generateEPUB(project: BookProject): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype file (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file("META-INF/container.xml", containerXml);

  // 3. Generate content files
  const oebps = zip.folder("OEBPS")!;

  // 4. content.opf (Package Document)
  const contentOpf = generateContentOpf(project);
  oebps.file("content.opf", contentOpf);

  // 5. toc.ncx (Navigation Control file for EPUB 2 compatibility)
  const tocNcx = generateTocNcx(project);
  oebps.file("toc.ncx", tocNcx);

  // 6. nav.xhtml (EPUB 3 navigation document)
  const navXhtml = generateNavXhtml(project);
  oebps.file("nav.xhtml", navXhtml);

  // 7. Stylesheet
  const stylesheet = generateStylesheet();
  oebps.file("stylesheet.css", stylesheet);

  // 8. Title page
  const titlePage = generateTitlePage(project);
  oebps.file("title.xhtml", titlePage);

  // 9. Copyright page
  const copyrightPage = generateCopyrightPage(project);
  oebps.file("copyright.xhtml", copyrightPage);

  // 10. Add images to OEBPS/images folder
  const imagesFolder = oebps.folder("images")!;
  const imageIds = new Set<string>();
  
  // Collect all image IDs
  if (project.coverImageId) {
    imageIds.add(project.coverImageId);
  }
  
  project.chapters.forEach((chapter) => {
    if (chapter.imageId) {
      imageIds.add(chapter.imageId);
    }
    chapter.sections.forEach((section) => {
      if (section.images) {
        section.images.forEach((img) => imageIds.add(img.id));
      }
    });
  });
  
  // Add all images to the ZIP
  for (const imageId of imageIds) {
    try {
      const mediaBlob = await getMedia(imageId);
      if (mediaBlob) {
        const extension = mediaBlob.mime.split("/")[1] || "png";
        imagesFolder.file(`${imageId}.${extension}`, mediaBlob.bytes);
      }
    } catch (err) {
      console.error(`Failed to add image ${imageId}:`, err);
    }
  }

  // 11. Chapter files
  project.chapters.forEach((chapter, index) => {
    const chapterXhtml = generateChapterXhtml(chapter, index, project);
    oebps.file(`chapter${index + 1}.xhtml`, chapterXhtml);
  });

  // Generate the EPUB file
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

function generateContentOpf(project: BookProject): string {
  const uuid = `urn:uuid:${project.meta.id}`;
  const date = new Date().toISOString().split("T")[0];
  const chapterCount = project.chapters.length;

  // Build manifest items
  const manifestItems = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="stylesheet" href="stylesheet.css" media-type="text/css"/>`,
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"${project.coverImageId ? ' properties="cover-image"' : ""}/>`,
    `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`,
  ];
  
  // Add image items
  const imageIds = new Set<string>();
  if (project.coverImageId) {
    imageIds.add(project.coverImageId);
  }
  project.chapters.forEach((chapter) => {
    if (chapter.imageId) {
      imageIds.add(chapter.imageId);
    }
    chapter.sections.forEach((section) => {
      if (section.images) {
        section.images.forEach((img) => imageIds.add(img.id));
      }
    });
  });
  
  imageIds.forEach((imageId) => {
    manifestItems.push(
      `<item id="img_${imageId}" href="images/${imageId}.png" media-type="image/png"/>`
    );
  });

  // Add chapter items
  for (let i = 0; i < chapterCount; i++) {
    manifestItems.push(
      `<item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
    );
  }

  // Build spine items
  const spineItems = [
    `<itemref idref="title"/>`,
    `<itemref idref="copyright"/>`,
  ];
  for (let i = 0; i < chapterCount; i++) {
    spineItems.push(`<itemref idref="chapter${i + 1}"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${project.meta.language || "en"}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${escapeXml(project.meta.title)}</dc:title>
    <dc:language>${project.meta.language || "en"}</dc:language>
    <dc:creator id="creator">${escapeXml(project.meta.authorName || "Unknown Author")}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
    ${project.meta.genre ? `<dc:subject>${escapeXml(project.meta.genre)}</dc:subject>` : ""}
    ${project.premise ? `<dc:description>${escapeXml(project.premise)}</dc:description>` : ""}
    ${project.meta.tagline ? `<dc:description>${escapeXml(project.meta.tagline)}</dc:description>` : ""}
    <dc:date>${date}</dc:date>
    <dc:publisher>BookGen</dc:publisher>
    <dc:rights>Copyright © ${new Date().getFullYear()} ${escapeXml(project.meta.authorName || "Unknown Author")}. All rights reserved.</dc:rights>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`;
}

function generateTocNcx(project: BookProject): string {
  const uuid = `urn:uuid:${project.meta.id}`;

  // Build nav points
  const navPoints = project.chapters.map((chapter, index) => {
    return `    <navPoint id="chapter${index + 1}" playOrder="${index + 3}">
      <navLabel>
        <text>${escapeXml(chapter.title)}</text>
      </navLabel>
      <content src="chapter${index + 1}.xhtml"/>
    </navPoint>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(project.meta.title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="title" playOrder="1">
      <navLabel>
        <text>Title Page</text>
      </navLabel>
      <content src="title.xhtml"/>
    </navPoint>
    <navPoint id="copyright" playOrder="2">
      <navLabel>
        <text>Copyright</text>
      </navLabel>
      <content src="copyright.xhtml"/>
    </navPoint>
${navPoints.join("\n")}
  </navMap>
</ncx>`;
}

function generateNavXhtml(project: BookProject): string {
  // Build TOC list items
  const tocItems = project.chapters.map((chapter, index) => {
    return `      <li><a href="chapter${index + 1}.xhtml">${escapeXml(chapter.title)}</a></li>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.meta.language || "en"}" lang="${project.meta.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="title.xhtml">Title Page</a></li>
      <li><a href="copyright.xhtml">Copyright</a></li>
${tocItems.join("\n")}
    </ol>
  </nav>
</body>
</html>`;
}

function generateStylesheet(): string {
  return `/* Amazon KDP compatible stylesheet */
@charset "UTF-8";

/* Body and typography */
body {
  font-family: Georgia, serif;
  font-size: 1em;
  line-height: 1.5;
  margin: 0;
  padding: 1em;
  text-align: justify;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: bold;
  line-height: 1.2;
  text-align: left;
  page-break-after: avoid;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 {
  font-size: 2em;
  text-align: center;
}

h2 {
  font-size: 1.5em;
}

h3 {
  font-size: 1.2em;
}

/* Paragraphs */
p {
  margin: 0;
  text-indent: 1.5em;
  orphans: 2;
  widows: 2;
}

p:first-of-type,
p.first {
  text-indent: 0;
}

/* Chapter titles */
.chapter-title {
  text-align: center;
  font-size: 2em;
  margin-top: 2em;
  margin-bottom: 1em;
  page-break-before: always;
}

/* Section titles */
.section-title {
  font-size: 1.3em;
  margin-top: 2em;
  margin-bottom: 1em;
}

/* Title page */
.title-page {
  text-align: center;
  padding: 2em;
  page-break-after: always;
}

.book-title {
  font-size: 3em;
  font-weight: bold;
  margin-bottom: 1em;
}

.book-author {
  font-size: 1.5em;
  margin-top: 2em;
}

/* Copyright page */
.copyright-page {
  page-break-after: always;
  font-size: 0.9em;
  text-align: left;
}

/* Links */
a {
  text-decoration: none;
  color: inherit;
}

/* Table of contents */
nav ol {
  list-style-type: none;
  padding-left: 0;
}

nav li {
  margin: 0.5em 0;
}

/* Text formatting */
strong, b {
  font-weight: bold;
}

em, i {
  font-style: italic;
}

/* Lists */
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.5em 0;
}

/* Blockquotes */
blockquote {
  margin: 1em 2em;
  font-style: italic;
}

/* Page breaks */
.page-break {
  page-break-before: always;
}

.page-break-after {
  page-break-after: always;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.cover-image {
  max-width: 80%;
  margin: 2em auto;
}

.chapter-image {
  max-width: 60%;
  margin: 1.5em auto;
}

.section-image {
  text-align: center;
  margin: 1.5em auto;
}

.section-image img {
  max-width: 70%;
}

.image-caption {
  font-size: 0.9em;
  font-style: italic;
  text-align: center;
  margin-top: 0.5em;
  text-indent: 0;
}

figure {
  margin: 1.5em 0;
  text-align: center;
}

/* Amazon Kindle specific */
@media amzn-kf8 {
  body {
    font-family: Georgia, serif;
  }
}`;
}

function generateTitlePage(project: BookProject): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${project.meta.language || "en"}" lang="${project.meta.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>Title Page</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="title-page">
    ${project.coverImageId ? `<img src="images/${project.coverImageId}.png" alt="Cover" class="cover-image"/>` : ""}
    <h1 class="book-title">${escapeXml(project.meta.title)}</h1>
    ${project.meta.subtitle ? `<h2 class="book-subtitle">${escapeXml(project.meta.subtitle)}</h2>` : ""}
    <p class="book-author">by ${escapeXml(project.meta.authorName || "Unknown Author")}</p>
  </div>
</body>
</html>`;
}

function generateCopyrightPage(project: BookProject): string {
  const year = new Date().getFullYear();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${project.meta.language || "en"}" lang="${project.meta.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>Copyright</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="copyright-page">
    <h1>Copyright</h1>
    <p>${escapeXml(project.meta.title)}</p>
    <p>Copyright © ${year} by ${escapeXml(project.meta.authorName || "Unknown Author")}</p>
    <p>All rights reserved. No part of this book may be reproduced in any form or by any electronic or mechanical means, including information storage and retrieval systems, without written permission from the author, except for the use of brief quotations in a book review.</p>
    <p>Generated by BookGen</p>
  </div>
</body>
</html>`;
}

function generateChapterXhtml(
  chapter: any,
  index: number,
  project: BookProject
): string {
  // Convert chapter sections to HTML
  const sectionsHtml = chapter.sections
    .map((section: any) => {
      // Convert section content (HTML) to clean XHTML
      let content = section.content || "";
      
      // Clean up the HTML to be valid XHTML
      content = cleanHtmlForEpub(content);
      
      // Add section images
      let imagesHtml = "";
      if (section.images && section.images.length > 0) {
        imagesHtml = section.images
          .map((img: any) => {
            const caption = img.caption ? `<p class="image-caption">${escapeXml(img.caption)}</p>` : "";
            const alt = img.altText || "Section image";
            return `<figure class="section-image">
              <img src="images/${img.id}.png" alt="${escapeXml(alt)}"/>
              ${caption}
            </figure>`;
          })
          .join("\n");
      }

      // Only show section title if it exists and isn't "Opening"
      const sectionTitleHtml = section.title && section.title !== "Opening"
        ? `<h2 class="section-title">${escapeXml(section.title)}</h2>`
        : "";
      
      return `    <section class="section">
      ${sectionTitleHtml}
      ${imagesHtml}
      ${content}
    </section>`;
    })
    .join("\n\n");
  
  // Add chapter image
  const chapterImageHtml = chapter.imageId
    ? `<img src="images/${chapter.imageId}.png" alt="Chapter illustration" class="chapter-image"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${project.meta.language || "en"}" lang="${project.meta.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="chapter">
    <h1 class="chapter-title">Chapter ${index + 1}: ${escapeXml(chapter.title)}</h1>
    ${chapterImageHtml}
    ${sectionsHtml}
  </div>
</body>
</html>`;
}

function escapeXml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanHtmlForEpub(html: string): string {
  if (!html) return "";
  
  // First, escape any unescaped ampersands in text content
  // This regex finds & that aren't part of existing HTML entities
  html = html.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
  
  // Remove empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gi, "");
  
  // Ensure <br> tags are self-closing for XHTML
  html = html.replace(/<br>/gi, "<br/>");
  html = html.replace(/<br\s+\/>/gi, "<br/>");
  
  // Ensure <img> tags are self-closing
  html = html.replace(/<img([^>]+)>/gi, "<img$1/>");
  
  // Ensure <hr> tags are self-closing
  html = html.replace(/<hr>/gi, "<hr/>");
  html = html.replace(/<hr\s+\/>/gi, "<hr/>");
  
  // Remove any inline styles that might cause issues
  html = html.replace(/style="[^"]*"/gi, "");
  
  // Ensure proper closing tags
  html = html.replace(/<p([^>]*)>/gi, "<p$1>").replace(/<\/p>/gi, "</p>");
  
  // Fix any attribute values that might have unescaped quotes
  // This is already handled by the editor, but just in case
  
  return html;
}

/**
 * Download the EPUB file
 */
export function downloadEPUB(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

