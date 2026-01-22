
import type { LessonPlanSection } from '../types';
import { markdownToDocxParagraphs } from './docxUtils';

declare const docx: any;

export const generateLessonPlanDocx = async (plan: LessonPlanSection[], lessonTitle: string) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const children: any[] = [
    new Paragraph({
      text: lessonTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
  ];

  plan.forEach(section => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Duration: ${section.duration}`,
            italics: true,
            size: 24,
            color: "555555",
          }),
        ],
        spacing: { after: 200 },
      })
    );

    children.push(...markdownToDocxParagraphs(section.content));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      paragraphStyles: [{
        id: "Normal",
        name: "Normal",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24 },
      }]
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

export const generateNotesDocx = async (notes: string, lessonTitle: string) => {
  const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;

  const children: any[] = [
    new Paragraph({
      text: `${lessonTitle} - Student Notes`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    ...markdownToDocxParagraphs(notes)
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      paragraphStyles: [{
        id: "Normal",
        name: "Normal",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24 },
      }]
    }
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lessonTitle.replace(/\s+/g, '_')}-notes.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
