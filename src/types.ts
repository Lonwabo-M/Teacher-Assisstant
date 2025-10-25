export interface UserInputs {
  goals: string;
  standard: 'CAPS' | 'Cambridge';
  grade: string;
  subject: string;
  generateDiagram?: boolean;
  includeChart?: boolean;
}

export interface QuestionPaperInputs {
  subject: string;
  grade: string;
  examType: 'Class Test' | 'Term Exam' | 'Final Exam';
  totalMarks: string;
  topics: string; // Comma-separated list of chapters/topics
  generateDiagram?: boolean;
  includeChart?: boolean;
}

export interface LessonPlanSection {
  title: string;
  duration: string;
  content: string;
}

export interface Slide {
  title: string;
  content: string[];
  keyConcept: string;
  speakerNotes: string;
}

export interface WorksheetQuestion {
  question: string;
  type: string;
  bloomTaxonomyLevel: string;
  options?: string[];
  answer?: string;
}

export interface WorksheetSection {
  title: string;
  content?: string; // For instructions, word banks, scenario text etc.
  questions: WorksheetQuestion[];
}

export interface DiagramLabel {
  text: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
  rotate?: number; // Optional rotation in degrees
}

export interface Worksheet {
  title: string;
  instructions: string;
  sections: WorksheetSection[];
  source?: {
    title: string;
    content: string;
  };
  generatedImage?: {
    data: string; // base64 encoded string
    mimeType: string;
  };
  diagramLabels?: DiagramLabel[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
  description: string;
}

export interface LessonData {
  type: 'lesson';
  id: string;
  inputs: UserInputs;
  lessonPlan: LessonPlanSection[];
  slides: Slide[];
  worksheet: Worksheet;
  chartData?: ChartData;
}

export interface ExamQuestion {
  questionNumber: string; // e.g., "1.1", "2.3.1"
  questionText: string;
  markAllocation: number;
  answer: string;
  bloomTaxonomyLevel: string;
}

export interface QuestionPaperData {
    type: 'paper';
    id: string;
    inputs: QuestionPaperInputs;
    title: string;
    instructions: string[];
    questions: ExamQuestion[];
    generatedImage?: {
        data: string; // base64
        mimeType: string;
    };
    diagramLabels?: DiagramLabel[];
    chartData?: ChartData;
}


export type HistoryItem = LessonData | QuestionPaperData;


export interface PdfOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
}