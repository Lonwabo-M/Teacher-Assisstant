import React from 'react';
import type { QuestionPaperInputs } from '../types';

interface QuestionPaperFormProps {
  inputs: QuestionPaperInputs;
  onInputChange: (newInputs: QuestionPaperInputs) => void;
  onGenerate: (inputs: QuestionPaperInputs) => void;
  isLoading: boolean;
}

const subjects = [
  'Accounting', 'Afrikaans First Additional Language', 'Business Studies', 'Computer Applications Technology', 'Consumer Studies', 'Dramatic Arts', 'Economics', 'Engineering Graphics and Design', 'English Home Language', 'Geography', 'History', 'Information Technology', 'Life Orientation', 'Life Sciences', 'Mathematics', 'Mathematical Literacy', 'Music', 'Physical Sciences', 'Visual Arts'
];
const grades = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const examTypes = ['Class Test', 'Term Exam', 'Final Exam'];

const QuestionPaperForm: React.FC<QuestionPaperFormProps> = ({ inputs, onInputChange, onGenerate, isLoading }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        onInputChange({ ...inputs, [name]: checked });
    } else {
        onInputChange({ ...inputs, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputs.topics && inputs.totalMarks) {
      onGenerate(inputs);
    } else {
      alert("Please fill in all required fields.");
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="topics" className="block text-lg font-semibold text-slate-700 mb-2">
            Chapters / Topics to Include
          </label>
          <textarea
            id="topics"
            name="topics"
            value={inputs.topics}
            onChange={handleChange}
            placeholder="e.g., 'Newton's Laws, Momentum and Impulse, Work-Energy Theorem'"
            className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select name="subject" value={inputs.subject} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg bg-white" required>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-2">Grade Level</label>
            <select name="grade" value={inputs.grade} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg bg-white" required>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
           <div>
            <label htmlFor="examType" className="block text-sm font-medium text-slate-700 mb-2">Exam Type</label>
            <select name="examType" value={inputs.examType} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
              {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                 <label htmlFor="totalMarks" className="block text-sm font-medium text-slate-700 mb-2">Total Marks</label>
                <input
                    type="number"
                    name="totalMarks"
                    value={inputs.totalMarks}
                    onChange={handleChange}
                    className="w-full p-3 border border-slate-300 rounded-lg"
                    placeholder="e.g., 150"
                    required
                />
            </div>
         </div>

        <div className="space-y-4 pt-2">
          <label htmlFor="generateDiagram" className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="generateDiagram"
              checked={!!inputs.generateDiagram}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Include Source-Based Questions with a Diagram
            </span>
          </label>
          <label htmlFor="includeChart" className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="includeChart"
              checked={!!inputs.includeChart}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Include a relevant graph/chart
            </span>
          </label>
        </div>

        <div className="text-center pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Generating...' : 'Generate Question Paper'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionPaperForm;