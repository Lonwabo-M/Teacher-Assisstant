import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { QuestionPaperData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import LatexRenderer from './LatexRenderer';
import Chart from './Chart';
import CalculationRenderer from './CalculationRenderer';

interface QuestionPaperOutputProps {
  data: QuestionPaperData;
}

const PrintablePaper: React.FC<{ data: QuestionPaperData, isMemo: boolean }> = ({ data, isMemo }) => {
  const { title, instructions, questions, generatedImage, chartData, diagramLabels } = data;
  
  const sources = [];
  if (generatedImage) sources.push({ type: 'image', data: generatedImage, labels: diagramLabels });
  if (chartData) sources.push({ type: 'chart', data: chartData });
  
  const totalMarks = questions.reduce((sum, q) => sum + q.markAllocation, 0);

  return (
    <div className="p-10 bg-white font-serif text-black" style={{ width: '800px', fontSize: '12pt', lineHeight: 1.5 }}>
      <h1 className="text-center mb-2 font-bold" style={{ fontSize: '20pt' }}>{title}</h1>
      {isMemo && <h2 className="text-center mb-8 font-bold text-red-700" style={{ fontSize: '16pt' }}>MEMORANDUM</h2>}
      
      {!isMemo && (
        <>
          <div className="flex justify-between items-center my-6 pb-4 border-b-2 border-slate-300">
            <span className="font-semibold">Subject: {data.inputs.subject}</span>
            <span className="font-semibold">Grade: {data.inputs.grade}</span>
            <span className="font-semibold">Total Marks: {totalMarks}</span>
          </div>
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-2">INSTRUCTIONS AND INFORMATION</h3>
            <ol className="list-decimal list-inside space-y-1">
              {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
              <li>Answer ALL the questions.</li>
            </ol>
          </div>
        </>
      )}

      {sources.length > 0 && !isMemo && (
        <div className="my-8 p-6 border-2 border-slate-300 bg-slate-50 rounded-lg" style={{ breakAfter: 'page' }}>
           <h3 className="text-xl font-bold text-center text-slate-700 mb-4">SOURCE MATERIAL</h3>
           {sources.map((source, index) => (
             <div key={index} className="mb-6">
                <h4 className="font-semibold text-slate-700 mb-4 text-lg">SOURCE {String.fromCharCode(65 + index)}</h4>
                {source.type === 'image' && (
                  <div className="flex justify-center">
                    <div className="relative inline-block">
                        <img src={`data:${source.data.mimeType};base64,${source.data.data}`} alt={`Source ${String.fromCharCode(65 + index)}`} className="max-w-full h-auto block rounded-md border" />
                        {source.labels?.map((label, i) => (
                            <div key={i} className="absolute" style={{ left: `${label.x}%`, top: `${label.y}%`, transform: `translate(-50%, -50%) ${label.rotate ? `rotate(${label.rotate}deg)` : ''}`}}>
                                <LatexRenderer as="span" content={label.text} />
                            </div>
                        ))}
                    </div>
                  </div>
                )}
                {source.type === 'chart' && <div className="h-96"><Chart chartData={source.data} showControls={false} /></div>}
             </div>
           ))}
        </div>
      )}
      
      <div className="space-y-2">
        {questions.map((q, index) => {
           // A heading is a question with 0 marks AND a question number that is a single integer (e.g., "1", "2").
           // This prevents question stems like "1.3" from being treated as headings.
           const isHeading = q.markAllocation === 0 && /^\d+$/.test(q.questionNumber.trim());

           if (isHeading && !isMemo) {
             let sectionMarks = 0;
             // Calculate total marks for this section by summing until the next heading is found.
             for (let i = index + 1; i < questions.length; i++) {
                const nextQ = questions[i];
                if (nextQ.markAllocation === 0 && /^\d+$/.test(nextQ.questionNumber.trim())) {
                    break; // Stop at the next main question heading
                }
                sectionMarks += nextQ.markAllocation;
             }

             return (
                <div key={index} className="pt-8" style={{ breakInside: 'avoid-page' }}>
                    <h3 className="text-lg font-bold text-slate-800 border-t-2 border-slate-400 pt-4 flex justify-between">
                        <LatexRenderer as="span" content={`QUESTION ${q.questionNumber}${q.questionText ? ` - ${q.questionText}` : ''}`} />
                        {sectionMarks > 0 && <span>[{sectionMarks}]</span>}
                    </h3>
                </div>
             );
           }
           
           if (!isHeading && !isMemo) {
             return (
              <div key={index} className="flex items-start py-1" style={{ breakInside: 'avoid' }}>
                <div className="w-24 flex-shrink-0 font-semibold pr-2 text-right">
                  {q.questionNumber}
                </div>
                <div className="flex-grow">
                  <LatexRenderer content={q.questionText} />
                </div>
                <div className="w-12 flex-shrink-0 text-right font-semibold">
                  ({q.markAllocation})
                </div>
              </div>
             );
           }
           return null; // Render nothing for headings in memo view or other cases
        })}
      </div>

      {isMemo && (
         <div className="space-y-4 mt-12">
           <h2 className="text-center font-bold text-xl border-y-2 py-2 border-slate-400">MEMORANDUM</h2>
           {questions.filter(q => q.markAllocation > 0).map((q, index) => (
              <div key={`memo-${index}`} className="flex items-start py-2 border-b border-slate-200" style={{ breakInside: 'avoid' }}>
                <div className="w-24 flex-shrink-0 font-semibold pr-2 text-right">{q.questionNumber}</div>
                <div className="flex-grow">
                  <CalculationRenderer content={q.answer} />
                </div>
                 <div className="w-12 flex-shrink-0 text-right font-semibold text-blue-600">
                    ({q.markAllocation})
                </div>
              </div>
           ))}
         </div>
      )}

    </div>
  );
};

const QuestionPaperOutput: React.FC<QuestionPaperOutputProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'memo'>('paper');
  const [isDownloading, setIsDownloading] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsDownloading(true);

    // Temporarily render the active tab's printable version
    const container = printableRef.current;
    
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40; // 40px margin
        
        const imgProps = pdf.getImageProperties(imgData);
        const contentWidth = pdfWidth - margin * 2;
        const totalImageHeight = (imgProps.height * contentWidth) / imgProps.width;
        
        let heightLeft = totalImageHeight;
        let position = 0;
        const pageContentHeight = pdfHeight - margin * 2;

        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalImageHeight);
        heightLeft -= pageContentHeight;

        while (heightLeft > 0) {
            position -= pageContentHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position + margin, contentWidth, totalImageHeight);
            heightLeft -= pageContentHeight;
        }

        pdf.save(`${data.title.replace(/\s+/g, '_')}_${activeTab}.pdf`);
    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };
  
  const totalMarks = data.questions.reduce((sum, q) => sum + q.markAllocation, 0);

  return (
    <>
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={printableRef}>
          {activeTab === 'paper' ? <PrintablePaper data={data} isMemo={false} /> : <PrintablePaper data={data} isMemo={true} />}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">{data.title}</h2>
                <p className="text-slate-500">{data.inputs.subject} • {data.inputs.grade} • {totalMarks} Marks</p>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span>{isDownloading ? 'Generating...' : `Download ${activeTab === 'paper' ? 'Paper' : 'Memo'} (PDF)`}</span>
            </button>
        </div>
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button onClick={() => setActiveTab('paper')} className={`flex-1 text-center py-4 px-6 font-medium ${activeTab === 'paper' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500'}`}>
              Question Paper
            </button>
            <button onClick={() => setActiveTab('memo')} className={`flex-1 text-center py-4 px-6 font-medium ${activeTab === 'memo' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500'}`}>
              Memorandum
            </button>
          </nav>
        </div>
        <div className="p-6 md:p-8">
            {activeTab === 'paper' ? <PrintablePaper data={data} isMemo={false} /> : <PrintablePaper data={data} isMemo={true} />}
        </div>
      </div>
    </>
  );
};

export default QuestionPaperOutput;