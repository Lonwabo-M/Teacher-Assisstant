import React from 'react';
import type { LessonData } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';

interface HistorySidebarProps {
  history: LessonData[];
  onSelectLesson: (lesson: LessonData) => void;
  onClearHistory: () => void;
  activeLessonId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelectLesson, onClearHistory, activeLessonId, isOpen, onClose }) => {
  return (
    <aside className={`
      w-72 lg:w-80 flex-shrink-0 bg-white border-r border-slate-200
      transform transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      fixed inset-y-0 left-0 z-40 flex flex-col
    `}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
              <div className="h-6 w-6 mr-2 text-sky-600">
                  <HistoryIcon />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Lesson History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={onClearHistory}
                className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Clear lesson history"
                title="Clear History"
            >
                <div className="h-5 w-5"><TrashIcon /></div>
            </button>
             <button
                onClick={onClose}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                aria-label="Close sidebar"
            >
                <div className="h-5 w-5"><XIcon /></div>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Your generated lessons will appear here.</p>
        ) : (
          history.map(lesson => {
            // Use the title of the first slide as the lesson topic. Fallback if not available.
            const topic = lesson.slides?.[0]?.title || 'Untitled Lesson';

            return (
              <button
                key={lesson.id}
                onClick={() => onSelectLesson(lesson)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                  activeLessonId === lesson.id
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <p className="font-semibold truncate" title={topic}>{topic}</p>
                <p className="text-sm text-slate-500 truncate">{lesson.inputs.subject} &bull; {lesson.inputs.grade}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default HistorySidebar;