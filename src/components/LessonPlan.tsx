import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { LessonPlanSection } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import LatexRenderer from './LatexRenderer';

interface LessonPlanProps {
  plan: LessonPlanSection[];
}

// New component specifically styled for A4 PDF printing
const PrintableLessonPlan: React.FC<{ plan: LessonPlanSection[] }> = ({ plan }) => (
  <div 
    className="p-10 bg-white font-serif text-black"
    style={{ width: '800px', fontSize: '12pt' }}
  >
    <h1 className="text-center font-bold mb-10" style={{ fontSize: '24pt' }}>Lesson Plan</h1>
    <div className="space-y-8">
      {plan.map((section, index) => (
        <div key={index} className="border-b-2 border-slate-200 pb-4 last:border-b-0" style={{ breakInside: 'avoid' }}>
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

const LessonPlan: React.FC<LessonPlanProps> = ({ plan }) => {
  const printablePlanRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!printablePlanRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(printablePlanRef.current, { 
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'px', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save('lesson-plan.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
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
        <div className="flex justify-between items-center border-b-2 border-sky-200 pb-2">
          <h2 className="text-3xl font-bold text-slate-800">Lesson Plan</h2>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:bg-slate-300 disabled:cursor-wait"
            aria-label="Download lesson plan as PDF"
          >
            <div className="h-5 w-5 mr-2">
              {isDownloading ? (
                <svg className="animate-spin h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <DownloadIcon />
              )}
            </div>
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        <div className="space-y-8">
          {plan.map((section, index) => (
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