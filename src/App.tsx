import React, { useState, useCallback } from 'react';
import { generateLesson } from './services/geminiService';
import type { LessonData, UserInputs } from './types';
import Header from './components/Header';
import InputForm from './components/InputForm';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import LessonOutput from './components/LessonOutput';
import HistorySidebar from './components/HistorySidebar';

const defaultInputs: UserInputs = {
  goals: '',
  standard: 'CAPS',
  grade: 'Grade 10',
  subject: 'English Home Language',
  sourceBased: false,
  includeChart: false,
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  // Use in-memory state instead of localStorage
  const [lessonHistory, setLessonHistory] = useState<LessonData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [currentInputs, setCurrentInputs] = useState<UserInputs>(defaultInputs);

  const handleGenerateLesson = useCallback(async (inputs: UserInputs) => {
    setIsLoading(true);
    setError(null);
    setLessonData(null);
    try {
      const data = await generateLesson(inputs);
      const newLesson: LessonData = {
        ...data,
        id: Date.now().toString(),
        inputs
      };
      setLessonData(newLesson);
      
      // Store in memory only, keep last 10 lessons
      setLessonHistory(prevHistory => [newLesson, ...prevHistory.slice(0, 9)]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectLesson = (lesson: LessonData) => {
    setLessonData(lesson);
    setCurrentInputs(lesson.inputs); // Update the form with the selected lesson's inputs
    setIsSidebarOpen(false); // Close sidebar on selection in mobile
  }

  const handleClearHistory = () => {
    setLessonHistory([]);
    setLessonData(null);
    setCurrentInputs(defaultInputs); // Reset the form to its default state
  }

  const handleCreateNew = () => {
    setLessonData(null);
    setError(null);
    setCurrentInputs(defaultInputs);
    setIsSidebarOpen(false);
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
          history={lessonHistory}
          onSelectLesson={handleSelectLesson}
          onClearHistory={handleClearHistory}
          onCreateNew={handleCreateNew}
          activeLessonId={lessonData?.id}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          showCreateNewButton={!!lessonData}
        />
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {!lessonData ? (
              <>
                {!isLoading && !error && (
                  <p className="text-center text-slate-600 mb-8">
                    Simply provide your curriculum goals, select a standard, and let our AI craft a complete, high-quality lesson package for you in moments.
                  </p>
                )}
                <InputForm 
                  inputs={currentInputs}
                  onInputChange={setCurrentInputs}
                  onGenerate={handleGenerateLesson} 
                  isLoading={isLoading} 
                />
                <div className="mt-12">
                  {isLoading && <Loader />}
                  {error && <ErrorMessage message={error} />}
                </div>
              </>
            ) : (
              <LessonOutput data={lessonData} />
            )}
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