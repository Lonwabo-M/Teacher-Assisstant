import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DownloadIcon } from './icons/DownloadIcon';
import LatexRenderer from './LatexRenderer';
import { generateNotesDocx } from '../utils/exportUtils';

interface NotesProps {
  notes: string;
  title: string;
}

// Printable component for PDF generation
const PrintableNotes: React.FC<{ notes: string, title: string }> = ({ notes, title }) => (
  <div 
    className="p-10 bg-white font-serif text-black"
    style={{ width: '800px', fontSize: '12pt' }}
  >
    <h1 className="text-center font-bold mb-4" style={{ fontSize: '20pt' }}>{title}</h1>
    <h2 className="text-center font-semibold mb-10 text-slate-700" style={{ fontSize: '16pt' }}>Student Notes</h2>
    <div className="space-y-4" style={{ lineHeight: 1.6 }}>
      <LatexRenderer content={notes} enableMarkdown={true} />
    </div>
  </div>
);

const Notes: React.FC<NotesProps> = ({ notes, title }) => {
  const printableNotesRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!printableNotesRef.current) return;
    setIsDownloading('pdf');

    // Get the element to render
    const element = printableNotesRef.current;
    
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, // Use a good scale for high quality
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use high quality jpeg
      const pdf = new jsPDF('p', 'px', 'a4');
      
      const margin = 40; // 40px margin
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - margin * 2;
      const pageContentHeight = pdfHeight - margin * 2;

      const imgProps = pdf.getImageProperties(imgData);
      // Calculate the image height in the PDF based on the content width and original aspect ratio
      const totalImageHeight = (imgProps.height * contentWidth) / imgProps.width;

      let heightLeft = totalImageHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalImageHeight);
      heightLeft -= pageContentHeight;

      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position -= pageContentHeight; // Move the image "up" on the new page
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position + margin, contentWidth, totalImageHeight);
        heightLeft -= pageContentHeight;
      }
      
      pdf.save(`${title.replace(/\s+/g, '_')}-notes.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadDocx = async () => {
    setIsDownloading('docx');
    try {
      await generateNotesDocx(notes, title);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      alert("Failed to generate Word document. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <>
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={printableNotesRef}>
          <PrintableNotes notes={notes} title={title} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
          <h2 className="text-3xl font-bold text-slate-800">Student Notes</h2>
           <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadDocx}
                disabled={!!isDownloading}
                className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download notes as a Word document"
              >
                <div className="h-5 w-5 mr-2">
                  {isDownloading === 'docx' ? (
                    <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <DownloadIcon />
                  )}
                </div>
                {isDownloading === 'docx' ? 'Generating...' : 'Download Word'}
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={!!isDownloading}
                className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download notes as PDF"
              >
                <div className="h-5 w-5 mr-2">
                  {isDownloading === 'pdf' ? (
                    <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <DownloadIcon />
                  )}
                </div>
                {isDownloading === 'pdf' ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <LatexRenderer content={notes} className="text-slate-700 whitespace-pre-wrap" enableMarkdown={true} />
        </div>
      </div>
    </>
  );
};

export default Notes;