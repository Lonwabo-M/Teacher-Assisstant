import React, { useRef, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { LessonPlanSection } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { forceLatexRender, waitAndVerifyLatex } from '../utils/forceLatexRender';

interface LessonPlanProps {
  plan: LessonPlanSection[];
}

const LessonPlan: React.FC<LessonPlanProps> = ({ plan }) => {
  const planContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (planContainerRef.current) {
      forceLatexRender(planContainerRef.current);
    }
  }, [plan]);

  const handleDownload = async () => {
    if (!planContainerRef.current) return;
    setIsDownloading(true);

    try {
      console.log('Starting PDF generation...');
      
      // Wait and verify LaTeX rendered
      const latexRendered = await waitAndVerifyLatex(planContainerRef.current);
      
      if (!latexRendered) {
        console.warn('LaTeX may not have rendered properly');
      }

      console.log('Capturing with html2canvas...');
      const canvas = await html2canvas(planContainerRef.current, { 
        scale: 2,
        windowHeight: planContainerRef.current.scrollHeight,
        windowWidth: planContainerRef.current.scrollWidth,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging to see what's happening
        useCORS: true,
      });
      
      console.log('Canvas created, generating PDF...');
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
      
      pdf.save('lesson-plan.pdf');
      console.log('PDF saved successfully');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
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

      <div ref={planContainerRef} className="space-y-8">
        {plan.map((section, index) => (
          <div key={index} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-sky-700">{section.title}</h3>
              <span className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full">{section.duration}</span>
            </div>
            <div className="text-slate-600 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: section.content }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonPlan;
