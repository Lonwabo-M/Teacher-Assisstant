
import React from 'react';
import Spinner from './Spinner';

const Loader: React.FC = () => {
  return (
    <div className="text-center p-12 bg-white rounded-2xl shadow-lg border border-slate-200">
      <div className="flex justify-center items-center mb-4">
        <Spinner size="lg" className="text-sky-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-700">Generating Your Lesson</h3>
      <p className="text-slate-500 mt-2">The AI is working its magic. This may take a moment...</p>
    </div>
  );
};

export default Loader;