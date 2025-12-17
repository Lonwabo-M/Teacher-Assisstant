
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

const cleanLatexInObject = (obj: any): any => {
  if (obj === undefined || obj === null) return obj;
  if (typeof obj === 'string') {
    let str = obj;

    // 1. Fix Hallucinated nested block math often used by AI for annotations
    // v_f = v_i + a\[\text{vertical}\] -> v_f = v_i + a[\text{vertical}]
    str = str.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        // If it looks like a simple text annotation, use literal brackets
        if (content.trim().startsWith('\\text{') && !content.includes('\\frac') && content.length < 100) {
            return `[${content}]`;
        }
        return match;
    });

    // 2. Fix Double Superscripts/Subscripts that KaTeX hates
    str = str.replace(/(\d+|[a-zA-Z])\^\s*([a-zA-Z0-9])\^\s*\{-1\}/g, "$1^{$2-1}");
    str = str.replace(/(\^)\s*([a-zA-Z0-9]+)\s*(\^)/g, "$1{$2}$3");

    // 3. Improve Units Formatting
    str = str.replace(/(\\cdot\s*|\\times\s*|= \s*)([A-Z][a-z]{2,})/g, "$1\\text{$2}");
    str = str.replace(/([A-Z][a-z]{2,})(\s*\^|\s*\\cdot|\s*\\times|\s*^{-1})/g, "\\text{$1}$2");
    
    // 4. Recursive Text Cleaning
    let iterations = 0;
    while (/\\text\{[^{}]*(\\|\\cdot|\\times)[^{}]*\}/.test(str) && iterations < 5) {
         str = str.replace(/\\text\{([^{}]*?)(\\cdot|\\times)(\{\})?([^{}]*?)\}/g, "\\text{$1}$2\\text{$4}");
         iterations++;
    }
    
    str = str.replace(/\\text\{\s*\}/g, "");

    // 5. Ensure Correct Delimiters
    str = str.replace(/\$\$(.*?)\$\$/gs, "\\[$1\\]");
    str = str.replace(/([^\d]|^)\$([^$]+?)\$([^\d]|$)/g, (match, prefix, content, suffix) => {
        if (/^\d+(\.\d{2})?$/.test(content.trim())) return match;
        return `${prefix}\\(${content}\\)${suffix}`;
    });
    str = str.replace(/\\\s+\[/g, '\\[').replace(/\\\s+\]/g, '\\]');
    str = str.replace(/\\\s+\(/g, '\\(').replace(/\\\s+\)/g, '\\)');
    return str;
  }
  if (Array.isArray(obj)) return obj.map(cleanLatexInObject);
  if (typeof obj === 'object' && obj !== null) {
     const newObj: any = {};
     for (const key in obj) newObj[key] = cleanLatexInObject(obj[key]);
     return newObj;
  }
  return obj;
}

const parseJsonSafe = (text: string | undefined): any => {
    if (!text) return null;
    try {
        let cleanText = text.trim();
        // Remove common non-JSON prefixes/suffixes
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
        
        // Strip problematic raw control characters (except allowed ones like \n, \r)
        // Literal tabs (\t) and other low ASCII control chars break JSON.parse
        cleanText = cleanText.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, (c) => {
            if (c === '\t') return ' '; // Replace tab with space
            return ''; // Strip others
        });

        // Find the actual JSON structure
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        let start = -1;
        if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
        else if (firstBrace !== -1) start = firstBrace;
        else if (firstBracket !== -1) start = firstBracket;
        
        const lastBrace = cleanText.lastIndexOf('}');
        const lastBracket = cleanText.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (start !== -1 && end !== -1 && start < end) {
            cleanText = cleanText.substring(start, end + 1);
        }
        
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parsing failed for text:", text?.substring(0, 150) + "...");
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
            maxOutputTokens: 8192 
        }
      });
      
      const parsed = parseJsonSafe(response.text);
      if (parsed) return parsed;
      
      console.warn(`Attempt ${attempt + 1} failed to parse JSON. Retrying...`);
    } catch (e) {
      console.warn(`Attempt ${attempt + 1} failed with error:`, e);
    }
  }
  return null;
};

export const generateLesson = async (inputs: UserInputs): Promise<LessonData> => {
  const referenceContext = inputs.goals ? `\nSTRICT REFERENCE MATERIAL (Use this for content):\n"${inputs.goals}"\n` : '';

  const planPrompt = `${CAPS_INSTRUCTION}\nTask: Create a lesson plan.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\nCheck for mismatch between grade/subject and content.\n${MATH_FORMATTING_PROMPT}`;
  const slidesPrompt = `${CAPS_INSTRUCTION}\nTask: Create presentation slides.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\nFocus on key concepts and definitions.\n${MATH_FORMATTING_PROMPT}`;
  const worksheetPrompt = `${CAPS_INSTRUCTION}\nTask: Create a worksheet (Questions & Sections only).\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\nInclude varied question types.\nIMPORTANT: Do NOT generate diagram data or chart data here.\n${MATH_FORMATTING_PROMPT}`;
  const visualsPrompt = `${CAPS_INSTRUCTION}\nTask: Generate metadata for visuals (Diagram labels, Chart data).\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\nContext: ${inputs.goals.substring(0, 1000)}...\nUSER SETTINGS:\n- Generate Diagram: ${inputs.generateDiagram}\n- Include Chart: ${inputs.includeChart}`;
  const notesPrompt = `${CAPS_INSTRUCTION}\nTask: Write COMPREHENSIVE, TEXTBOOK-QUALITY student notes.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}.\n${referenceContext}\n${MATH_FORMATTING_PROMPT}`;

  const [planData, slidesData, worksheetData, visualsData, notesData] = await Promise.all([
    generateWithRetry('gemini-2.5-flash', planPrompt, lessonPlanSchema),
    generateWithRetry('gemini-2.5-flash', slidesPrompt, slidesSchema),
    generateWithRetry('gemini-2.5-flash', worksheetPrompt, worksheetContentSchema),
    generateWithRetry('gemini-2.5-flash', visualsPrompt, visualsSchema),
    generateWithRetry('gemini-2.5-flash', notesPrompt, notesSchema),
  ]);

  if (!planData || !slidesData || !worksheetData || !visualsData || !notesData) {
      throw new Error("One or more AI responses were incomplete. Please try again or reduce the content scope.");
  }

  if (!inputs.includeChart) {
    visualsData.chartData = null;
  }

  const mergedWorksheet = {
      ...worksheetData.worksheet,
      diagramLabels: visualsData.diagramLabels,
      coverups: visualsData.coverups,
      arrows: visualsData.arrows,
      projectilePaths: visualsData.projectilePaths,
  };

  const lessonData = {
    mismatch: planData.mismatch,
    mismatchReason: planData.mismatchReason,
    lessonPlan: planData.lessonPlan,
    slides: slidesData.slides,
    worksheet: mergedWorksheet,
    chartData: visualsData.chartData,
    notes: notesData.notes
  };

  const cleanedLessonData = cleanLatexInObject(lessonData);

  if (inputs.generateDiagram && !cleanedLessonData.mismatch) {
    try {
        const imagePrompt = `${DIAGRAM_STYLE_PROMPT} Subject: ${inputs.subject}. Context: ${inputs.goals.substring(0, 500)}. Create a diagram.`;
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: imagePrompt,
        });
        
        const parts = imageResponse.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    cleanedLessonData.worksheet.generatedImage = {
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType
                    };
                    break;
                }
            }
        }
    } catch (e) {
        console.error("Image generation failed", e);
    }
  }

  return { ...cleanedLessonData, type: 'lesson' };
};

export const generateQuestionPaper = async (inputs: QuestionPaperInputs): Promise<QuestionPaperData> => {
    const structurePrompt = `${CAPS_INSTRUCTION}\nTask: Create a ${inputs.examType} question paper.\nSubject: ${inputs.subject}. Grade: ${inputs.grade}. Total Marks: ${inputs.totalMarks}.\nTopics: ${inputs.topics}.\n${MATH_FORMATTING_PROMPT}`;
    const structureData = await generateWithRetry('gemini-2.5-flash', structurePrompt, paperStructureSchema);
    if (!structureData) throw new Error("Failed to generate question paper structure.");

    const questionsJson = JSON.stringify(structureData.questions);
    const visualsPrompt = `${CAPS_INSTRUCTION}\nTask: Generate diagram labels, arrows, and chart data based on these exam questions.\nQuestions: ${questionsJson}\nUSER SETTINGS:\n- Generate Diagram: ${inputs.generateDiagram}\n- Include Chart: ${inputs.includeChart}`;
    const visualsData = await generateWithRetry('gemini-2.5-flash', visualsPrompt, visualsSchema) || { diagramLabels: [], coverups: [], arrows: [], projectilePaths: [], chartData: null };

    const memoPrompt = `${CAPS_INSTRUCTION}\nTask: Create a detailed memorandum (marking guide).\nQuestions: ${questionsJson}\n${MATH_FORMATTING_PROMPT}`;
    const memoData = await generateWithRetry('gemini-2.5-flash', memoPrompt, paperMemoSchema);
    if (!memoData) throw new Error("Failed to generate memorandum.");

    const generatedImage = inputs.generateDiagram ? await (async () => {
         try {
            const imagePrompt = `${DIAGRAM_STYLE_PROMPT} Subject: ${inputs.subject}. Context: ${inputs.topics}. Create a diagram for an exam question.`;
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: imagePrompt,
            });
            const parts = imageResponse.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData) {
                        return {
                            data: part.inlineData.data,
                            mimeType: part.inlineData.mimeType
                        };
                    }
                }
            }
        } catch (e) {
            console.error("Image generation failed", e);
            return undefined;
        }
    })() : undefined;

    if (!inputs.includeChart) {
      visualsData.chartData = null;
    }

    const mergedQuestions: ExamQuestion[] = structureData.questions.map((q: any) => {
        const memoItem = memoData.answers?.find((a: any) => a.questionNumber === q.questionNumber);
        return {
            ...q,
            answer: memoItem ? memoItem.answer : "Answer not generated."
        };
    });

    const paperData: QuestionPaperData = {
        type: 'paper',
        id: '',
        inputs,
        title: structureData.title,
        instructions: structureData.instructions,
        questions: mergedQuestions,
        diagramLabels: visualsData.diagramLabels,
        coverups: visualsData.coverups,
        arrows: visualsData.arrows,
        projectilePaths: visualsData.projectilePaths,
        chartData: visualsData.chartData,
        generatedImage: generatedImage
    };

    return cleanLatexInObject(paperData);
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

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                };
            }
        }
    }
    throw new Error("Failed to regenerate image");
};
