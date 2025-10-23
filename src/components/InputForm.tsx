import React, { useRef } from 'react';
import type { UserInputs } from '../types';

// Declare the pdf.js library loaded globally via a script tag in index.html
declare const pdfjsLib: any;

interface InputFormProps {
  inputs: UserInputs;
  onInputChange: (newInputs: UserInputs) => void;
  onGenerate: (inputs: UserInputs) => void;
  isLoading: boolean;
}

const subjects = [
  'Accounting',
  'Afrikaans First Additional Language',
  'Business Studies',
  'Computer Applications Technology',
  'Consumer Studies',
  'Dramatic Arts',
  'Economics',
  'Engineering Graphics and Design',
  'English Home Language',
  'Geography',
  'History',
  'Information Technology',
  'Life Orientation',
  'Life Sciences',
  'Mathematics',
  'Mathematical Literacy',
  'Music',
  'Physical Sciences',
  'Visual Arts'
];
const grades = [
  'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

const InputForm: React.FC<InputFormProps> = ({ inputs, onInputChange, onGenerate, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        onInputChange({ ...inputs, [name]: checked });
    } else {
        onInputChange({ ...inputs, [name]: value });
    }
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    if (!file) return;

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onInputChange({ ...inputs, goals: text });
      };
      reader.onerror = () => {
        alert('Error reading .txt file.');
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // The item object has a 'str' property for text content
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n\n'; // Add space between pages
            }
            onInputChange({ ...inputs, goals: fullText.trim() });
        } catch (error) {
            console.error("Error parsing PDF:", error);
            alert("Failed to read text from PDF. The file might be image-based, corrupted, or protected.");
        }
    } else {
      alert('Unsupported file type. Please upload a .txt or .pdf file.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputs.goals && inputs.grade && inputs.subject) {
      onGenerate(inputs);
    } else {
      alert("Please fill in all required fields.");
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="goals" className="block text-lg font-semibold text-slate-700 mb-2">
            Curriculum Goals & Objectives
          </label>
          <textarea
            id="goals"
            name="goals"
            value={inputs.goals}
            onChange={handleChange}
            placeholder="e.g., 'Understand Newton's Second Law of Motion (F=ma) and apply it to problems involving forces, mass, and acceleration.'"
            className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200"
            required
          />
           <div className="mt-4">
            <p className="text-sm font-semibold text-slate-600 mb-2">Or, upload goals from a file:</p>
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Text/PDF
                </label>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleDocFileChange} accept=".txt,.pdf" ref={fileInputRef} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              id="subject"
              name="subject"
              value={inputs.subject}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 bg-white"
              required
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-2">Grade Level</label>
            <select
              id="grade"
              name="grade"
              value={inputs.grade}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 bg-white"
              required
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="standard" className="block text-sm font-medium text-slate-700 mb-2">Educational Standard</label>
            <select
              id="standard"
              name="standard"
              value={inputs.standard}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 bg-white"
            >
              <option value="CAPS">CAPS</option>
              <option value="Cambridge">Cambridge</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4 pt-2">
          <label htmlFor="generateDiagram" className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id="generateDiagram"
              name="generateDiagram"
              checked={!!inputs.generateDiagram}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Generate Diagram for Source-Based Questions <span className="text-slate-500 font-normal">(e.g., for Physics, Biology)</span>
            </span>
          </label>
          <label htmlFor="includeChart" className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id="includeChart"
              name="includeChart"
              checked={!!inputs.includeChart}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Include a relevant graph/chart <span className="text-slate-500 font-normal">(e.g., for Economics, Science)</span>
            </span>
          </label>
        </div>


        <div className="text-center pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate New Lesson'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;