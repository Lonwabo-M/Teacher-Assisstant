import React, { useRef, useState } from 'react';
import type { Slide, UserInputs, ChartData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import Chart from './Chart';
import LatexRenderer from './LatexRenderer';
import { generateMultiPagePdf } from '../utils/pdfUtils';


interface SlidesProps {
  slides: Slide[];
  inputs: UserInputs;
  chartData?: ChartData;
}

const Slides: React.FC<SlidesProps> = ({ slides, inputs, chartData }) => {
  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!slidesContainerRef.current) return;
    setIsDownloading(true);

    const slideElements = Array.from(slidesContainerRef.current.querySelectorAll('.slide-card')) as HTMLElement[];

    try {
      const blob = await generateMultiPagePdf(slideElements, {
        filename: 'presentation-slides.pdf',
        orientation: 'landscape'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation-slides.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
        <h2 className="text-3xl font-bold text-slate-800">Presentation Slides</h2>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:bg-slate-300 disabled:cursor-wait"
          aria-label="Download slides as PDF"
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
       <div ref={slidesContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {slides.map((slide, index) => (
          <div key={index} className="slide-card flex flex-col bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <div className="relative flex-shrink-0">
              <LatexRenderer as="h3" content={slide.title} className="text-2xl font-bold text-sky-800 pr-16 z-10 relative" />
              <span className="absolute -top-2 right-0 text-7xl font-black text-slate-100 select-none z-0">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex-grow space-y-3 mt-4">
              <LatexRenderer as="p" content={`<strong>Key Concept:</strong> ${slide.keyConcept}`} className="text-md text-slate-500 italic" />
              
              <ul className="list-disc list-inside text-slate-700 space-y-2 pt-2">
                {index === 0 ? (
                  <>
                    <li>Subject: {inputs.subject}</li>
                    <li>Grade: {inputs.grade} ({inputs.standard})</li>
                    <li>Teacher: [Your Name]</li>
                  </>
                ) : (
                  slide.content.map((point, pointIndex) => (
                    <LatexRenderer as="li" key={pointIndex} content={point} />
                  ))
                )}
              </ul>
            </div>
             {slide.speakerNotes && (
              <div className="speaker-notes mt-4 pt-3 border-t border-slate-200">
                <h4 className="font-semibold text-sm text-slate-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  Speaker Notes
                </h4>
                <LatexRenderer content={slide.speakerNotes} className="text-sm text-slate-500 whitespace-pre-wrap mt-1 pl-6" />
              </div>
            )}
          </div>
        ))}

        {chartData && (
          <div className="slide-card flex flex-col bg-white p-6 rounded-lg shadow-md border border-slate-200 min-h-[400px]">
            <div className="relative flex-shrink-0">
                <h3 className="text-2xl font-bold text-sky-800 pr-16 z-10 relative">{chartData.title}</h3>
                <span className="absolute -top-2 right-0 text-7xl font-black text-slate-100 select-none z-0">
                    {String(slides.length + 1).padStart(2, '0')}
                </span>
            </div>
            <div className="flex-grow mt-4 flex flex-col">
                <p className="text-md text-slate-500 italic mb-2">
                    <strong>Key Concept:</strong> Data Interpretation
                </p>
                <div className="flex-grow min-h-[250px] flex flex-col">
                    <Chart chartData={chartData} showControls={false} />
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Slides;