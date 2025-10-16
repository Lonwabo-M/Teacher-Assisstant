import type { PdfOptions } from '../types';

const PDF_AGENT_URL = 'https://latex-pdf-agent.vercel.app/api/generate-pdf';

/**
 * Constructs a self-contained HTML document string from an element's content,
 * suitable for rendering in a headless browser environment.
 * @param contentHtml The inner or outer HTML to be rendered.
 * @param title The document title.
 * @param customStyles Additional CSS styles to inject.
 * @returns A full HTML string.
 */
const createHtmlDocument = (contentHtml: string, title: string, customStyles: string = ''): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
      <style>
        body {
          font-family: sans-serif;
          background-color: #ffffff !important; /* Ensure white background for PDF */
          -webkit-print-color-adjust: exact; /* Force background colors in PDF */
          print-color-adjust: exact;
        }
        .katex-display { font-size: 1.05em; }
        ${customStyles}
      </style>
    </head>
    <body class="bg-white p-8">
      ${contentHtml}
    </body>
    </html>
  `;
};

/**
 * Generates a PDF from an HTML element using the external PDF agent.
 * @returns A promise that resolves with the PDF Blob.
 */
export const generatePdf = async (
  element: HTMLElement | null,
  options: PdfOptions
): Promise<Blob> => {
  if (!element) {
    throw new Error('Element not found for PDF generation');
  }

  const contentHtml = element.innerHTML;
  const fullHtml = createHtmlDocument(contentHtml, options.filename);

  try {
    const response = await fetch(PDF_AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: fullHtml,
        filename: options.filename,
        pdfOptions: {
          format: 'A4',
          printBackground: true,
          margin: { top: '25px', right: '25px', bottom: '25px', left: '25px' },
          landscape: options.orientation === 'landscape',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation service failed with status ${response.status}: ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('PDF generation via agent failed:', error);
    throw error;
  }
};

/**
 * Generates a multi-page PDF from multiple HTML elements using the external agent.
 * @returns A promise that resolves with the PDF Blob.
 */
export const generateMultiPagePdf = async (
  elements: HTMLElement[],
  options: PdfOptions
): Promise<Blob> => {
  if (elements.length === 0) {
    throw new Error('No elements provided for PDF generation');
  }
  
  // Clone each element to avoid modifying the live DOM
  const contentHtml = elements.map(el => {
      const clone = el.cloneNode(true) as HTMLElement;
      return clone.outerHTML;
  }).join('');
  
  // Add styles for page breaks and to mimic the original layout for the agent
  const customStyles = `
    .grid { display: block !important; } /* Override grid for a simple vertical page flow */
    .slide-card {
      width: 600px !important;
      page-break-after: always;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      border-radius: 0.5rem;
      background-color: #ffffff;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .speaker-notes { display: none !important; }
  `;
  
  const fullHtml = createHtmlDocument(contentHtml, options.filename, customStyles);

  try {
    const response = await fetch(PDF_AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: fullHtml,
        filename: options.filename,
        pdfOptions: {
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
          landscape: options.orientation === 'landscape',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation service failed with status ${response.status}: ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Multi-page PDF generation via agent failed:', error);
    throw error;
  }
};