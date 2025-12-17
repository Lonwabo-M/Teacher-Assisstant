
import React, { useState, useRef } from 'react';
import type { QuestionPaperData, DiagramLabel, Coverup, Arrow, ProjectilePath, ExamQuestion } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import LatexRenderer from './LatexRenderer';
import Chart from './Chart';
import CalculationRenderer from './CalculationRenderer';
import DiagramEditor from './DiagramEditor';
import { downloadPdf } from '../utils/downloadUtils';
import { Spinner } from './Spinner';

interface QuestionPaperOutputProps {
  data: QuestionPaperData;
  onUpdate: (updatedData: QuestionPaperData) => void;
}

const getProjectilePathD = (path: ProjectilePath) => {
    const { x1, y1, x2, y2, peakY } = path;
    const h = (x1 + x2) / 2; // vertex x is midpoint
    const k = peakY;         // vertex y is peakY

    // control point for quadratic Bezier
    const cx = h;
    const cy = 2 * k - (y1 + y2) / 2;

    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

const PrintablePaper: React.FC<{ data: QuestionPaperData, isMemo: boolean, labels: DiagramLabel[], coverups: Coverup[], arrows: Arrow[], projectilePaths: ProjectilePath[] }> = ({ data, isMemo, labels, coverups, arrows, projectilePaths }) => {
  const { title, instructions, questions, generatedImage, chartData } = data;
  
  const sources = [];
  if (generatedImage) sources.push({ type: 'image', data: generatedImage });
  if (chartData) sources.push({ type: 'chart', data: chartData });
  
  const totalMarks = questions.reduce((sum, q) => sum + q.markAllocation, 0);

  // Find the index of the first question that references a source
  const referenceKeywords = ['diagram', 'source', 'chart', 'graph', 'figure'];
  let referenceIndex = -1;
  if (sources.length > 0 && !isMemo) {
      referenceIndex = questions.findIndex(q => 
          q.markAllocation > 0 && // Don't match on section headings
          referenceKeywords.some(keyword => 
              q.questionText.toLowerCase().includes(keyword)
          )
      );
  }

  const SourcesBlock = () => (
    <div className="my-8 p-6 border-2 border-slate-300 bg-slate-50 rounded-lg print-item" style={{ breakInside: 'avoid', breakAfter: 'page' }}>
      <h3 className="text-xl font-bold text-center text-slate-700 mb-4">SOURCE MATERIAL</h3>
      {sources.map((source, index) => (
        <div key={index} className="mb-6">
          <h4 className="font-semibold text-slate-700 mb-4 text-lg">SOURCE {String.fromCharCode(65 + index)}</h4>
          {source.type === 'image' && (
            <div className="flex justify-center">
              <div className="relative inline-block">
                  <img src={`data:${source.data.mimeType};base64,${source.data.data}`} alt={`Source ${String.fromCharCode(65 + index)}`} className="max-w-full h-auto block rounded-md border" />
                   <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                          <marker id="printable-arrowhead-paper" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0ea5e9" />
                          </marker>
                      </defs>
                      {(projectilePaths || []).map(path => (
                          <path key={path.id} d={getProjectilePathD(path)} stroke="#f59e0b" strokeWidth="1" fill="none" strokeDasharray="2,2" />
                      ))}
                      {(arrows || []).map(arrow => (
                          <line key={arrow.id} x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke="#0ea5e9" strokeWidth="1" markerEnd="url(#printable-arrowhead-paper)" />
                      ))}
                  </svg>
                  {coverups?.map((cover) => (
                      <div key={cover.id} className={`absolute ${cover.isApplied ? 'bg-white' : ''}`} style={{
                          left: `${cover.x}%`,
                          top: `${cover.y}%`,
                          width: `${cover.width}%`,
                          height: `${cover.height}%`,
                      }} />
                  ))}
                  {labels?.map((label, i) => (
                      <div key={i} className="absolute" style={{ 
                          left: `${label.x}%`, 
                          top: `${label.y}%`, 
                          transform: `translate(-50%, -50%) ${label.rotate ? `rotate(${label.rotate}deg)` : ''}`,
                          fontSize: `${(label.size || 100) / 100 * 12}pt`,
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
          )}
          {source.type === 'chart' && <div className="h-96"><Chart chartData={source.data} showControls={false} /></div>}
        </div>
      ))}
    </div>
  );

  const QuestionsBlock = ({ questionList }: { questionList: ExamQuestion[] }) => (
    <div className="space-y-2">
      {questionList.map(q => {
         const originalIndex = questions.findIndex(origQ => origQ === q);
         const isHeading = q.markAllocation === 0 && /^(QUESTION\s*)?\d+$/.test(q.questionNumber.trim().toUpperCase());

         if (isHeading) {
           let sectionMarks = 0;
           for (let i = originalIndex + 1; i < questions.length; i++) {
              const nextQ = questions[i];
              if (nextQ.markAllocation === 0 && /^(QUESTION\s*)?\d+$/.test(nextQ.questionNumber.trim().toUpperCase())) {
                  break;
              }
              sectionMarks += nextQ.markAllocation;
           }

           let headingNumber = q.questionNumber.trim();
           if (!headingNumber.toUpperCase().startsWith('QUESTION')) {
               headingNumber = `QUESTION ${headingNumber}`;
           }

           return (
              <div key={originalIndex} className="pt-8 print-item" style={{ breakInside: 'avoid-page' }}>
                  <h3 className="text-lg font-bold text-slate-800 border-t-2 border-slate-400 pt-4 flex justify-between">
                      <LatexRenderer as="span" content={headingNumber.toUpperCase()} />
                      {sectionMarks > 0 && <span>[{sectionMarks}]</span>}
                  </h3>
                  {q.questionText && (
                      <div className="mt-2 text-slate-700">
                          <LatexRenderer content={q.questionText} />
                      </div>
                  )}
              </div>
           );
         }
         
         if (q.markAllocation > 0) {
           return (
            <div key={originalIndex} className="flex items-start py-1 print-item" style={{ breakInside: 'avoid' }}>
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
         return null;
      })}
    </div>
  );

  return (
    <div className="p-10 bg-white font-serif text-black" style={{ width: '800px', fontSize: '12pt', lineHeight: 1.5 }}>
      <h1 className="text-center mb-2 font-bold print-item" style={{ fontSize: '20pt' }}>{title}</h1>
      {isMemo && <h2 className="text-center mb-8 font-bold text-red-700 print-item" style={{ fontSize: '16pt' }}>MEMORANDUM</h2>}
      
      {!isMemo ? (
        <>
          <div className="flex justify-between items-center my-6 pb-4 border-b-2 border-slate-300 print-item">
            <span className="font-semibold">Subject: {data.inputs.subject}</span>
            <span className="font-semibold">Grade: {data.inputs.grade}</span>
            <span className="font-semibold">Total Marks: {totalMarks}</span>
          </div>
          <div className="mb-8 print-item">
            <h3 className="font-bold text-lg mb-2">INSTRUCTIONS AND INFORMATION</h3>
            <ol className="list-decimal list-inside space-y-1">
              {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
              <li>Answer ALL the questions.</li>
            </ol>
          </div>

          {referenceIndex === -1 ? (
              <>
                  {sources.length > 0 && <SourcesBlock />}
                  <QuestionsBlock questionList={questions} />
              </>
          ) : (
              <>
                  <QuestionsBlock questionList={questions.slice(0, referenceIndex)} />
                  <SourcesBlock />
                  <QuestionsBlock questionList={questions.slice(referenceIndex)} />
              </>
          )}
        </>
      ) : (
         <div className="space-y-4 mt-12">
           <h2 className="text-center font-bold text-xl border-y-2 py-2 border-slate-400 print-item">MEMORANDUM</h2>
           {questions.filter(q => q.markAllocation > 0).map((q, index) => (
              <div key={`memo-${index}`} className="flex items-start py-2 border-b border-slate-200 print-item" style={{ breakInside: 'avoid' }}>
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

const QuestionPaperOutput: React.FC<QuestionPaperOutputProps> = ({ data, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'memo'>('paper');
  const [isDownloading, setIsDownloading] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);
  
  const labels = data.diagramLabels || [];
  const coverups = data.coverups || [];
  const arrows = data.arrows || [];
  const projectilePaths = data.projectilePaths || [];

  const handleLabelsChange = (newLabels: DiagramLabel[]) => {
    onUpdate({ ...data, diagramLabels: newLabels });
  };
  
  const handleCoverupsChange = (newCoverups: Coverup[]) => {
    onUpdate({ ...data, coverups: newCoverups });
  };

  const handleArrowsChange = (newArrows: Arrow[]) => {
    onUpdate({ ...data, arrows: newArrows });
  };

  const handleProjectilePathsChange = (newPaths: ProjectilePath[]) => {
    onUpdate({ ...data, projectilePaths: newPaths });
  };

  const handleImageUpdate = (newImage: { data: string; mimeType: string }) => {
    onUpdate({ 
        ...data, 
        generatedImage: newImage,
    });
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsDownloading(true);

    try {
        await downloadPdf({
            filename: `${data.title.replace(/\s+/g, '_')}_${activeTab}.pdf`,
            element: printableRef.current,
            orientation: 'p',
            margin: 40
        });
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
          {activeTab === 'paper' ? <PrintablePaper data={data} isMemo={false} labels={labels} coverups={coverups} arrows={arrows} projectilePaths={projectilePaths} /> : <PrintablePaper data={data} isMemo={true} labels={labels} coverups={coverups} arrows={arrows} projectilePaths={projectilePaths} />}
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
                    <Spinner className="h-full w-full" />
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
            <div className="space-y-8">
                {activeTab === 'paper' && data.generatedImage && (
                    <DiagramEditor
                        imageData={data.generatedImage.data}
                        mimeType={data.generatedImage.mimeType}
                        labels={labels}
                        onLabelsChange={handleLabelsChange}
                        coverups={coverups}
                        onCoverupsChange={handleCoverupsChange}
                        arrows={arrows}
                        onArrowsChange={handleArrowsChange}
                        projectilePaths={projectilePaths}
                        onProjectilePathsChange={handleProjectilePathsChange}
                        onImageUpdate={handleImageUpdate}
                    />
                )}
                <PrintablePaper data={data} isMemo={activeTab === 'memo'} labels={labels} coverups={coverups} arrows={arrows} projectilePaths={projectilePaths} />
            </div>
        </div>
      </div>
    </>
  );
};

export default QuestionPaperOutput;
