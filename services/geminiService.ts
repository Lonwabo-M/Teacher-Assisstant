
import { GoogleGenAI, Type } from "@google/genai";
import type { UserInputs, LessonData, QuestionPaperInputs, QuestionPaperData, ExamQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DIAGRAM_STYLE_PROMPT = `
STYLE GUIDE: South African CAPS Physics/Science Exam Diagram.
1. VISUAL STYLE: Strictly 2D black and white line art. High contrast. White background. 
2. EXCLUSIONS: ABSOLUTELY NO TEXT, NUMBERS, OR LETTERS IN THE IMAGE. 
3. LABELS: Do NOT add labels like "A", "B", "5kg", "Force".
`;

const CAPS_INSTRUCTION = `
You are an expert South African educator specializing in the CAPS curriculum. 
Adhere strictly to the CAPS Subject Assessment Guidelines (SAGs).
`;

const MATH_FORMATTING_PROMPT = `
LATEX RULES:
1. BLOCK MATH: Use \\[ ... \\] for centered equations.
2. INLINE MATH: Use \\( ... \\) for in-text equations.
3. ANNOTATIONS: Do NOT use block delimiters inside inline math. Use square brackets [ ] for literal text notes in math.
`;

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    mismatch: { type: Type.BOOLEAN },
    mismatchReason: { type: Type.STRING },
    lessonPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ["title", "duration", "content"],
      },
    },
  },
  required: ["mismatch", "lessonPlan"],
};

const slidesSchema = {
  type: Type.OBJECT,
  properties: {
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyConcept: { type: Type.STRING },
          speakerNotes: { type: Type.STRING },
        },
        required: ["title", "content", "keyConcept", "speakerNotes"],
      },
    },
  },
  required: ["slides"],
};

const worksheetContentSchema = {
  type: Type.OBJECT,
  properties: {
    worksheet: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.STRING },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    type: { type: Type.STRING },
                    bloomTaxonomyLevel: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                  },
                  required: ["question", "type", "bloomTaxonomyLevel"],
                },
              },
            },
            required: ["title", "questions"],
          },
        },
      },
      required: ["title", "instructions", "sections"],
    },
  },
  required: ["worksheet"],
};

const visualsSchema = {
  type: Type.OBJECT,
  properties: {
    diagramLabels: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
            },
            required: ["text", "x", "y"]
        }
    },
    chartData: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        title: { type: Type.STRING },
        data: {
          type: Type.OBJECT,
          properties: {
            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
            datasets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                },
                required: ["label", "data"],
              },
            },
          },
          required: ["labels", "datasets"],
        },
        description: { type: Type.STRING },
      },
      required: ["type", "title", "data", "description"],
    },
  },
};

const notesSchema = {
    type: Type.OBJECT,
    properties: { notes: { type: Type.STRING } },
    required: ["notes"]
};

const paperStructureSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.STRING },
                    questionText: { type: Type.STRING },
                    markAllocation: { type: Type.NUMBER },
                    bloomTaxonomyLevel: { type: Type.STRING },
                },
                required: ["questionNumber", "questionText", "markAllocation", "bloomTaxonomyLevel"]
            }
        },
    },
    required: ["title", "instructions", "questions"]
};

const paperMemoSchema = {
    type: Type.OBJECT,
    properties: {
        answers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.STRING },
                    answer: { type: Type.STRING },
                },
                required: ["questionNumber", "answer"]
            }
        }
    },
    required: ["answers"]
};

const cleanLatex = (str: string): string => {
    if (!str) return '';
    return str.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        if (content.trim().startsWith('\\text{') && content.length < 100) {
            return `[${content}]`;
        }
        return match;
    });
};

const parseJsonSafe = (text: string | undefined): any => {
    if (!text) return null;
    try {
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
        cleanText = cleanText.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, c => c === '\t' ? ' ' : '');
        const start = Math.max(cleanText.indexOf('{'), cleanText.indexOf('['));
        const end = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
        if (start !== -1 && end !== -1) cleanText = cleanText.substring(start, end + 1);
        return JSON.parse(cleanText);
    } catch (e) {
        return null;
    }
}

const generateWithRetry = async (model: string, prompt: string, schema: any, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: schema,
        }
      });
      const parsed = parseJsonSafe(response.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn(`Attempt ${attempt + 1} failed:`, e);
    }
  }
  return null;
};

export const generateLesson = async (inputs: UserInputs): Promise<LessonData> => {
  const model = 'gemini-3-pro-preview';
  const referenceContext = inputs.goals ? `\nSTRICT REFERENCE MATERIAL:\n"${inputs.goals}"\n` : '';

  const planPrompt = `${CAPS_INSTRUCTION}\nTask: Create a lesson plan.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const slidesPrompt = `${CAPS_INSTRUCTION}\nTask: Create presentation slides.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const worksheetPrompt = `${CAPS_INSTRUCTION}\nTask: Create a worksheet.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const visualsPrompt = `${CAPS_INSTRUCTION}\nTask: Generate metadata for visuals.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}. Settings: Diagram: ${inputs.generateDiagram}, Chart: ${inputs.includeChart}`;
  const notesPrompt = `${CAPS_INSTRUCTION}\nTask: Write student notes.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;

  const [planData, slidesData, worksheetData, visualsData, notesData] = await Promise.all([
    generateWithRetry(model, planPrompt, lessonPlanSchema),
    generateWithRetry(model, slidesPrompt, slidesSchema),
    generateWithRetry(model, worksheetPrompt, worksheetContentSchema),
    generateWithRetry(model, visualsPrompt, visualsSchema),
    generateWithRetry(model, notesPrompt, notesSchema),
  ]);

  if (!planData || !slidesData || !worksheetData || !visualsData || !notesData) {
      throw new Error("AI generation failed. Please try again.");
  }

  const lessonData: LessonData = {
    type: 'lesson',
    id: crypto.randomUUID(),
    inputs,
    lessonPlan: planData.lessonPlan,
    slides: slidesData.slides,
    worksheet: { ...worksheetData.worksheet, diagramLabels: visualsData.diagramLabels },
    notes: cleanLatex(notesData.notes),
    chartData: visualsData.chartData
  };

  if (inputs.generateDiagram) {
    try {
        const imagePrompt = `${DIAGRAM_STYLE_PROMPT} Create a diagram for ${inputs.subject} lesson about ${inputs.goals.substring(0, 500)}.`;
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: imagePrompt,
        });
        const part = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
            lessonData.worksheet.generatedImage = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
        }
    } catch (e) {
        console.error("Image generation failed", e);
    }
  }

  return lessonData;
};

export const generateQuestionPaper = async (inputs: QuestionPaperInputs): Promise<QuestionPaperData> => {
    const model = 'gemini-3-pro-preview';
    const structurePrompt = `${CAPS_INSTRUCTION}\nTask: Create a ${inputs.examType} question paper.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}. Topics: ${inputs.topics}. Total Marks: ${inputs.totalMarks}.\n${MATH_FORMATTING_PROMPT}`;
    const structureData = await generateWithRetry(model, structurePrompt, paperStructureSchema);
    if (!structureData) throw new Error("Failed to generate question paper structure.");

    const memoPrompt = `${CAPS_INSTRUCTION}\nTask: Create a detailed marking memorandum.\nQuestions: ${JSON.stringify(structureData.questions)}\n${MATH_FORMATTING_PROMPT}`;
    const memoData = await generateWithRetry(model, memoPrompt, paperMemoSchema);

    const paperData: QuestionPaperData = {
        type: 'paper',
        id: crypto.randomUUID(),
        inputs,
        title: structureData.title,
        instructions: structureData.instructions,
        questions: structureData.questions.map((q: any) => ({
            ...q,
            answer: memoData?.answers?.find((a: any) => a.questionNumber === q.questionNumber)?.answer || "Answer not generated."
        })),
    };

    return paperData;
};

export const regenerateDiagramImage = async (originalImageData: string, instruction: string): Promise<{ data: string; mimeType: string }> => {
    const prompt = `${DIAGRAM_STYLE_PROMPT} Modify the attached image: ${instruction}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
            { inlineData: { mimeType: 'image/png', data: originalImageData } },
            { text: prompt }
        ],
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
    throw new Error("Failed to regenerate image");
};
