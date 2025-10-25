import React, { useState, useCallback } from 'react';
import { generateLesson, generateQuestionPaper } from './services/geminiService';
import type { HistoryItem, UserInputs, QuestionPaperInputs } from './types';
import Header from './components/Header';
import InputForm from './components/InputForm';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import LessonOutput from './components/LessonOutput';
import HistorySidebar from './components/HistorySidebar';
import QuestionPaperForm from './components/QuestionPaperForm';
import QuestionPaperOutput from './components/QuestionPaperOutput';

type AppMode = 'lesson' | 'paper';

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
  const [mode, setMode] = useState<AppMode>('lesson');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // State to hold the inputs for each form independently
  const [currentLessonInputs, setCurrentLessonInputs] = useState<UserInputs>(defaultLessonInputs);
  const [currentPaperInputs, setCurrentPaperInputs] = useState<QuestionPaperInputs>(defaultPaperInputs);
  
  const handleGenerate = useCallback(async (inputs: UserInputs | QuestionPaperInputs, generationMode: AppMode) => {
    setIsLoading(true);
    setError(null);
    setActiveItem(null);
    try {
      let data;
      if (generationMode === 'lesson') {
        data = await generateLesson(inputs as UserInputs);
      } else {
        data = await generateQuestionPaper(inputs as QuestionPaperInputs);
      }
      
      const newItem: HistoryItem = {
        ...data,
        id: Date.now().toString(),
        inputs
      };
      
      setActiveItem(newItem);
      setHistory(prevHistory => [newItem, ...prevHistory.slice(0, 19)]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectItem = (item: HistoryItem) => {
    setMode(item.type);
    setActiveItem(item);
    if (item.type === 'lesson') {
      setCurrentLessonInputs(item.inputs as UserInputs);
    } else {
      setCurrentPaperInputs(item.inputs as QuestionPaperInputs);
    }
    setIsSidebarOpen(false);
  }

  const handleClearHistory = () => {
    setHistory([]);
    setActiveItem(null);
    setCurrentLessonInputs(defaultLessonInputs);
    setCurrentPaperInputs(defaultPaperInputs);
  }

  const handleCreateNew = () => {
    setActiveItem(null);
    setError(null);
    // Do not reset inputs, let the user continue from where they were
    setIsSidebarOpen(false);
  };
  
  const renderActiveComponent = () => {
    if (!activeItem) {
      return (
        <>
          {mode === 'lesson' ? (
            <InputForm 
              inputs={currentLessonInputs}
              onInputChange={setCurrentLessonInputs}
              onGenerate={(inputs) => handleGenerate(inputs, 'lesson')} 
              isLoading={isLoading} 
            />
          ) : (
            <QuestionPaperForm
              inputs={currentPaperInputs}
              onInputChange={setCurrentPaperInputs}
              onGenerate={(inputs) => handleGenerate(inputs, 'paper')}
              isLoading={isLoading}
            />
          )}
          <div className="mt-12">
            {isLoading && <Loader />}
            {error && <ErrorMessage message={error} />}
          </div>
        </>
      );
    }

    if (activeItem.type === 'lesson') {
      return <LessonOutput data={activeItem} />;
    }
    if (activeItem.type === 'paper') {
      return <QuestionPaperOutput data={activeItem} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        {isSidebarOpen && (
           <div 
             onClick={() => setIsSidebarOpen(false)}
             className="fixed inset-0 bg-black/30 z-30 md:hidden"
             aria-hidden="true"
           ></div>
        )}
        <HistorySidebar
          history={history}
          onSelectItem={handleSelectItem}
          onClearHistory={handleClearHistory}
          onCreateNew={handleCreateNew}
          activeItemId={activeItem?.id}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          showCreateNewButton={!!activeItem}
        />
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Mode Toggle */}
            {!activeItem && !isLoading && (
              <div className="mb-8 p-1.5 bg-slate-200 rounded-xl flex items-center max-w-md mx-auto">
                <button
                  onClick={() => setMode('lesson')}
                  className={`flex-1 text-center px-4 py-2 rounded-lg transition-all duration-300 font-semibold ${mode === 'lesson' ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-slate-600'}`}
                >
                  Lesson Generator
                </button>
                <button
                  onClick={() => setMode('paper')}
                  className={`flex-1 text-center px-4 py-2 rounded-lg transition-all duration-300 font-semibold ${mode === 'paper' ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-slate-600'}`}
                >
                  Question Paper Generator
                </button>
              </div>
            )}
            
            {!activeItem && !isLoading && !error && (
              <p className="text-center text-slate-600 mb-8">
                {mode === 'lesson' 
                  ? "Simply provide your curriculum goals, select a standard, and let our AI craft a complete lesson package for you."
                  : "Design a custom, CAPS-aligned question paper with a full memorandum in minutes."}
              </p>
            )}

            {renderActiveComponent()}
          </div>
        </main>
      </div>
       <footer className="text-center p-4 text-slate-500 text-sm bg-slate-100 border-t border-slate-200">
        <p>&copy; 2024 Automated Lesson Generator. Empowering Educators with AI.</p>
      </footer>
    </div>
  );
};

export default App;