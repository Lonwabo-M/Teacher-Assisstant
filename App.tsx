
import React, { useState, useCallback } from 'react';
import { generateLesson, generateQuestionPaper } from './services/geminiService';
import type { HistoryItem, UserInputs, QuestionPaperInputs, LessonData, QuestionPaperData } from './types';
// Fix: Import components from src directory to avoid empty/missing module errors in root components folder
import Header from './src/components/Header';
import InputForm from './src/components/InputForm';
import Loader from './src/components/Loader';
import ErrorMessage from './src/components/ErrorMessage';
import LessonOutput from './src/components/LessonOutput';
import HistorySidebar from './src/components/HistorySidebar';
import QuestionPaperForm from './src/components/QuestionPaperForm';
import QuestionPaperOutput from './src/components/QuestionPaperOutput';
import HomePage from './src/components/HomePage';

type AppMode = 'lesson' | 'paper';
type AppView = 'home' | 'app';

const defaultLessonInputs: UserInputs = {
  goals: '', 
  standard: 'CAPS', 
  grade: 'Grade 10', 
  subject: 'English Home Language', 
  generateDiagram: false, 
  includeChart: false,
};

const defaultPaperInputs: QuestionPaperInputs = {
  subject: 'Mathematics', 
  grade: 'Grade 12', 
  examType: 'Term Exam', 
  totalMarks: '100', 
  topics: '', 
  generateDiagram: false, 
  includeChart: false,
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [mode, setMode] = useState<AppMode>('lesson');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [currentLessonInputs, setCurrentLessonInputs] = useState<UserInputs>(defaultLessonInputs);
  const [currentPaperInputs, setCurrentPaperInputs] = useState<QuestionPaperInputs>(defaultPaperInputs);
  
  const handleGenerate = useCallback(async (inputs: UserInputs | QuestionPaperInputs, generationMode: AppMode) => {
    setIsLoading(true);
    setError(null);
    setActiveItem(null);
    try {
      const data = generationMode === 'lesson' 
        ? await generateLesson(inputs as UserInputs) 
        : await generateQuestionPaper(inputs as QuestionPaperInputs);
      
      // Fix: Use type assertion to HistoryItem to resolve union type mismatch during dynamic property assignment
      const newItem = {
        ...data,
        id: crypto.randomUUID(),
        inputs,
        type: generationMode,
      } as HistoryItem;
      
      setActiveItem(newItem);
      setHistory(prev => [newItem, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : 'A server error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectItem = (item: HistoryItem) => {
    setMode(item.type);
    setActiveItem(item);
    if (item.type === 'lesson') setCurrentLessonInputs(item.inputs as UserInputs);
    else setCurrentPaperInputs(item.inputs as QuestionPaperInputs);
    setIsSidebarOpen(false);
  };

  const handleActiveItemUpdate = useCallback((updated: HistoryItem) => {
    setActiveItem(updated);
    setHistory(prev => prev.map(item => item.id === updated.id ? updated : item));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {view === 'home' ? (
        <HomePage onStartCreating={() => setView('app')} />
      ) : (
        <>
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogoClick={() => setView('home')}/>
          <div className="flex">
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" />}
            <HistorySidebar
              history={history}
              onSelectItem={handleSelectItem}
              onClearHistory={() => {setHistory([]); setActiveItem(null);}}
              onCreateNew={() => {setActiveItem(null); setError(null); setIsSidebarOpen(false);}}
              activeItemId={activeItem?.id}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              showCreateNewButton={!!activeItem}
            />
            <main className="flex-grow p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                {!activeItem && !isLoading && (
                  <div className="mb-8 p-1.5 bg-slate-200 rounded-xl flex items-center max-w-md mx-auto">
                    {(['lesson', 'paper'] as AppMode[]).map(m => (
                      <button key={m} onClick={() => setMode(m)} className={`flex-1 text-center px-4 py-2 rounded-lg font-semibold transition-all ${mode === m ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-slate-600'}`}>
                        {m === 'lesson' ? 'Lesson Generator' : 'Exam Generator'}
                      </button>
                    ))}
                  </div>
                )}
                
                {isLoading ? <Loader /> : error ? <ErrorMessage message={error} /> : (
                  activeItem ? (
                    activeItem.type === 'lesson' 
                      ? <LessonOutput data={activeItem as LessonData} onUpdate={handleActiveItemUpdate} />
                      : <QuestionPaperOutput data={activeItem as QuestionPaperData} onUpdate={handleActiveItemUpdate} />
                  ) : (
                    mode === 'lesson' 
                      ? <InputForm inputs={currentLessonInputs} onInputChange={setCurrentLessonInputs} onGenerate={inputs => handleGenerate(inputs, 'lesson')} isLoading={false} />
                      : <QuestionPaperForm inputs={currentPaperInputs} onInputChange={setCurrentPaperInputs} onGenerate={inputs => handleGenerate(inputs, 'paper')} isLoading={false} />
                  )
                )}
              </div>
            </main>
          </div>
          <footer className="text-center p-4 text-slate-500 text-sm bg-slate-100 border-t border-slate-200">
            <p>&copy; 2024 LessonLab. Empowering Educators with AI.</p>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
