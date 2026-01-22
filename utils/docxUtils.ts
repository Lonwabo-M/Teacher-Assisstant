
declare const docx: any;

/**
 * Strips LaTeX delimiters and returns the content inside.
 */
export const stripLatex = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (match, p1, p2) => p1 || p2 || '');
};

/**
 * Converts a simple markdown string into an array of docx Paragraph objects.
 */
export const markdownToDocxParagraphs = (content: string) => {
  const { Paragraph, TextRun, HeadingLevel } = docx;
  const paragraphs: any[] = [];
  const lines = stripLatex(content).split('\n');

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: trimmedLine.substring(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
    } else if (trimmedLine.startsWith('## ')) {
        paragraphs.push(new Paragraph({
          text: trimmedLine.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }));
    } else if (trimmedLine.startsWith('- ')) {
      paragraphs.push(new Paragraph({
        text: trimmedLine.substring(2),
        bullet: { level: 0 },
      }));
    } else if (trimmedLine) {
      paragraphs.push(new Paragraph({ text: trimmedLine, spacing: { after: 100 } }));
    }
  });

  return paragraphs;
};
