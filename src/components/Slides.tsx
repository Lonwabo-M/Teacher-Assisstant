import React, { useRef, useState } from 'react';
import type { Slide, UserInputs, ChartData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import Chart from './Chart';
import LatexRenderer from './LatexRenderer';
import { downloadSlidesPdf } from '../utils/downloadUtils';
import { Spinner } from './Spinner';

interface SlidesProps {
  slides: Slide[];
  inputs: UserInputs;
  chartData?: ChartData;
}

// Helper to group content lines if they are part of a table
const groupContentLines = (content: string[]) => {
    const grouped: string[] = [];
    let tableBuffer: string[] = [];

    content.forEach(line => {
        if (line.trim().startsWith('|')) {
            tableBuffer.push(line);
        } else {
            if (tableBuffer.length > 0) {
                grouped.push(tableBuffer.join('\n'));
                tableBuffer = [];
            }
            grouped.push(line);
        }
    });
    if (tableBuffer.length > 0) {
        grouped.push(tableBuffer.join('\n'));
    }
    return grouped;
};

// A new component specifically for creating a printable, landscape A4 page for each slide.
const PrintableSlidePage: React.FC<{
  slide: Slide;
  index: number;
  total: number;
  inputs: UserInputs;
}> = ({ slide, index, total, inputs }) => {
  const processedContent = groupContentLines(slide.content);

  return (
    <div
      className="printable-slide-page bg-white p-8 flex flex-col justify-between"
      style={{
        width: '1122px', // A4 landscape width in pixels approx
        height: '793px', // A4 landscape height
        boxSizing: 'border-box',
      }}
    >
      {/* Main slide content, centered */}
      <div className="flex-grow flex flex-col justify-center items-center text-center px-12">
        <LatexRenderer as="h3" content={slide.title} className="text-5xl font-bold text-sky-800 mb-8" />
        {index === 0 ? (
          <div className="text-3xl space-y-4">
            <p>Subject: {inputs.subject}</p>
            <p>Grade: {inputs.grade} ({inputs.standard})</p>
          </div>
        ) : (
          <div className="text-3xl space-y-4 text-left max-w-4xl w-full">
            <div className="space-y-4">
            {processedContent.map((point, i) => {
                 const isTable = point.trim().startsWith('|');
                 if (isTable) {
                    return (
                        <LatexRenderer 
                            as="div" 
                            key={i} 
                            content={point} 
                            enableMarkdown={true}
                            className="w-full" 
                        />
                    );
                 }
                 return (
                    <div key={i} className="flex items-start">
                        <span className="mr-3 mt-3 h-2 w-2 flex-shrink-0 rounded-full bg-slate-600" />
                        <LatexRenderer 
                            as="div" 
                            content={point} 
                            enableMarkdown={true}
                            className="flex-1" 
                        />
                    </div>
                 )
            })}
            </div>
          </div>
        )}
      </div>

      {/* Speaker notes section at the bottom */}
      {slide.speakerNotes && (
        <div className="flex-shrink-0 mt-8 pt-4 border-t-2 border-slate-200">
          <h4 className="font-bold text-lg text-slate-700 mb-2">Speaker Notes:</h4>
          <LatexRenderer content={slide.speakerNotes} className="text-base text-slate-600 whitespace-pre-wrap" enableMarkdown={true} />
        </div>
      )}

      {/* Page number footer */}
      <div className="flex-shrink-0 text-right text-slate-400 mt-4 text-sm">
        Slide {index + 1} of {total}
      </div>
    </div>
  );
};


const Slides: React.FC<SlidesProps> = ({ slides, inputs, chartData }) => {
  const printableContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const totalSlides = slides.length + (chartData ? 1 : 0);

  const handleDownload = async () => {
    if (!printableContainerRef.current) return;
    setIsDownloading(true);

    try {
        await downloadSlidesPdf({
            filename: 'presentation-slides.pdf',
            container: printableContainerRef.current,
            slideSelector: '.printable-slide-page'
        });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Off-screen container for rendering all printable slides */}
      <div ref={printableContainerRef} className="absolute top-[-9999px] left-[-9999px] space-y-2">
        {slides.map((slide, index) => (
          <PrintableSlidePage
            key={`printable-${index}`}
            slide={slide}
            index={index}
            total={totalSlides}
            inputs={inputs}
          />
        ))}
        {/* Placeholder for chart slide if needed */}
      </div>

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
                <Spinner className="h-full w-full" />
              ) : (
                <DownloadIcon />
              )}
            </div>
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {slides.map((slide, index) => {
            const processedContent = groupContentLines(slide.content);
            
            return (
            <div key={index} className="flex flex-col bg-white p-6 rounded-lg shadow-md border border-slate-200">
              <div className="relative flex-shrink-0">
                <LatexRenderer as="h3" content={slide.title} className="text-2xl font-bold text-sky-800 pr-16 z-10 relative" />
                <span className="absolute -top-2 right-0 text-7xl font-black text-slate-100 select-none z-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              
              <div className="flex-grow space-y-3 mt-4">
                <LatexRenderer as="p" content={`<strong>Key Concept:</strong> ${slide.keyConcept}`} className="text-md text-slate-500 italic" />
                
                <div className="text-slate-700 space-y-2 pt-2">
                  {index === 0 ? (
                    <ul className="list-disc list-outside ml-5">
                      <li>Subject: {inputs.subject}</li>
                      <li>Grade: {inputs.grade} ({inputs.standard})</li>
                      <li>Teacher: [Your Name]</li>
                    </ul>
                  ) : (
                    processedContent.map((point, pointIndex) => {
                        const isTable = point.trim().startsWith('|');
                        if (isTable) {
                             return (
                                 <LatexRenderer 
                                    as="div" 
                                    key={pointIndex} 
                                    content={point} 
                                    enableMarkdown={true} 
                                    className="w-full my-4 overflow-x-auto"
                                 />
                            )
                        }
                        return (
                             <div key={pointIndex} className="flex items-start">
                                <span className="mr-2 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                                <LatexRenderer 
                                    as="div"
                                    content={point} 
                                    enableMarkdown={true} 
                                    className="flex-1"
                                 />
                             </div>
                        )
                    })
                  )}
                </div>
              </div>
              {slide.speakerNotes && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <h4 className="font-semibold text-sm text-slate-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    Speaker Notes
                  </h4>
                  <LatexRenderer content={slide.speakerNotes} className="text-sm text-slate-500 whitespace-pre-wrap mt-1 pl-6" enableMarkdown={true} />
                </div>
              )}
            </div>
          )})}

          {chartData && (
            <div className="flex flex-col bg-white p-6 rounded-lg shadow-md border border-slate-200 min-h-[400px]">
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
    </>
  );
};

export default Slides;
