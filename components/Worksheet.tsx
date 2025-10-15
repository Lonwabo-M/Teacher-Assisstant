import React, { useRef, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Worksheet, WorksheetQuestion, ChartData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import Chart from './Chart';

// Declare KaTeX's auto-render function, loaded from a script in index.html
declare const renderMathInElement: any;

const katexDelimiters = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
];

/**
 * A reusable helper to trigger the KaTeX rendering process on a given DOM element.
 * @param element The HTML element to scan for LaTeX.
 */
const triggerKatexRender = (element: HTMLElement | null) => {
  if (element && typeof renderMathInElement === 'function') {
    renderMathInElement(element, { delimiters: katexDelimiters, throwOnError: false });
  }
};

interface WorksheetProps {
  worksheet: Worksheet;
  chartData?: ChartData;
}

const Question: React.FC<{ question: WorksheetQuestion; index: number }> = ({ question, index }) => {
  return (
    <div className="py-4">
      <div className="font-semibold text-slate-700 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1"
        dangerouslySetInnerHTML={{ __html: `${index + 1}. ${question.question}`}}
      />
      {question.type === 'multiple-choice' && question.options && (
        <ul className="space-y-1 pl-6">
          {question.options.map((option, i) => (
            <li key={i} className="flex items-center">
              <span className="mr-2 text-slate-500">{String.fromCharCode(97 + i)}.</span>
              <span className="text-slate-600" dangerouslySetInnerHTML={{ __html: option }}></span>
            </li>
          ))}
        </ul>
      )}
      {(question.type === 'short-answer' || question.type === 'fill-in-the-blank' || question.type === 'source-based' || question.type === 'essay') && (
         <div className="mt-2 border-b-2 border-dotted border-slate-400 h-8"></div>
      )}
    </div>
  );
};

// A separate component for the printable memo to control styling for PDF generation
const PrintableMemo: React.FC<{ worksheet: Worksheet, chartData?: ChartData, innerRef: React.RefObject<HTMLDivElement> }> = ({ worksheet, chartData, innerRef }) => {
  useEffect(() => {
    triggerKatexRender(innerRef.current);
  }, [worksheet, chartData, innerRef]);

  const generalQuestions = worksheet.questions.filter(q => q.type !== 'source-based');
  const sourceBasedQuestions = worksheet.questions.filter(q => q.type === 'source-based');

  return (
    <div 
      ref={innerRef} 
      className="p-8 bg-white font-[serif] text-black" 
      style={{ 
        width: '800px', 
        fontSize: '12pt', 
        lineHeight: 1.5 
      }}
    >
      <h1 className="text-center mb-8 font-bold" style={{ fontSize: '20pt' }}>
        {worksheet.title} - Answer Memo
      </h1>
      
      {generalQuestions.length > 0 && (
        <section className="mb-8">
          <h2 className="border-b-2 border-black pb-2 mb-4 font-bold" style={{ fontSize: '16pt' }}>
            General Questions
          </h2>
          {generalQuestions.map((q, index) => (
            <div key={`memo-gen-${index}`} className="mb-6">
              <p className="font-bold" style={{ fontSize: '14pt' }} dangerouslySetInnerHTML={{ __html: `${index + 1}. ${q.question}` }} />
              {q.answer && (
                <div className="mt-2 p-2 bg-slate-100 border border-slate-300 rounded" dangerouslySetInnerHTML={{ __html: q.answer }} />
              )}
            </div>
          ))}
        </section>
      )}

      {sourceBasedQuestions.length > 0 && (
        <section>
          <h2 className="border-b-2 border-black pb-2 mb-4 font-bold" style={{ fontSize: '16pt' }}>
            Source-Based Analysis
          </h2>
          {sourceBasedQuestions.map((q, index) => (
            <div key={`memo-src-${index}`} className="mb-6">
              <p className="font-bold" style={{ fontSize: '14pt' }} dangerouslySetInnerHTML={{ __html: `${generalQuestions.length + index + 1}. ${q.question}` }} />
              {q.answer && (
                <div className="mt-2 p-2 bg-slate-100 border border-slate-300 rounded" dangerouslySetInnerHTML={{ __html: q.answer }} />
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};


const Worksheet: React.FC<WorksheetProps> = ({ worksheet, chartData }) => {
  const worksheetContentRef = useRef<HTMLDivElement>(null);
  const memoRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<'worksheet' | 'memo' | null>(null);

  useEffect(() => {
    // Trigger KaTeX rendering for the on-screen worksheet view
    triggerKatexRender(worksheetContentRef.current);
  }, [worksheet, chartData]);

  const generalQuestions = worksheet.questions.filter(q => q.type !== 'source-based');
  const sourceBasedQuestions = worksheet.questions.filter(q => q.type === 'source-based');

  const createPdfFromElement = async (element: HTMLElement | null, filename: string) => {
    if (!element) return;
    
    try {
        const canvas = await html2canvas(element, { 
            scale: 2,
            windowHeight: element.scrollHeight,
            windowWidth: element.scrollWidth,
            useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(filename);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Please try again.");
    }
  };

  const downloadWithLatex = async (
    targetRef: React.RefObject<HTMLDivElement>, 
    filename: string, 
    setLoadingState: () => void, 
    clearLoadingState: () => void
  ) => {
    setLoadingState();

    const element = targetRef.current;
    if (!element) {
      console.error("PDF generation target element not found.");
      alert("Could not generate PDF: target element missing.");
      clearLoadingState();
      return;
    }

    const memoContainer = document.getElementById('memo-pdf-generator');
    const isMemo = memoContainer && memoContainer.contains(element);
    const containerToToggle = isMemo ? memoContainer : null;
    const originalContainerClassName = containerToToggle?.className;

    try {
        if (containerToToggle) {
            // Temporarily move the hidden memo container into a renderable (but off-screen)
            // position. This is a robust way to ensure html2canvas captures it correctly.
            containerToToggle.className = 'absolute -top-[9999px] -left-[9999px]';
        }

        // Trigger the synchronous KaTeX DOM update process.
        triggerKatexRender(targetRef.current);

        // Wait for custom fonts used by KaTeX to load. This is asynchronous and crucial.
        await Promise.race([
          document.fonts.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Font loading timed out after 5 seconds.')), 5000))
        ]).catch(err => console.warn('Font loading issue:', err.message));

        // Add a small, final delay to ensure all styles are fully applied and painted by the browser.
        await new Promise(resolve => setTimeout(resolve, 300));

        await createPdfFromElement(targetRef.current, filename);

    } catch (error) {
        console.error("Error during PDF generation process:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while creating the PDF.";
        alert(`Failed to generate PDF. ${errorMessage}`);
    } finally {
        if (containerToToggle && originalContainerClassName) {
            containerToToggle.className = originalContainerClassName;
        }
        clearLoadingState();
    }
  };


  const handleDownloadWorksheet = async () => {
    await downloadWithLatex(
      worksheetContentRef,
      `${worksheet.title.replace(/\s+/g, '_')}-worksheet.pdf`,
      () => setIsDownloading('worksheet'),
      () => setIsDownloading(null)
    );
  };

  const handleDownloadMemo = async () => {
    await downloadWithLatex(
      memoRef,
      `${worksheet.title.replace(/\s+/g, '_')}-memo.pdf`,
      () => setIsDownloading('memo'),
      () => setIsDownloading(null)
    );
  };


  return (
    <>
      {/* Hidden container for generating the memo PDF. */}
      <div id="memo-pdf-generator" className="absolute opacity-0 -z-10 pointer-events-none">
          <PrintableMemo worksheet={worksheet} chartData={chartData} innerRef={memoRef} />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
          <h2 className="text-3xl font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: worksheet.title }}/>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadWorksheet}
              disabled={!!isDownloading}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download worksheet as PDF"
              title="Generates a PDF worksheet. Please wait a moment for equations to render."
            >
              <div className="h-5 w-5 mr-2">
                {isDownloading === 'worksheet' ? (
                  <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <DownloadIcon />
                )}
              </div>
              <span>Download Worksheet</span>
            </button>
             <button
              onClick={handleDownloadMemo}
              disabled={!!isDownloading}
              className="inline-flex items-center px-4 py-2 bg-sky-100 text-sky-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download answer memo as PDF"
              title="Generates a PDF answer memo. Please wait a moment for equations to render."
            >
              <div className="h-5 w-5 mr-2">
                 {isDownloading === 'memo' ? (
                  <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <DownloadIcon />
                )}
              </div>
              <span>Download Memo</span>
            </button>
          </div>
        </div>

        <div ref={worksheetContentRef} className="p-4 bg-white">
          {chartData && (
             <div className="mb-8 border border-slate-300 bg-slate-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-slate-700 mb-4">Source Material: Chart</h3>
              <div className="h-96">
                <Chart chartData={chartData} showControls={false} />
              </div>
             </div>
          )}
          {worksheet.source && (
            <div className="mb-8 border border-slate-300 bg-slate-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-slate-700 mb-2">Source Material</h3>
              <h4 className="font-semibold text-sky-800 mb-4" dangerouslySetInnerHTML={{ __html: worksheet.source.title }} />
              <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: worksheet.source.content }} />
            </div>
          )}
          <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-r-lg">
            <h3 className="font-bold">Instructions</h3>
            <p dangerouslySetInnerHTML={{ __html: worksheet.instructions }} />
          </div>
          
          <div className="mt-8 space-y-8">
              {generalQuestions.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 px-1">General Questions</h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg p-4">
                    {generalQuestions.map((q, index) => (
                      <Question key={`gen-${index}`} question={q} index={index} />
                    ))}
                  </div>
                </section>
              )}

              {sourceBasedQuestions.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 px-1">Source-Based Analysis</h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg p-4">
                    {sourceBasedQuestions.map((q, index) => (
                      <Question key={`src-${index}`} question={q} index={index + generalQuestions.length} />
                    ))}
                  </div>
                </section>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Worksheet;