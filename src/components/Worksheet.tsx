import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Worksheet, WorksheetQuestion, ChartData, WorksheetSection } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import Chart from './Chart';
import LatexRenderer from './LatexRenderer';
import CalculationRenderer from './CalculationRenderer';

interface WorksheetProps {
  worksheet: Worksheet;
  chartData?: ChartData;
}

const Question: React.FC<{ question: WorksheetQuestion; index: number }> = ({ question, index }) => {
  return (
    <div className="py-4">
      <LatexRenderer
        as="div"
        content={`${index + 1}. ${question.question}`}
        className="font-semibold text-slate-700 mb-2"
      />
      {question.type === 'multiple-choice' && question.options && (
        <ol className="space-y-1 pl-6">
          {question.options.map((option, i) => (
            <li key={i} className="flex items-start">
              <span className="mr-2 text-slate-500">{String.fromCharCode(97 + i)}.</span>
              <LatexRenderer as="span" content={option} className="text-slate-600" />
            </li>
          ))}
        </ol>
      )}
       {question.type === 'matching' && question.options && (
        <div className="pl-6 mt-2">
          {question.options.map((option, i) => (
             <LatexRenderer key={i} as="div" content={option} className="text-slate-600" />
          ))}
        </div>
      )}
      {(question.type === 'short-answer' || question.type === 'fill-in-the-blank' || question.type === 'source-based' || question.type === 'essay') && (
         <div className="mt-4 space-y-4">
            <div className="text-slate-400 tracking-wider">_______________________________________________________________________________</div>
            <div className="text-slate-400 tracking-wider">_______________________________________________________________________________</div>
            <div className="text-slate-400 tracking-wider">_______________________________________________________________________________</div>
         </div>
      )}
    </div>
  );
};

const PrintableWorksheet: React.FC<{
  worksheet: Worksheet;
  chartData?: ChartData;
}> = ({ worksheet, chartData }) => {
  
  const sectionsWithSourceQuestions = new Set(
    (worksheet.sections || []).filter(sec => sec.questions.some(q => q.type === 'source-based')).map(sec => sec.title)
  );

  const generalSections = (worksheet.sections || []).filter(sec => !sectionsWithSourceQuestions.has(sec.title));
  const sourceSections = (worksheet.sections || []).filter(sec => sectionsWithSourceQuestions.has(sec.title));
  
  let questionCounter = 0;
  
  const sources = [];
  if (worksheet.generatedImage) {
      sources.push({ type: 'image', data: worksheet.generatedImage });
  }
  if (chartData) {
      sources.push({ type: 'chart', data: chartData });
  }
  if (worksheet.source) {
      sources.push({ type: 'text', data: worksheet.source });
  }

  return (
    <div 
        className="p-10 bg-white font-serif text-black" 
        style={{ width: '800px', fontSize: '12pt', lineHeight: 1.6 }}
    >
      <div id="printable-worksheet-part-1">
        <h1 className="text-center mb-8 font-bold" style={{ fontSize: '24pt' }}>{worksheet.title}</h1>
        <div className="flex justify-between mb-8 pb-4 border-b-2 border-slate-200">
            <span className="font-bold">Name: ___________________________</span>
            <span className="font-bold">Date: _________________</span>
        </div>
        
        <div className="mb-8">
            <h3 className="font-semibold text-lg mb-2 text-slate-800">Instructions</h3>
            <LatexRenderer as="p" content={worksheet.instructions} className="text-slate-800" />
        </div>

        <div className="space-y-8">
            {generalSections.map((section) => (
                <section key={section.title} className="border-b-2 border-slate-200 pb-4 last:border-b-0">
                    <h3 className="font-semibold text-sky-800 mb-3" style={{ fontSize: '16pt' }}>{section.title}</h3>
                    {section.content && <LatexRenderer content={section.content} className="mb-4 italic text-slate-600"/>}
                    <div className="divide-y divide-slate-200">
                        {(section.questions || []).map((q, qIndex) => {
                            const currentQuestionIndex = questionCounter++;
                            return (<div key={`${section.title}-${qIndex}`} style={{ breakInside: 'avoid' }}>
                                <Question question={q} index={currentQuestionIndex} />
                            </div>);
                        })}
                    </div>
                </section>
            ))}
        </div>
      </div>

      {(sources.length > 0) && (
          <div id="printable-worksheet-part-2">
            <div className="my-8 border-2 border-slate-300 bg-slate-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-slate-700 mb-4" style={{ fontSize: '18pt' }}>Source Material</h3>
              {sources.map((source, index) => {
                const label = `Source ${String.fromCharCode(65 + index)}`; // A, B, C...
                if (source.type === 'image') {
                  return (
                    <div key={index} className="mb-6">
                      <h4 className="font-semibold text-slate-700 mb-4 text-lg">{label}: Diagram</h4>
                       <div className="flex justify-center">
                          <div className="relative inline-block">
                            <img
                              src={`data:${source.data.mimeType};base64,${source.data.data}`}
                              alt="Source material"
                              className="max-w-full h-auto block rounded-md border border-slate-200"
                            />
                            {worksheet.diagramLabels?.map((label, i) => (
                                <div key={i} className="absolute" style={{
                                    left: `${label.x}%`,
                                    top: `${label.y}%`,
                                    transform: `translate(-50%, -50%) ${label.rotate ? `rotate(${label.rotate}deg)` : ''}`,
                                    fontSize: '11pt',
                                    color: 'black',
                                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                    padding: '0 2px',
                                    borderRadius: '2px',
                                }}>
                                    <LatexRenderer as="span" content={label.text} />
                                </div>
                            ))}
                          </div>
                        </div>
                    </div>
                  );
                }
                if (source.type === 'chart') {
                  return (
                    <div key={index} className="mb-6">
                      <h4 className="font-semibold text-slate-700 mb-4 text-lg">{label}: Chart</h4>
                      <div className="h-96">
                        <Chart chartData={source.data} showControls={false} />
                      </div>
                    </div>
                  );
                }
                if (source.type === 'text') {
                  return (
                    <div key={index}>
                      <LatexRenderer as="h5" content={source.data.title} className="font-semibold text-sky-800 mb-4 italic" />
                      <LatexRenderer content={source.data.content} className="text-slate-700 whitespace-pre-wrap" />
                    </div>
                  );
                }
                return null;
              })}
            </div>
              <div className="space-y-8">
                {sourceSections.map((section) => (
                    <section key={section.title} className="border-b-2 border-slate-200 pb-4 last:border-b-0">
                        <h3 className="font-semibold text-sky-800 mb-3" style={{ fontSize: '16pt' }}>{section.title}</h3>
                        {section.content && <LatexRenderer content={section.content} className="mb-4 italic text-slate-600"/>}
                        <div className="divide-y divide-slate-200">
                            {(section.questions || []).map((q, qIndex) => {
                                const currentQuestionIndex = questionCounter++;
                                return (<div key={`${section.title}-${qIndex}`} style={{ breakInside: 'avoid' }}>
                                    <Question question={q} index={currentQuestionIndex} />
                                </div>);
                            })}
                        </div>
                    </section>
                ))}
              </div>
          </div>
      )}
    </div>
  )
}

const PrintableMemo: React.FC<{ 
  worksheet: Worksheet
}> = ({ worksheet }) => {
  let questionCounter = 0;
  return (
    <div 
      className="p-10 bg-white font-serif text-black" 
      style={{ width: '800px', fontSize: '12pt' }}
    >
      <div id="printable-memo-part-1">
        <h1 className="text-center mb-10 font-bold" style={{ fontSize: '24pt' }}>
          {worksheet.title} - Answer Memo
        </h1>
        
        <div className="space-y-8">
          {(worksheet.sections || []).map((section, sectionIndex) => (
            <section key={`memo-${section.title}`} className="border-b-2 border-slate-200 pb-4 last:border-b-0">
              <h3 className="font-semibold text-sky-800 mb-3" style={{ fontSize: '16pt' }}>
                {section.title}
              </h3>
              <div className="divide-y divide-slate-200">
                {(section.questions || []).map((q, qIndex) => (
                  <div key={`memo-q-${sectionIndex}-${qIndex}`} className="py-3 flex items-start" style={{ breakInside: 'avoid' }}>
                    <div className="font-semibold text-slate-700 mr-2">{++questionCounter}.</div>
                    <div className="flex-1">
                      {q.type === 'matching' ? (
                          <LatexRenderer as="span" content={q.answer || ''} className="text-slate-800" />
                      ) : (
                        <CalculationRenderer content={q.answer || ''} className="text-slate-800" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};


const Worksheet: React.FC<WorksheetProps> = ({ worksheet, chartData }) => {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDownload = async (type: 'worksheet' | 'memo') => {
    setIsDownloading(type);

    const containerId = type === 'worksheet' ? 'worksheet-pdf-generator' : 'memo-pdf-generator';
    // Use a ref instead of ID to avoid potential conflicts
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID ${containerId} not found.`);
      setIsDownloading(null);
      return;
    }
    
    // Temporarily make the container visible for rendering, but off-screen
    const originalStyle = container.style.cssText;
    container.style.cssText = 'position: absolute; top: -9999px; left: -9999px; z-index: -10; display: block;';

    try {
        const pdf = new jsPDF('p', 'px', 'a4');
        const filename = `${worksheet.title.replace(/\s+/g, '_')}-${type}.pdf`;
        
        const part1_id = `printable-${type}-part-1`;
        const part2_id = `printable-${type}-part-2`;

        const part1El = container.querySelector<HTMLElement>(`#${part1_id}`);
        const part2El = container.querySelector<HTMLElement>(`#${part2_id}`);

        if (!part1El) {
            throw new Error(`PDF generation failed: content element #${part1_id} not found.`);
        }

        const addCanvasToPdf = async (element: HTMLElement, pdfInstance: jsPDF) => {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);

            const margin = 40;
            const pdfWidth = pdfInstance.internal.pageSize.getWidth();
            const pdfHeight = pdfInstance.internal.pageSize.getHeight();
            const contentWidth = pdfWidth - margin * 2;
            const pageContentHeight = pdfHeight - margin * 2;
            
            const imgProps = pdfInstance.getImageProperties(imgData);
            const totalImageHeight = (imgProps.height * contentWidth) / imgProps.width;

            let heightLeft = totalImageHeight;
            let position = 0;

            pdfInstance.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalImageHeight);
            heightLeft -= pageContentHeight;

            while (heightLeft > 0) {
                position -= pageContentHeight;
                pdfInstance.addPage();
                pdfInstance.addImage(imgData, 'JPEG', margin, position + margin, contentWidth, totalImageHeight);
                heightLeft -= pageContentHeight;
            }
        };

        await addCanvasToPdf(part1El, pdf);

        if (part2El) {
            pdf.addPage();
            await addCanvasToPdf(part2El, pdf);
        }
        
        pdf.save(filename);

    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        // Restore original styles
        container.style.cssText = originalStyle;
        setIsDownloading(null);
    }
  };

  let questionCounter = 0;
  
  const sources = [];
  if (worksheet.generatedImage) {
      sources.push({ type: 'image', data: worksheet.generatedImage });
  }
  if (chartData) {
      sources.push({ type: 'chart', data: chartData });
  }
  if (worksheet.source) {
      sources.push({ type: 'text', data: worksheet.source });
  }

  return (
    <>
      <div id="worksheet-pdf-generator" style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -10, display: 'none' }}>
          <PrintableWorksheet worksheet={worksheet} chartData={chartData} />
      </div>
      <div id="memo-pdf-generator" style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -10, display: 'none' }}>
          <PrintableMemo worksheet={worksheet} />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-sky-200 pb-2">
          <LatexRenderer as="h2" content={worksheet.title} className="text-3xl font-bold text-slate-800" />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownload('worksheet')}
              disabled={!!isDownloading}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download worksheet as PDF"
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
              onClick={() => handleDownload('memo')}
              disabled={!!isDownloading}
              className="inline-flex items-center px-4 py-2 bg-sky-100 text-sky-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download answer memo as PDF"
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
        
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
            <h3 className="text-xl font-semibold text-sky-700">Instructions</h3>
            <LatexRenderer as="p" content={worksheet.instructions} className="text-slate-600" />
        </div>

        {sources.length > 0 && (
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
            <h3 className="text-xl font-semibold text-sky-700">Source Material</h3>
            {sources.map((source, index) => {
              const label = `Source ${String.fromCharCode(65 + index)}`;
              if (source.type === 'image') {
                return (
                  <div key={index}>
                    <h4 className="font-semibold text-slate-600 mb-2">{label}: Diagram</h4>
                    <div className="flex justify-center p-4 bg-white rounded-md border">
                        <div className="relative inline-block">
                            <img
                                src={`data:${source.data.mimeType};base64,${source.data.data}`}
                                alt="AI generated diagram"
                                className="max-w-full h-auto block"
                            />
                            {worksheet.diagramLabels?.map((label, i) => (
                                <div key={i} className="absolute" style={{
                                    left: `${label.x}%`,
                                    top: `${label.y}%`,
                                    transform: `translate(-50%, -50%) ${label.rotate ? `rotate(${label.rotate}deg)` : ''}`,
                                    textShadow: '0px 0px 3px white, 0px 0px 3px white, 0px 0px 3px white'
                                }}>
                                    <LatexRenderer as="span" content={label.text} />
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                );
              }
              if (source.type === 'chart' && source.data) {
                return (
                  <div key={index}>
                    <h4 className="font-semibold text-slate-600 mb-2">{label}: Chart</h4>
                    <div className="h-96"><Chart chartData={source.data} showControls={false} /></div>
                  </div>
                );
              }
              if (source.type === 'text' && source.data) {
                 return (
                  <div key={index}>
                    <LatexRenderer as="h4" content={source.data.title} className="font-semibold text-slate-600 mb-2" />
                    <LatexRenderer content={source.data.content} className="text-slate-500 whitespace-pre-wrap italic" />
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        <div className="space-y-8">
          {(worksheet.sections || []).map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-xl font-semibold text-sky-700 mb-2">{section.title}</h3>
               {section.content && <LatexRenderer content={section.content} className="mb-4 italic text-slate-600"/>}
              <div className="divide-y divide-slate-200">
                {(section.questions || []).map((q, qIndex) => {
                    const currentQuestionIndex = questionCounter++;
                    return <Question key={qIndex} question={q} index={currentQuestionIndex} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Worksheet;