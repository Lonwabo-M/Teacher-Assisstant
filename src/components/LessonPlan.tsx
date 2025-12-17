
import React, { useRef, useState } from 'react';
import type { LessonPlanSection } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import LatexRenderer from './LatexRenderer';
import { generateLessonPlanDocx } from '../utils/exportUtils';
import { downloadPdf } from '../utils/downloadUtils';
import { Spinner } from './Spinner';

interface LessonPlanProps {
  plan: LessonPlanSection[];
  title: string;
}

// New component specifically styled for A4 PDF printing
const PrintableLessonPlan: React.FC<{ plan: LessonPlanSection[] }> = ({ plan }) => (
  <div 
    className="p-10 bg-white font-serif text-black"
    style={{ width: '800px', fontSize: '12pt' }}
  >
    <h1 className="text-center font-bold mb-10 print-item" style={{ fontSize: '24pt' }}>Lesson Plan</h1>
    <div className="space-y-8">
      {(plan || []).map((section, index) => (
        <div key={index} className="border-b-2 border-slate-200 pb-4 last:border-b-0 print-item" style={{ breakInside: 'avoid' }}>
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-sky-800" style={{ fontSize: '16pt' }}>{section.title}</h3>
            <span className="text-base font-medium text-slate-600 flex-shrink-0 ml-4 bg-slate-100 px-3 py-1 rounded-md">{section.duration}</span>
          </div>
          <LatexRenderer content={section.content} className="text-slate-800 whitespace-pre-wrap" style={{ lineHeight: 1.6 }} enableMarkdown={true}/>
        </div>
      ))}
    </div>
  </div>
);

const LessonPlan: React.FC<LessonPlanProps> = ({ plan, title }) => {
  const printablePlanRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!printablePlanRef.current) return;
    setIsDownloading('pdf');

    try {
      await downloadPdf({
        filename: `${title.replace(/\s+/g, '_')}-lesson-plan.pdf`,
        element: printablePlanRef.current,
        orientation: 'p'
      });
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
      await generateLessonPlanDocx(plan, title);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      alert("Failed to generate Word document. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <>
      {/* Off-screen container for the printable version */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={printablePlanRef}>
          <PrintableLessonPlan plan={plan} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
          <h2 className="text-3xl font-bold text-slate-800">Lesson Plan</h2>
           <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadDocx}
                disabled={!!isDownloading}
                className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download lesson plan as a Word document"
              >
                <div className="h-5 w-5 mr-2">
                  {isDownloading === 'docx' ? (
                    <Spinner className="h-full w-full" />
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
                aria-label="Download lesson plan as PDF"
              >
                <div className="h-5 w-5 mr-2">
                  {isDownloading === 'pdf' ? (
                    <Spinner className="h-full w-full" />
                  ) : (
                    <DownloadIcon />
                  )}
                </div>
                {isDownloading === 'pdf' ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
        </div>

        <div className="space-y-8">
          {(plan || []).map((section, index) => (
            <div key={index} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-sky-700">{section.title}</h3>
                <span className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full">{section.duration}</span>
              </div>
              <LatexRenderer content={section.content} className="text-slate-600 whitespace-pre-wrap" enableMarkdown={true} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LessonPlan;
