import React from 'react';
import type { HistoryItem } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onCreateNew: () => void;
  activeItemId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  showCreateNewButton: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelectItem, onClearHistory, onCreateNew, activeItemId, isOpen, onClose, showCreateNewButton }) => {
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
              <h2 className="text-xl font-bold text-slate-800">History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={onClearHistory}
                className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Clear history"
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
      
      {showCreateNewButton && (
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Your generated items will appear here.</p>
        ) : (
          history.map(item => {
            const isLesson = item.type === 'lesson';
            const topic = isLesson ? (item.slides?.[0]?.title || 'Untitled Lesson') : item.title;
            const details = `${item.inputs.subject} • ${item.inputs.grade}`;

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                  activeItemId === item.id
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold truncate pr-2" title={topic}>{topic}</p>
                   <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isLesson 
                        ? 'bg-teal-100 text-teal-800' 
                        : 'bg-indigo-100 text-indigo-800'
                   }`}>
                      {isLesson ? 'Lesson' : 'Paper'}
                    </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{details}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default HistorySidebar;