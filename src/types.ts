export interface UserInputs {
  goals: string;
  standard: 'CAPS' | 'Cambridge';
  grade: string;
  subject: string;
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
  id: string;
  inputs: UserInputs;
  lessonPlan: LessonPlanSection[];
  slides: Slide[];
  worksheet: Worksheet;
  chartData?: ChartData;
}

export interface PdfOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
}