import type { LessonPlanSection, Worksheet } from '../types';

// The docx library is loaded from a script tag in index.html and is available globally.
declare const docx: any;

/**
 * Strips LaTeX delimiters \(`...`\) and \[`...`\] from a string, returning the content inside.
 * @param text The input string which may contain LaTeX.
 * @returns The string with LaTeX delimiters and commands removed, keeping the content.
 */
const stripLatex = (text: string | undefined): string => {
  if (!text) return '';
  // This regex finds block \[...\] and inline \(...\) LaTeX expressions and replaces them with their content.
  return text.replace(/\\\[(.*?)\\\]|\\\((.*?)\\\)/gs, (match, blockContent, inlineContent) => {
    return blockContent || inlineContent || '';
  });
};

/**
 * Creates a .docx file from the lesson plan data and initiates a download.
 * @param plan The lesson plan data.
 * @param lessonTitle The title of the lesson, used for the filename.
 */
export const generateLessonPlanDocx = async (plan: LessonPlanSection[], lessonTitle: string) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const children: any[] = [
    new Paragraph({
      text: lessonTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
  ];

  plan.forEach(section => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            size: 28, // 14pt
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Duration: ${section.duration}`,
            italics: true,
            size: 24, // 12pt
            color: "555555",
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Basic markdown-to-docx conversion
    const contentLines = stripLatex(section.content).split('\n');
    contentLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('### ')) {
        children.push(new Paragraph({
          text: trimmedLine.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }));
      } else if (trimmedLine.startsWith('- ')) {
        children.push(new Paragraph({
          text: trimmedLine.substring(2),
          bullet: { level: 0 },
        }));
      } else if (trimmedLine) {
        children.push(new Paragraph({ text: trimmedLine, spacing: { after: 100 } }));
      }
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
    styles: {
      paragraphStyles: [
        {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
                size: 24, // 12pt
            },
        },
      ]
    }
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lessonTitle.replace(/\s+/g, '_')}-lesson-plan.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
