import React, { useState } from 'react';
import type { LessonData } from '../types';
import LessonPlan from './LessonPlan';
import Slides from './Slides';
import Worksheet from './Worksheet';
import Chart from './Chart';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PresentationIcon } from './icons/PresentationIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface LessonOutputProps {
  data: LessonData;
}

type Tab = 'plan' | 'slides' | 'worksheet' | 'chart';

const LessonOutput: React.FC<LessonOutputProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<Tab>('plan');

  // FIX: Changed JSX.Element to React.ReactElement to resolve namespace error.
  const tabs: {id: Tab, label: string, icon: React.ReactElement}[] = [
    { id: 'plan', label: 'Lesson Plan', icon: <BookOpenIcon /> },
    { id: 'slides', label: 'Slides', icon: <PresentationIcon /> },
    { id: 'worksheet', label: 'Worksheet', icon: <ClipboardListIcon /> },
  ];

  if (data.chartData) {
    tabs.push({ id: 'chart', label: 'Chart', icon: <ChartBarIcon /> });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'plan':
        const lessonTitle = data.slides?.[0]?.title || 'Untitled Lesson';
        return <LessonPlan plan={data.lessonPlan} title={lessonTitle} />;
      case 'slides':
        return <Slides slides={data.slides} inputs={data.inputs} chartData={data.chartData} />;
      case 'worksheet':
        return <Worksheet worksheet={data.worksheet} chartData={data.chartData} />;
      case 'chart':
        return data.chartData ? <Chart chartData={data.chartData} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200">
        <nav className="flex" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 md:flex-none group inline-flex items-center justify-center py-4 px-6 text-sm font-medium border-b-2
                ${activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 transition-colors duration-200
              `}
            >
              <div className="mr-2 h-5 w-5">{tab.icon}</div>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6 md:p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default LessonOutput;