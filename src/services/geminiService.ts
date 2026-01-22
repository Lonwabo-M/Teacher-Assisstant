
import { GoogleGenAI, Type } from "@google/genai";
import type { UserInputs, LessonData, QuestionPaperInputs, QuestionPaperData, ExamQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DIAGRAM_STYLE_PROMPT = `
STYLE GUIDE: South African CAPS Physics/Science Exam Diagram.
1. VISUAL STYLE: Strictly 2D black and white line art. High contrast. White background. 
2. ELEMENTS: Use standard scientific symbols (blocks, pulleys, lenses, circuits, trajectories). Simple geometric shapes. 
3. EXCLUSIONS: ABSOLUTELY NO TEXT, NUMBERS, OR LETTERS IN THE IMAGE. 
4. LABELS: Do NOT add labels like "A", "B", "5kg", "Force". The system will add these programmatically.
5. COMPLEXITY: Minimalist. Clean lines. No shading. No gradients. No 3D effects.
`;

const CAPS_INSTRUCTION = `
You are an expert South African educator specializing in the CAPS curriculum. 
Adhere strictly to the CAPS Subject Assessment Guidelines (SAGs).
If the user provides reference content, YOU MUST BASE YOUR OUTPUT ON IT.
`;

const MATH_FORMATTING_PROMPT = `
LATEX RULES:
1. BLOCK MATH: Use \\[ ... \\] for centered equations.
2. INLINE MATH: Use \\( ... \\) for in-text equations.
3. NO PLAIN TEXT MATH: Always wrap variables/formulas in delimiters.
4. SYNTAX: Use \\cdot for multiplication. Avoid double superscripts.
5. UNITS: Use \\text{m}\\cdot\\text{s}^{-1} NOT \\text{m \\cdot s^{-1}}. Never put \\cdot inside \\text{}.
6. ANNOTATIONS: Do NOT use block delimiters \\[ \\] inside inline math. Use square brackets [ ] for literal text notes in math.
`;

const arrowSchema = {
  type: Type.ARRAY,
  description: "An array of arrows to be overlaid on the generated diagram.",
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      x1: { type: Type.NUMBER },
      y1: { type: Type.NUMBER },
      x2: { type: Type.NUMBER },
      y2: { type: Type.NUMBER },
    },
    required: ["id", "x1", "y1", "x2", "y2"],
  }
};

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
          content: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
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
              content: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["multiple-choice", "short-answer", "long-answer", "matching", "fill-in-the-blank", "source-based", "essay"] },
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
        source: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
            }
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
    coverups: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
            },
            required: ["id", "x", "y", "width", "height"]
        }
    },
    arrows: arrowSchema,
    projectilePaths: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                x1: { type: Type.NUMBER },
                y1: { type: Type.NUMBER },
                x2: { type: Type.NUMBER },
                y2: { type: Type.NUMBER },
                peakY: { type: Type.NUMBER },
            },
            required: ["id", "x1", "y1", "x2", "y2", "peakY"]
        }
    },
    chartData: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ["bar", "line", "pie"] },
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
    properties: {
        notes: { type: Type.STRING },
    },
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

/**
 * Sanitizes LaTeX output from the model by fixing common delimiter hallucinations
 * and cleaning up nested syntax that crashes KaTeX.
 */
const cleanLatexInObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        let str = obj;
        // Fix hallucinated nested block delimiters inside text annotations
        // v_f = v_i + a\[\text{vertical}\] -> v_f = v_i + a[\text{vertical}]
        str = str.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
            if (content.trim().startsWith('\\text{') && content.length < 100) {
                return `[${content}]`;
            }
            return match;
        });
        // Remove literal tabs or weird non-breaking space characters that AI sometimes emits
        return str.replace(/\t/g, ' ').replace(/\u00A0/g, ' ');
    }
    if (Array.isArray(obj)) return obj.map(cleanLatexInObject);
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = cleanLatexInObject(obj[key]);
        }
        return newObj;
    }
    return obj;
};

const parseJsonSafe = (text: string | undefined): any => {
    if (!text) return null;
    try {
        let cleanText = text.trim();
        // Remove markdown wrappers
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
        // Remove raw control characters (except newline, tab) that break JSON.parse
        // This handles cases where models include unescaped tabs or low-ASCII chars
        cleanText = cleanText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
        
        // Final attempt to locate the JSON block if text includes conversational preamble
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        
        const lastBrace = cleanText.lastIndexOf('}');
        const lastBracket = cleanText.lastIndexOf(']');
        const end = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;

        if (start !== -1 && end !== -1 && start < end) {
            cleanText = cleanText.substring(start, end + 1);
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse JSON text from AI response:", text);
        return null;
    }
}

const generateWithRetry = async (model: string, prompt: string, schema: any, taskLabel: string, retries = 2): Promise<any> => {
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
      console.warn(`Attempt ${attempt + 1} for "${taskLabel}" failed: JSON parse error.`);
    } catch (e: any) {
      console.warn(`Attempt ${attempt + 1} for "${taskLabel}" failed:`, e.message);
    }
  }
  return null;
};

export const generateLesson = async (inputs: UserInputs): Promise<LessonData> => {
  const proModel = 'gemini-3-pro-preview';
  const flashModel = 'gemini-3-flash-preview';
  
  const referenceContext = inputs.goals ? `\nSTRICT REFERENCE MATERIAL (BASE CONTENT ON THIS):\n"${inputs.goals}"\n` : '';

  const planPrompt = `${CAPS_INSTRUCTION}\nTask: Create a lesson plan.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const slidesPrompt = `${CAPS_INSTRUCTION}\nTask: Create presentation slides.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const worksheetPrompt = `${CAPS_INSTRUCTION}\nTask: Create a worksheet.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;
  const visualsPrompt = `${CAPS_INSTRUCTION}\nTask: Generate metadata for visuals.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}. Settings: Diagram: ${inputs.generateDiagram}, Chart: ${inputs.includeChart}`;
  const notesPrompt = `${CAPS_INSTRUCTION}\nTask: Write student notes.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;

  // Pro is used for high-logic/reasoning parts (Plan, Notes)
  // Flash is used for structured output parts (Slides, Worksheet, Visuals) for speed and reliability
  const [planData, slidesData, worksheetData, visualsData, notesData] = await Promise.all([
    generateWithRetry(proModel, planPrompt, lessonPlanSchema, "Lesson Plan"),
    generateWithRetry(flashModel, slidesPrompt, slidesSchema, "Slides"),
    generateWithRetry(flashModel, worksheetPrompt, worksheetContentSchema, "Worksheet"),
    generateWithRetry(flashModel, visualsPrompt, visualsSchema, "Visuals Metadata"),
    generateWithRetry(proModel, notesPrompt, notesSchema, "Student Notes"),
  ]);

  if (!planData || !slidesData || !worksheetData || !visualsData || !notesData) {
      const failed = [];
      if (!planData) failed.push("Lesson Plan");
      if (!slidesData) failed.push("Slides");
      if (!worksheetData) failed.push("Worksheet");
      if (!visualsData) failed.push("Visuals");
      if (!notesData) failed.push("Student Notes");
      
      throw new Error(`AI generation incomplete for components: ${failed.join(', ')}. This usually happens due to API timeouts. Please try again.`);
  }

  const worksheet = {
      ...worksheetData.worksheet,
      diagramLabels: visualsData.diagramLabels,
      coverups: visualsData.coverups,
      arrows: visualsData.arrows,
      projectilePaths: visualsData.projectilePaths,
  };

  const rawLessonData: LessonData = {
    type: 'lesson',
    id: crypto.randomUUID(),
    inputs,
    lessonPlan: planData.lessonPlan,
    slides: slidesData.slides,
    worksheet: worksheet,
    chartData: visualsData.chartData,
    notes: notesData.notes
  };

  // Sanitize the data for LaTeX safety
  const lessonData = cleanLatexInObject(rawLessonData);

  if (inputs.generateDiagram) {
    try {
        const imagePrompt = `${DIAGRAM_STYLE_PROMPT} Subject: ${inputs.subject}. Context: ${inputs.goals.substring(0, 500)}. Create a diagram.`;
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: imagePrompt,
        });
        const part = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
            lessonData.worksheet.generatedImage = {
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
            };
        }
    } catch (e) {
        console.error("Image generation failed", e);
    }
  }

  return lessonData;
};

export const generateQuestionPaper = async (inputs: QuestionPaperInputs): Promise<QuestionPaperData> => {
    const proModel = 'gemini-3-pro-preview';
    const flashModel = 'gemini-3-flash-preview';

    const structurePrompt = `${CAPS_INSTRUCTION}\nTask: Create a ${inputs.examType} question paper.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}. Topics: ${inputs.topics}. Total Marks: ${inputs.totalMarks}.\n${MATH_FORMATTING_PROMPT}`;
    const structureData = await generateWithRetry(proModel, structurePrompt, paperStructureSchema, "Question Paper Structure");
    if (!structureData) throw new Error("Failed to generate question paper structure.");

    const memoPrompt = `${CAPS_INSTRUCTION}\nTask: Create a detailed marking memorandum.\nQuestions: ${JSON.stringify(structureData.questions)}\n${MATH_FORMATTING_PROMPT}`;
    const memoData = await generateWithRetry(proModel, memoPrompt, paperMemoSchema, "Memorandum");

    const rawPaperData: QuestionPaperData = {
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

    const paperData = cleanLatexInObject(rawPaperData);

    if (inputs.generateDiagram) {
        try {
            const imagePrompt = `${DIAGRAM_STYLE_PROMPT} Subject: ${inputs.subject}. Create an exam diagram for: ${inputs.topics.substring(0, 300)}`;
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: imagePrompt,
            });
            const part = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (part?.inlineData) {
                paperData.generatedImage = {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                };
            }
        } catch (e) {
            console.error("Image generation failed", e);
        }
    }

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
