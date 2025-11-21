
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UserInputs, LessonData, QuestionPaperInputs, QuestionPaperData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const arrowSchema = {
  type: Type.ARRAY,
  description: "An array of arrows to be overlaid on the generated diagram. Each arrow represents a vector (e.g., force, velocity). Omit if no arrows are needed.",
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "A unique identifier for the arrow, e.g., 'arrow-force-gravity'." },
      x1: { type: Type.NUMBER, description: "The horizontal position of the arrow's starting point (tail), as a percentage (0-100) from the left edge." },
      y1: { type: Type.NUMBER, description: "The vertical position of the arrow's starting point (tail), as a percentage (0-100) from the top edge." },
      x2: { type: Type.NUMBER, description: "The horizontal position of the arrow's ending point (head), as a percentage (0-100) from the left edge." },
      y2: { type: Type.NUMBER, description: "The vertical position of the arrow's ending point (head), as a percentage (0-100) from the top edge." },
    },
    required: ["id", "x1", "y1", "x2", "y2"],
  }
};

const lessonResponseSchema = {
  type: Type.OBJECT,
  properties: {
    mismatch: { type: Type.BOOLEAN, description: "Set to true if the curriculum goals do not match the specified subject or grade level." },
    mismatchReason: { type: Type.STRING, description: "If mismatch is true, explain why the topic is not suitable for the subject or grade." },
    lessonPlan: {
      type: Type.ARRAY,
      description: "A detailed lesson plan with sections for introduction, main activities, and conclusion.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the lesson plan section (e.g., 'Introduction', 'Activity 1', 'Assessment')." },
          duration: { type: Type.STRING, description: "Estimated time for this section (e.g., '10 minutes')." },
          content: { type: Type.STRING, description: "A detailed description of activities and teaching methods for this section. Structure it with subheadings like 'Teacher Activities', 'Learner Activities', 'Resources', 'Assessment', and 'Differentiation' to provide a comprehensive guide. You can use markdown tables for structured content like vocabulary lists or rubrics." },
        },
        required: ["title", "duration", "content"],
      },
    },
    slides: {
      type: Type.ARRAY,
      description: "A series of presentation slides, each with a title and key content points.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the slide." },
          keyConcept: { type: Type.STRING, description: "The main concept or takeaway for the slide." },
          content: { 
            type: Type.ARRAY, 
            description: "An array of bullet points or short paragraphs for the slide's content.",
            items: { type: Type.STRING }
          },
          speakerNotes: { type: Type.STRING, description: "Detailed speaker notes for the teacher. Include in-depth explanations, examples, questions for students, and ways to address common misconceptions. Suggest a time for this slide. Markdown tables can be used for clarity." },
        },
        required: ["title", "keyConcept", "content", "speakerNotes"],
      },
    },
    worksheet: {
      type: Type.OBJECT,
      description: "A worksheet for students with a title, instructions, and a variety of questions organized into sections.",
      properties: {
        title: { type: Type.STRING, description: "The title of the worksheet." },
        instructions: { type: Type.STRING, description: "Clear, student-facing instructions. Include an estimated time for completion and any necessary context." },
        sections: {
          type: Type.ARRAY,
          description: "An array of sections designed to be comprehensive. Ensure a logical flow, starting with knowledge recall and building towards application and analysis. Include a variety of question types.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The title of the section (e.g., 'Section A: Key Term Matching')." },
              content: { type: Type.STRING, description: "Optional content for the section, such as a word bank for a diagram or a scenario for application questions." },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: "The question or prompt for the student. For a matching section, this could be the term to match. For a diagram, it could be a placeholder like '[Diagram Image]'." },
                    type: { type: Type.STRING, description: "Type of question (e.g., 'multiple-choice', 'short-answer', 'source-based', 'true-false', 'matching', 'diagram-labeling')." },
                    bloomTaxonomyLevel: { type: Type.STRING, description: "The cognitive level from Bloom's Taxonomy (e.g., 'Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating')." },
                    options: { 
                      type: Type.ARRAY, 
                      description: "An array of options for multiple-choice or matching questions.",
                      items: { type: Type.STRING }
                    },
                    answer: { type: Type.STRING, description: "The correct answer to the question. All mathematical notation in the answer MUST strictly follow the LaTeX formatting rules defined in the main prompt."}
                  },
                  required: ["question", "type", "bloomTaxonomyLevel"],
                },
              }
            },
            required: ["title", "questions"],
          },
        },
        source: {
            type: Type.OBJECT,
            description: "An optional source material for source-based questions.",
            properties: {
                title: { type: Type.STRING, description: "The title of the source material (e.g., 'Excerpt from the Freedom Charter' or 'Source A: Diagram')." },
                content: { type: Type.STRING, description: "The full text or detailed description/caption of the source material." },
            },
        },
        diagramDescription: {
            type: Type.STRING,
            description: "A purely VISUAL and GEOMETRIC description for an AI image model. Describe ONLY the base shapes, lines, and their arrangement (e.g., blocks, planes, circuits). CRITICAL: Do NOT include any text, letters, numbers, or arrows in this description. All text-based labels will be handled by the 'diagramLabels' field and all arrows will be handled by the 'arrows' field. The prompt you create MUST also end with the explicit instruction: 'Do NOT add any text, numbers, labels, or arrows to the image.'"
        },
        diagramLabels: {
          type: Type.ARRAY,
          description: "CRITICAL: An array of text labels to be overlaid on the generated diagram. Ensure labels are clearly positioned and DO NOT overlap with each other or obscure important parts of the diagram. Omit if no diagram is generated.",
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The text of the label (e.g., 'Block A', '\\(m_A = 5 \\text{ kg}\\)', '30°'). Must use LaTeX for math." },
              x: { type: Type.NUMBER, description: "The horizontal position of the label's center, as a percentage (0-100) from the left edge of the image." },
              y: { type: Type.NUMBER, description: "The vertical position of the label's center, as a percentage (0-100) from the top edge of the image." },
              rotate: { type: Type.NUMBER, description: "Optional rotation angle in degrees for the label." },
            },
            required: ["text", "x", "y"],
          }
        },
        arrows: arrowSchema,
      },
      required: ["title", "instructions", "sections"],
    },
    chartData: {
      type: Type.OBJECT,
      description: "Data for a relevant chart or graph, but ONLY if it is explicitly requested and relevant to the topic. Otherwise, this should be omitted.",
      properties: {
        type: { type: Type.STRING, description: "The type of chart, MUST be one of: 'bar', 'line', or 'pie'." },
        title: { type: Type.STRING, description: "The title of the chart." },
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
        description: { type: Type.STRING, description: "A brief, teacher-facing description explaining the chart's relevance to the lesson." },
      },
    },
    notes: {
      type: Type.STRING,
      description: [
        'Generate an exceptionally comprehensive, university-level quality, and well-structured summary for student revision, ensuring the content is detailed enough to span at least three A4 pages when formatted.',
        'The notes must be clear, easy to understand, and suitable for the specified grade level.',
        'Use markdown for formatting, including headings (###), bold text (**text**), bullet points (-), and tables (using standard markdown pipe syntax).',
        'The notes MUST include the following distinct and highly detailed sections:',
        '1. **Introduction:** A brief, engaging paragraph introducing the topic and its relevance.',
        '2. **Key Definitions:** A comprehensive glossary of all critical terms, each with a clear and simple explanation.',
        '3. **Core Concepts in Detail:** An extremely thorough breakdown of each main concept. Go into significant depth. Use analogies, multiple step-by-step explanations, and simple language to ensure deep understanding. This section should be the most substantial part of the notes.',
        '4. **Worked Examples:** Provide at least THREE detailed, step-by-step worked examples that apply the core concepts. For calculations, clearly show the formula, substitution, and final answer. Explain the reasoning behind each step in detail.',
        '5. **Common Misconceptions:** A section that identifies and clarifies at least three common mistakes or misunderstandings students have about this topic, with explanations on why they are incorrect.',
        '6. **Summary & Key Takeaways:** A concise, bulleted list summarizing the most critical points and formulas to remember.'
      ].join(' ')
    }
  },
  required: ["lessonPlan", "slides", "worksheet", "notes"],
};

/**
 * Recursively traverses a JavaScript object and applies a cleaning function to all string values.
 * This is used to correct common AI-generated LaTeX errors before rendering.
 * @param obj The object to clean.
 * @returns The cleaned object.
 */
const cleanLatexInObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cleanLatexInObject(item));
    }
    
    // The cleaning function that applies multiple regex fixes to a string.
    const cleanString = (str: string): string => {
        if (typeof str !== 'string') return str;

        let cleanedStr = str
            // === Unicode & Control Characters ===
            .replace(/×/g, '\\\\times ')
            .replace(/−/g, '-')
            // Interpret middle dot between numbers as a decimal point.
            .replace(/(\d)\s*[⋅·]\s*(\d)/g, '$1.$2')
            .replace(/[⋅·]/g, ' \\\\cdot ')
            .replace(/→/g, '\\\\rightarrow ')
            .replace(/(\d+)°/g, '$1^{\\\\circ}')
            .replace(/Δ/g, '\\\\Delta ')
            .replace(/λ/g, '\\\\lambda ')
            .replace(/≈/g, '\\\\approx ')
            .replace(/\f/g, '') // Remove form feed characters

            // === Fix Common Command Typos & Variations ===
            .replace(/\\fract\b/g, '\\\\frac')
            .replace(/\\sqr\b/g, '\\\\sqrt')
            .replace(/\brac\b/g, '\\\\frac')
            .replace(/\\appro[x]*/g, '\\\\approx ')
            .replace(/\\mbox/g, '\\\\text') // Standardize mbox to text for KaTeX

            // FIX: Correct malformed \frac commands that are missing numerator braces, e.g., \frac 1{2} -> \frac{1}{2}.
            .replace(/\\frac\s*([^{}\n\r]+)\s*\{/g, '\\\\frac{$1}{')

            // === Ensure Commands Have Braces ===
            .replace(/\\(text|mathrm)\s+([\s\S]+?)(?=\s*\\|\s*$|[{])/g, (match, cmd, content) => `\\\\${cmd}{${content.trim()}}`)
            .replace(/\\vec\s+([a-zA-Z])/g, '\\\\vec{$1}')

            // === Formatting Numbers and Units ===
            .replace(/([a-zA-Z]+)\/([a-zA-Z]+)(?:\^(\d+))?/g, (match, numerator, denominator, exponent) => {
                const exp = exponent || '1';
                return `${numerator} \\\\cdot ${denominator}^{-{${exp}}}`;
            })
            .replace(/\s*x\s*(?=\d|\\frac|\()/g, ' \\\\times ')
            .replace(/(\d(?:\.\d+)?)\s*(?:x|\\times)\s*10\s*(-?\d+)/g, '$1 \\\\times 10^{$2}')
            .replace(/10\^\s*({?(-?\d+)}?)/g, (match, exp, num) => `10^{${num || exp}}`)
            .replace(/\b([a-zA-Z]{1,3})\s+(-)?\s*(\d+)\b/g, (match, unit, sign, exponent) => {
                 if (['sin', 'cos', 'tan', 'log', 'ln'].includes(unit.toLowerCase())) return match;
                return `${unit}^{${sign || ''}${exponent}}`;
            })
            .replace(/\b([a-zA-Z]{1,3})\^({?(-?\d+)}?)/g, (match, unit, exp, num) => {
                if (['sin', 'cos', 'tan', 'log', 'ln'].includes(unit.toLowerCase())) return match;
                const finalExp = num || exp;
                return `${unit}^{${finalExp}}`;
            })
            .replace(/(\d+)\s*\^o/g, '$1^{\\\\circ}')
            .replace(/\\(cos|sin)\^\{?(\d+)\}?\^\{?\\circ\}?/g, '\\\\$1($2^{\\\\circ})')
            
            // === Final Cleanup ===
            .replace(/(_|\^)\{\s*([^}]+?)\s*\}/g, '$1{$2}')
            .replace(/([a-zA-Z\d\^\{\}-]+)\s*\\cdots/g, '$1')
            // Fix stray backslashes before closing delimiters (e.g., `...\\)`) which cause crashes.
            .replace(/\\\\\)/g, ')') // FIX: `\\)` -> `)`
            .replace(/\\"/g, '"')
            .replace(/\\+$/, '');
            
        return cleanedStr;
    };


    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                newObj[key] = cleanString(value);
            } else {
                newObj[key] = cleanLatexInObject(value);
            }
        }
    }
    return newObj;
};

// FIX: Converted template literals to arrays of strings joined by newlines
// to prevent the linter from parsing the string content as code, which was
// causing "Cannot find name" errors for LaTeX examples.
const curriculumContexts = {
  "Accounting": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Accounting (South Africa)**',
      '',
      'This document outlines the examinable content for the final Grade 12 examination, which consists of two papers.',
      '',
      '**Paper 1: Financial Accounting (150 marks)**',
      '*   **Bank Reconciliations, Creditors Reconciliations, Debtors Age Analysis (35 marks):** Preparing and understanding these financial control processes.',
      '*   **Value-Added Tax (VAT) (20 marks):** Concepts and calculations.',
      '*   **Inventory Systems and Valuation (20 marks):** Periodic vs. perpetual systems; FIFO, weighted average methods.',
      '*   **Fixed/Tangible Assets (25 marks):** Asset disposal, depreciation calculations.',
      '*   **Companies (50 marks):** Unique accounts, concepts, preparation of financial statements (Statement of Comprehensive Income, Statement of Financial Position), and analysis & interpretation of financial data.',
      '',
      '**Paper 2: Managerial Accounting & Internal Control (150 marks)**',
      '*   **Cost Accounting (Manufacturing) (50 marks):** Production Cost Statement, concepts of fixed and variable costs.',
      '*   **Budgeting (40 marks):** Debtors\' Collection Schedule, Creditors\' Payment Schedule, Projected Income Statement, Cash Budget.',
      '*   **Analysis and Interpretation of Financial Information (30 marks):** Includes analysis of cash flow statements.',
      '*   **Internal Control & Ethics (30 marks):** Theory on internal controls, audit reports, and corporate governance.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Remembering/Knowledge: 15%',
      '*   Understanding/Comprehension: 25%',
      '*   Applying: 30%',
      '*   Analysing, Evaluating, Creating: 30%',
    ].join('\n'),
  },
  "Afrikaans First Additional Language": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Afrikaans First Additional Language (South Africa)**',
      '',
      '**Vraestel 1: Taal (80 Punte)**',
      '*   **Afdeling A: Leesbegrip (30 Punte):** Begrip van \'n geskrewe teks. Vrae fokus op letterlike, herorganiseerende, inferensiële, en evaluerende begrip.',
      '*   **Afdeling B: Opsomming (10 Punte):** Vermoë om hoofpunte uit \'n teks te identifiseer en in eie woorde op te som.',
      '*   **Afdeling C: Taalstrukture en -konvensies (40 Punte):** Toepassing van taalreels, woordeskat, en sinskonstruksie, dikwels in die konteks van \'n advertensie, spotprent, of teks.',
      '',
      '**Vraestel 2: Letterkunde (70 Punte)**',
      '*   **Afdeling A: Gedigte (35 Punte):** Analise van voorgeskrewe gedigte. Een gesiene gedig.',
      '*   **Afdeling B & C: Roman & Drama (35 Punte elk - kies EEN):** Beantwoording van konteks- en opsteltipe vrae oor die voorgeskrewe roman of drama.',
      '',
      '**Kognitiewe Vlakke (Vraestel 1):**',
      '*   Vlak 1 & 2 (Letterlik, Herorganisasie): 40%',
      '*   Vlak 3 (Inferensie): 40%',
      '*   Vlak 4 (Evaluering, Waardering): 20%',
      '',
      '**Kognitiewe Vlakke (Vraestel 2):**',
      '*   Level 1 & 2 (Kennis, Begrip): 40%',
      '*   Level 3 (Toepassing, Analise): 40%',
      '*   Level 4 (Sintese, Evaluering): 20%',
    ].join('\n'),
  },
  "Business Studies": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Business Studies (South Africa)**',
      '',
      '**Paper 1: Business Environments & Business Operations (150 marks)**',
      '*   **Business Environments:** Impact of recent legislation, business strategies (integration, diversification, etc.), sectors (primary, secondary, tertiary).',
      '*   **Business Operations:** Human resources function, quality management, investment concepts, forms of ownership.',
      '',
      '**Paper 2: Business Ventures & Business Roles (150 marks)**',
      '*   **Business Ventures:** Management and leadership, investment securities, presentation of business information, entrepreneurship.',
      '*   **Business Roles:** Ethics and professionalism, creative thinking and problem-solving, corporate social responsibility, human rights in the workplace.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Level 1: Remembering/Knowledge (Lower Order): 30%',
      '*   Level 2: Understanding/Applying (Middle Order): 50%',
      '*   Level 3: Analysing/Evaluating/Creating (Higher Order): 20%',
    ].join('\n'),
  },
  "Computer Applications Technology": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Computer Applications Technology (CAT) (South Africa)**',
      '',
      '**Theory Paper (150 marks):**',
      '*   **Systems Technologies:** Hardware, software, computer management.',
      '*   **Network Technologies:** Concepts, uses, advantages/disadvantages.',
      '*   **Internet Technologies:** WWW, e-communications, web browsers, search techniques.',
      '*   **Information Management:** Data vs. information, task analysis, data sources.',
      '*   **Social Implications:** Legal, ethical, security, and environmental issues.',
      '*   **Solution Development:** Using application packages (Word, Excel, Access, HTML) to solve problems.',
      '',
      '**Cognitive Levels Weighting (Theory Paper):**',
      '*   Level 1: Remembering: 15%',
      '*   Level 2: Understanding: 30%',
      '*   Level 3: Applying: 30%',
      '*   Level 4: Analyzing & Evaluating: 25%',
    ].join('\n'),
  },
  "Consumer Studies": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Consumer Studies (South Africa)**',
      '',
      '**Question Paper (200 marks):**',
      '*   **The Consumer (32 marks):** Consumer rights and responsibilities, legislation (e.g., CPA), financial management.',
      '*   **Food and Nutrition (80 marks):** Meal planning, food-borne diseases, food safety, food security.',
      '*   **Clothing (24 marks):** Fashion, consumer choices, textiles.',
      '*   **Housing (24 marks):** Factors influencing housing choices, contracts, financing.',
      '*   **Entrepreneurship (40 marks):** Production planning, marketing, business plan.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Level 1: Remembering/Knowledge: 30%',
      '*   Level 2: Understanding/Comprehension: 40%',
      '*   Level 3: Applying, Analysing, Evaluating, Creating: 30%',
    ].join('\n'),
  },
  "Creative Arts": {
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Creative Arts (South Africa)**',
      '',
      'Creative Arts is divided into four main disciplines, with content covered throughout the year.',
      '',
      '**1. Visual Arts:**',
      '*   **Art Elements & Design Principles:** Focus on line, shape, texture, color; and principles like balance, contrast, and proportion.',
      '*   **Create in 2D:** Drawing, painting, and printmaking skills.',
      '*   **Create in 3D:** Construction and modeling with various materials.',
      '*   **Visual Literacy:** Analyze and interpret artworks and visual media.',
      '',
      '**2. Drama:**',
      '*   **Vocal & Physical Development:** Warm-up exercises, voice projection, posture, gesture.',
      '*   **Improvisation & Performance:** Create short scenes, develop characters, and perform for an audience.',
      '*   **Appreciation & Reflection:** Critically reflect on own and others\' performances.',
      '',
      '**3. Music:**',
      '*   **Music Literacy:** Reading and writing basic notation (pitch and rhythm).',
      '*   **Listening Skills:** Identify instruments, genres, and moods in music.',
      '*   **Performing:** Singing or playing instruments in a group, focusing on rhythm and pitch.',
      '',
      '**4. Dance:**',
      '*   **Physical Skills:** Warm-up, coordination, balance, and control.',
      '*   **Composition:** Create short dance sequences using different elements of dance (space, time, energy).',
      '*   **Rhythm & Musicality:** Move in time with music.',
    ].join('\n')
  },
  "Dramatic Arts": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Dramatic Arts (South Africa)**',
      '',
      '**Written Paper (150 marks):**',
      '*   **South African Theatre History:** Focus on key periods and practitioners (e.g., Workshop Theatre, Protest Theatre).',
      '*   **Play Texts Analysis:** In-depth study of prescribed plays, understanding themes, characters, structure, and context.',
      '*   **Theatre Theory & Practice:** Concepts like Realism, Expressionism, Absurdism; roles of director, designer, actor.',
      '*   **Contemporary Theatre:** Analysis of unseen theatre reviews and performance texts.',
      '',
      '**Cognitive Levels Weighting (Written Paper):**',
      '*   Level 1: Knowledge & Comprehension: 40%',
      '*   Level 2: Application & Analysis: 40%',
      '*   Level 3: Synthesis & Evaluation: 20%',
    ].join('\n'),
  },
  "Economic and Management Sciences": {
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Economic and Management Sciences (EMS) (South Africa)**',
      '',
      '**Term 1: The Economy**',
      '*   History of money, bartering.',
      '*   Needs and wants, goods and services.',
      '*   The production process (factors of production).',
      '',
      '**Term 2: Entrepreneurship**',
      '*   The entrepreneur, characteristics and skills.',
      '*   Starting a business, business plan basics.',
      '*   Forms of ownership (sole trader).',
      '',
      '**Term 3: Financial Literacy**',
      '*   Income and expenses (personal).',
      '*   Budgets (personal).',
      '*   Saving and the role of banks.',
      '',
      '**Term 4: The Economy**',
      '*   Inequality and poverty.',
      '*   The circular flow (simplified).',
      '',
      '**Cognitive Levels:** Emphasis on knowledge, comprehension, and basic application.',
    ].join('\n')
  },
  "Economics": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Economics (South Africa)**',
      '',
      '**Paper 1: Macroeconomics & Economic Pursuits (150 marks)**',
      '*   **Macroeconomics:** Circular flow model, business cycles, the public sector, foreign exchange markets.',
      '*   **Economic Pursuits:** Protectionism and free trade, economic growth and development.',
      '',
      '**Paper 2: Microeconomics & Economic Pursuits (150 marks)**',
      '*   **Microeconomics:** Perfect markets, imperfect markets (monopoly, oligopoly, monopolistic competition), market failure.',
      '*   **Economic Pursuits:** Inflation, tourism, environmental sustainability.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Level 1: Remembering/Knowledge (Lower Order): 30%',
      '*   Level 2: Understanding/Applying (Middle Order): 50%',
      '*   Level 3: Analysing/Evaluating/Creating (Higher Order): 20%',
    ].join('\n'),
  },
  "Engineering Graphics and Design": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Engineering Graphics and Design (EGD) (South Africa)**',
      '',
      '**Paper 1 (200 marks):**',
      '*   **Civil Drawing:** Detailed drawings of civil structures, including sectional views.',
      '*   **Mechanical Drawing:** Detailed assembly drawings, including sectional views.',
      '*   **Electrical Technology Drawing:** Circuit diagrams.',
      '',
      '**Paper 2 (200 marks):**',
      '*   **Orthographic Projection:** First and third angle projections.',
      '*   **Loci:** Locus of a point on a mechanism.',
      '*   **Interpenetration & Development:** Intersection of solids.',
      '*   **Isometric Drawing.**',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Level 1: Knowledge: 20%',
      '*   Level 2: Comprehension: 30%',
      '*   Level 3-4: Application, Analysis, Synthesis, Evaluation: 50%',
    ].join('\n'),
  },
  "English Home Language": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 English Home Language (South Africa)**',
      '',
      '**Paper 1: Language in Context (70 marks)**',
      '*   **Section A: Comprehension (30 marks):** Understanding and analysis of a written text. Questions test literal, reorganisational, inferential, and evaluative comprehension.',
      '*   **Section B: Summary (10 marks):** Ability to identify main points and synthesise them into a coherent paragraph.',
      '*   **Section C: Language Structures and Conventions (30 marks):** Application of language rules, analysis of advertising, cartoons, and editing skills.',
      '',
      '**Paper 2: Literature (80 marks)**',
      '*   **Section A: Poetry (30 marks):** Analysis of prescribed poems (essay and contextual questions). Unseen poem analysis.',
      '*   **Section B: Novel (25 marks):** Essay or contextual questions on the prescribed novel.',
      '*   **Section C: Drama (25 marks):** Essay or contextual questions on the prescribed drama.',
      '',
      '**Cognitive Levels (Paper 1):**',
      '*   Level 1 & 2 (Literal, Reorganisation): 40%',
      '*   Level 3 (Inference): 40%',
      '*   Level 4 (Evaluation, Appreciation): 20%',
      '',
      '**Cognitive Levels (Paper 2):**',
      '*   Level 1 & 2 (Kennis, Begrip): 40%',
      '*   Level 3 (Toepassing, Analise): 40%',
      '*   Level 4 (Sintese, Evaluering): 20%',
    ].join('\n'),
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 English Home Language (South Africa) - Senior Phase**',
      '',
      'Focus areas are integrated across four main skills:',
      '',
      '**1. Listening & Speaking:**',
      '*   Listen for specific information, identify main ideas, and respond critically.',
      '*   Participate in discussions, deliver prepared speeches, and use appropriate language.',
      '',
      '**2. Reading & Viewing:**',
      '*   Read a variety of texts for comprehension (literal, inferential, evaluative).',
      '*   Study of a novel/drama and poetry: analyze character, theme, plot, and literary devices.',
      '*   Analyze visual texts like advertisements and cartoons.',
      '',
      '**3. Writing & Presenting:**',
      '*   Write narrative, descriptive, and argumentative essays.',
      '*   Write transactional texts (e.g., letters, emails, reports, reviews).',
      '*   Follow the writing process: planning, drafting, revising, editing, proofreading.',
      '',
      '**4. Language Structures & Conventions:**',
      '*   Apply knowledge of grammar, spelling, and punctuation in context.',
      '*   Vocabulary development and understanding parts of speech, sentence structure, and figures of speech.',
      '',
      '**Cognitive Levels (General):**',
      '*   Literal (Knowledge, Remembering): 30%',
      '*   Reorganisation (Comprehension): 20%',
      '*   Inference (Application, Analysis): 30%',
      '*   Evaluation & Appreciation (Synthesis, Evaluation): 20%',
    ].join('\n'),
  },
  "Geography": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Geography (South Africa)**',
      '',
      '**Paper 1: Physical Geography (150 marks)**',
      '*   **Climate and Weather (60 marks):** Mid-latitude cyclones, tropical cyclones, valley climates, urban climates.',
      '*   **Geomorphology (60 marks):** Drainage systems in SA, fluvial processes, catchment and river management.',
      '*   **Mapwork (30 marks):** Map interpretation and calculations.',
      '',
      '**Paper 2: Human Geography (150 marks)**',
      '*   **Settlement Geography (60 marks):** Rural and urban settlements, urban hierarchies, urban structure and issues.',
      '*   **Economic Geography of SA (60 marks):** Primary, secondary, tertiary sectors, industrial regions, informal sector.',
      '*   **Mapwork (30 marks):** Map interpretation and calculations.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Lower Order (Knowledge): 20%',
      '*   Middle Order (Comprehension, Application): 50%',
      '*   Higher Order (Analysis, Synthesis, Evaluation): 30%',
    ].join('\n'),
  },
  "History": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 History (South Africa)**',
      '',
      '**Paper 1: Source-Based (150 marks)**',
      '*   **The Cold War:** Origins, case study (e.g., Vietnam), end of the Cold War.',
      '*   **Independent Africa:** Case study on challenges (e.g., Tanzania, Congo).',
      '*   **Civil Society Protests 1950s to 1970s:** US Civil Rights Movement, Anti-Apartheid Movement.',
      '',
      '**Paper 2: Essay (150 marks)**',
      '*   **Civil Resistance in SA 1970s to 1980s:** Black Consciousness, Soweto Uprising, Trade Unions.',
      '*   **The Coming of Democracy in SA (1990-1994):** Release of Mandela, negotiations, democratic election.',
      '*   **The End of the Cold War and a New World Order.**',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Level 1 (Extracting evidence): 20%',
      '*   Level 2 (Explanation, analysis): 40%',
      '*   Level 3 (Interpretation, evaluation, synthesis): 40%',
    ].join('\n'),
  },
  "Information Technology": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Information Technology (IT) (South Africa)**',
      '',
      '**Paper 1: Theory (150 marks)**',
      '*   **Systems Technologies:** Hardware, software, virtualization.',
      '*   **Communication & Network Technologies:** Network concepts, security.',
      '*   **Data & Information Management:** Databases, SQL, data warehousing.',
      '*   **Solution Development:** Algorithm design, programming principles (using Java/Delphi).',
      '*   **Social & Ethical Implications:** E-commerce, AI, legal and ethical issues.',
      '',
      '**Paper 2: Practical (150 marks)**',
      '*   **Problem Solving using Programming Language (Java/Delphi):** Application of algorithms, data structures (arrays, records/objects), file handling, database connectivity.',
      '',
      '**Cognitive Levels Weighting (Theory):**',
      '*   Remembering/Understanding: 45%',
      '*   Applying: 30%',
      '*   Analyzing/Evaluating/Creating: 25%',
    ].join('\n'),
  },
  "Life Orientation": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Life Orientation (South Africa)**',
      '',
      '**Common Assessment Task (CAT) & Final Exam:**',
      '*   **Development of the self in society:** Life skills, managing stress, conflict resolution.',
      '*   **Social and environmental responsibility:** Social issues, environmental justice.',
      '*   **Democracy and human rights:** Responsible citizenship, dealing with discrimination.',
      '*   **Careers and career choices:** Post-school destinations, financing, career trends.',
      '*   **Study skills:** Goal setting, time management, exam writing skills.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Low Order (Knowledge, comprehension): 30%',
      '*   Middle Order (Application, analysis): 40%',
      '*   High Order (Synthesis, evaluation): 30%',
    ].join('\n'),
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Life Orientation (South Africa)**',
      '',
      '**Key Topics:**',
      '*   **Development of the Self in Society:** Self-image, peer pressure, relationships.',
      '*   **Health, Social and Environmental Responsibility:** Substance abuse, environmental health, safety.',
      '*   **Constitutional Rights and Responsibilities:** Human rights, diversity, discrimination.',
      '*   **World of Work:** Career fields, subject choices, lifelong learning.',
      '*   **Physical Education:** Participation in fitness and sport activities.',
      '',
      'Assessment is continuous and includes tasks, projects, and participation in physical education.',
    ].join('\n'),
  },
  "Life Sciences": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Life Sciences (South Africa)**',
      '',
      'This document outlines the examinable content for the final Grade 12 examination.',
      '',
      '**Paper 1 Topics (Responding to the Environment & Human Reproduction):**',
      '*   **Responding to the Environment (Humans):** Central nervous system, peripheral nervous system, autonomic nervous system, receptors (eye, ear), and endocrine system (hormones, homeostasis).',
      '*   **Human Reproduction:** Male and female reproductive systems, puberty, gametogenesis, menstrual cycle, fertilization, gestation, and contraception.',
      '',
      '**Paper 2 Topics (Genetics, Evolution & Environmental Studies):**',
      '*   **DNA: The Code of Life:** Structure of DNA and RNA, DNA replication, protein synthesis.',
      '*   **Meiosis:** Process of meiosis, importance, and abnormalities.',
      '*   **Genetics and Inheritance:** Mendel\'s principles, monohybrid and dihybrid crosses, types of dominance, blood groups, sex determination, and genetic disorders.',
      '*   **Evolution:** Theories of evolution (Lamarck, Darwin), natural selection, punctuated equilibrium, speciation, and human evolution.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Remembering/Knowledge (Level 1): 40%',
      '*   Understanding/Comprehension (Level 2): 25%',
      '*   Application/Analysis (Level 3): 20%',
      '*   Evaluation/Synthesis (Level 4): 15%',
    ].join('\n'),
  },
  "Mathematics": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Mathematics (South Africa)**',
      '',
      'This document outlines the examinable content for the final Grade 12 examination, which consists of two papers.',
      '',
      '**Paper 1: Algebra, Patterns, Functions & Calculus (150 marks)**',
      '*   **Algebra and Equations (and inequalities) (25 ± 3 marks):** Includes quadratic equations and inequalities, simultaneous equations, nature of roots.',
      '*   **Patterns and Sequences (25 ± 3 marks):** Arithmetic, geometric, and quadratic sequences and series.',
      '*   **Functions and Graphs (35 ± 3 marks):** Linear, quadratic, hyperbolic, exponential, and logarithmic functions. Inverse functions.',
      '*   **Finance, growth, and decay (15 ± 3 marks):** Annuities, sinking funds, loan amortization.',
      '*   **Differential Calculus (35 ± 3 marks):** First principles, rules of differentiation, application to cubic functions, optimization problems.',
      '*   **Probability (15 ± 3 marks):** Fundamental counting principle, permutations, combinations, probability rules.',
      '',
      '**Paper 2: Statistics, Analytical Geometry, Trigonometry & Euclidean Geometry (150 marks)**',
      '*   **Statistics (20 ± 3 marks):** Measures of central tendency and dispersion, regression and correlation, box-and-whisker plots.',
      '*   **Analytical Geometry (40 ± 3 marks):** Equations of lines and circles, properties of geometric figures.',
      '*   **Trigonometry (40 ± 3 marks):** Identities, reduction formulae, compound and double angle formulae, solving trigonometric equations, 2D and 3D problems.',
      '*   **Euclidean Geometry (50 ± 3 marks):** Circle geometry theorems, ratio and proportion, similarity.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Knowledge: 20%',
      '*   Routine procedures: 35%',
      '*   Complex procedures: 30%',
      '*   Problem-solving: 15%',
    ].join('\n'),
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Mathematics (South Africa)**',
      'This outlines the key content areas and their weightings for Grade 7 Mathematics, based on a comprehensive review of the curriculum.',
      '',
      '**Content Area Weightings (for exams):**',
      '*   Numbers, Operations and Relationships: 30%',
      '*   Patterns, Functions and Algebra: 25%',
      '*   Space and Shape (Geometry): 25%',
      '*   Measurement: 10%',
      '*   Data Handling: 10%',
      '',
      '**1. Numbers, Operations and Relationships (30%):**',
      '*   **Whole Numbers:** Revision of place value, all 4 operations. Multiples and factors. Properties of operations (commutative, associative, distributive). Ordering, comparing, and rounding numbers. Prime numbers, HCF, LCM. Financial contexts (profit/loss, budgets, simple interest).',
      '*   **Exponents:** Squares (up to 12²), cubes (up to 6³), and their roots. Representing numbers in exponential form (base, exponent). Order of operations with exponents.',
      '*   **Integers:** Introduction for temperature and finance. Ordering and comparing on a number line. Additive inverses. Adding and subtracting integers.',
      '*   **Common & Decimal Fractions:** All 4 operations with fractions and decimals. Percentages. Equivalent forms and conversions between fractions, decimals, and percentages. Rounding decimals.',
      '',
      '**2. Patterns, Functions and Algebra (25%):**',
      '*   **Numeric and Geometric Patterns:** Investigating and extending patterns with constant difference or constant ratio. Describing rules verbally and algebraically.',
      '*   **Functions & Relationships:** Input/output values using flow diagrams, tables, formulae, and equations. Dependent and independent variables.',
      '*   **Algebraic Expressions:** Interpret rules, identify variables and constants. Expressions with additive inverses.',
      '*   **Algebraic Equations:** Solve simple equations by inspection and trial & improvement. Describe problem situations with equations.',
      '*   **Graphs:** Interpret global graphs of problem situations (linear/non-linear, increasing/decreasing/constant rate of change). Drawing graphs from situations.',
      '',
      '**3. Space and Shape (Geometry) (25%):**',
      '*   **Geometry of Straight Lines:** Line segments, rays, straight lines. Parallel and perpendicular lines.',
      '*   **Construction of Geometric Figures:** Using protractor, compass, ruler to construct angles, circles, and lines.',
      '*   **Geometry of 2D Shapes:** Classifying triangles (equilateral, isosceles, scalene, right-angled) and quadrilaterals (parallelogram, rhombus, kite, rectangle, square, trapezium) by their properties. Circles (radius, diameter, chord). Similar and congruent shapes.',
      '*   **Transformation Geometry:** Translations, reflections, and rotations on a grid. Enlargements and reductions and scale factor.',
      '*   **Geometry of 3D Objects:** Classifying polyhedra vs. objects with curved surfaces. Naming and identifying properties of prisms and pyramids. Using nets for cubes and prisms.',
      '',
      '**4. Measurement (10%):**',
      '*   **Area and Perimeter of 2D Shapes:** Calculating perimeter and area of squares, rectangles, and triangles using formulae. Unit conversions for area (mm², cm², m²).',
      '*   **Surface Area and Volume of 3D Objects:** Calculating surface area and volume of cubes and rectangular prisms using nets and formulae. Capacity (ml, l, kl). Unit conversions for volume and capacity (cm³, m³, ml, l, kl).',
      '',
      '**5. Data Handling (10%):**',
      '*   **Data Handling Cycle:** Collect data (populations/samples, questionnaires), organize (tally tables, stem-and-leaf displays, grouping into intervals), summarize (mean, median, mode, range), and represent data.',
      '*   **Representing Data:** Bar graphs, double bar graphs, histograms, and pie charts.',
      '*   **Interpreting Data:** Critically analyzing data representations, identifying bias and misleading data.',
      '*   **Probability:** Simple experiments, possible vs. actual outcomes, trials, frequency, and relative frequency.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Knowledge: 25%',
      '*   Routine procedures: 45%',
      '*   Complex procedures: 20%',
      '*   Problem-solving: 10%',
    ].join('\n'),
     "Grade 8": [
      '**Curriculum Context: CAPS Grade 8 Mathematics (South Africa)**',
      'This outlines the key content areas and their weightings for Grade 8 Mathematics.',
      '',
      '**Content Area Weightings (for exams):**',
      '*   Numbers, Operations and Relationships: 25%',
      '*   Patterns, Functions and Algebra: 30%',
      '*   Space and Shape (Geometry): 25%',
      '*   Measurement: 10%',
      '*   Data Handling: 10%',
      '',
      '**1. Numbers, Operations and Relationships (25%):**',
      '*   **Whole Numbers:** Revise properties and calculations.',
      '*   **Integers:** All four operations. Squares, cubes, square roots, cube roots of integers.',
      '*   **Exponents:** General laws of exponents (natural number exponents, a^0=1). Scientific notation for positive exponents.',
      '*   **Common & Decimal Fractions:** All four operations including division. Squares, cubes, and their roots. Financial contexts including hire purchase and exchange rates.',
      '',
      '**2. Patterns, Functions and Algebra (30%):**',
      '*   **Numeric and Geometric Patterns:** Investigating and extending patterns, now including algebraic representation of rules.',
      '*   **Functions & Relationships:** Input/output using equations.',
      '*   **Algebraic Expressions:** Expand and simplify expressions, including multiplication of monomials, binomials, and trinomials.',
      '*   **Algebraic Equations:** Solve equations using additive/multiplicative inverses and laws of exponents.',
      '*   **Graphs:** Plot points and draw graphs on the Cartesian plane. Interpret graphs with features like maximum/minimum, discrete/continuous.',
      '',
      '**3. Space and Shape (Geometry) (25%):**',
      '*   **Geometry of 2D Shapes:** Write clear definitions of triangles and quadrilaterals. Properties of congruent and similar shapes.',
      '*   **Geometry of 3D Objects:** Describe and compare the 5 Platonic solids. Use nets for prisms and pyramids.',
      '*   **Geometry of Straight Lines:** Angle relationships (perpendicular, intersecting, parallel lines cut by transversal). Solve geometric problems.',
      '*   **The Theorem of Pythagoras:** Develop and use the theorem to find missing lengths in right-angled triangles.',
      '*   **Transformation Geometry:** Transformations with points and triangles on the co-ordinate plane (reflection, translation, rotation).',
      '',
      '**4. Measurement (10%):**',
      '*   **Area and Perimeter of 2D Shapes:** Circles (circumference and area). Decomposing polygons into rectangles/triangles. Understanding Pi (π).',
      '*   **Surface Area and Volume of 3D Objects:** Triangular prisms.',
      '',
      '**5. Data Handling (10%):**',
      '*   **Data Handling Cycle:** Summarize data using measures of central tendency and dispersion (range, extremes). Represent data including histograms with own intervals and broken-line graphs.',
      '*   **Probability:** Relative frequency and probability.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Knowledge: 25%',
      '*   Routine procedures: 45%',
      '*   Complex procedures: 20%',
      '*   Problem-solving: 10%',
    ].join('\n'),
    "Grade 9": [
      '**Curriculum Context: CAPS Grade 9 Mathematics (South Africa)**',
      'This outlines the key content areas and their weightings for Grade 9 Mathematics.',
      '',
      '**Content Area Weightings (for exams):**',
      '*   Numbers, Operations and Relationships: 15%',
      '*   Patterns, Functions and Algebra: 35%',
      '*   Space and Shape (Geometry): 30%',
      '*   Measurement: 10%',
      '*   Data Handling: 10%',
      '',
      '**1. Numbers, Operations and Relationships (15%):**',
      '*   **Numbers:** Describe the real number system (natural, whole, integers, rational, irrational numbers).',
      '*   **Exponents:** Extend laws of exponents to include integer exponents. Scientific notation for large and small numbers.',
      '*   **Financial Contexts:** Solve problems involving direct and indirect proportion, and compound interest.',
      '',
      '**2. Patterns, Functions and Algebra (35%):**',
      '*   **Numeric and Geometric Patterns:** Describe and justify general rules algebraically.',
      '*   **Functions & Relationships:** Equivalent forms including graphs on a Cartesian plane.',
      '*   **Algebraic Expressions:** Factorize algebraic expressions (common factors, difference of two squares, trinomials). Simplify algebraic fractions using factorization.',
      '*   **Algebraic Equations:** Solve equations using factorization, and equations of the form: a product of factors = 0. Solve linear inequalities.',
      '*   **Graphs:** Draw and interpret linear graphs from given equations. Determine equations from given linear graphs. Features include x- and y-intercepts and gradient.',
      '',
      '**3. Space and Shape (Geometry) (30%):**',
      '*   **Geometry of 2D Shapes:** Establish minimum conditions for congruent and similar triangles. Solve problems using properties.',
      '*   **Geometry of 3D Objects:** Properties of spheres and cylinders. Use nets for cylinders.',
      '*   **Geometry of Straight Lines:** Revise and solve problems.',
      '*   **Transformation Geometry:** Transformations on a co-ordinate plane including reflection in the line y = x. Investigate co-ordinates of vertices of enlarged/reduced figures.',
      '*   **Construction of Geometric Figures:** Investigate properties of figures by construction (e.g., exterior angle of a triangle).',
      '',
      '**4. Measurement (10%):**',
      '*   **Area and Perimeter of 2D Shapes:** Solve problems and investigate how doubling dimensions affects perimeter and area.',
      '*   **Surface Area and Volume of 3D Objects:** Cylinders. Investigate how doubling dimensions affects volume.',
      '*   **The Theorem of Pythagoras:** Solve problems involving unknown lengths in figures containing right-angled triangles.',
      '',
      '**5. Data Handling (10%):**',
      '*   **Data Handling Cycle:** Organize data according to more than one criteria. Summarize data including extremes and outliers. Represent data including scatter plots.',
      '*   **Probability:** Determine probabilities for compound events using two-way tables and tree diagrams.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Knowledge: 25%',
      '*   Routine procedures: 45%',
      '*   Complex procedures: 20%',
      '*   Problem-solving: 10%',
    ].join('\n'),
  },
  "Mathematical Literacy": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Mathematical Literacy (South Africa)**',
      '',
      '**Paper 1: Basic Skills (150 marks)**',
      '*   **Finance:** Financial documents, tariff systems, inflation, interest, banking, exchange rates.',
      '*   **Measurement:** Conversion, calculating perimeter, area, volume, time.',
      '*   **Maps, plans, and other representations:** Scale, map work, floor plans.',
      '*   **Data Handling:** Collecting, organizing, representing, and interpreting data.',
      '*   **Probability:** Basic probability concepts.',
      '',
      '**Paper 2: Applications (150 marks)**',
      'This paper involves the application of the skills from Paper 1 in more complex, integrated, and real-world scenarios.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Knowing: 30%',
      '*   Applying routine procedures: 30%',
      '*   Applying multi-step procedures: 20%',
      '*   Reasoning and reflecting: 20%',
    ].join('\n'),
  },
  "Music": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Music (South Africa)**',
      '',
      '**Written Paper (150 marks):**',
      '*   **Music Theory & Analysis (Rudiments, Harmony):** Scales, chords, cadences, four-part writing (SATB). Analysis of unseen musical scores.',
      '*   **General Music Knowledge (Western, Jazz/Popular, South African):** Analysis of prescribed works, understanding historical context, form, and style.',
      '*   **Aural Skills:** Dictation (rhythmic, melodic), chord recognition.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Knowledge & Comprehension: 40%',
      '*   Application & Analysis: 40%',
      '*   Synthesis & Evaluation: 20%',
    ].join('\n'),
  },
  "Natural Sciences": {
    "Grade 7": [
        '**Curriculum Context: CAPS Grade 7 Natural Sciences (South Africa)**',
        '',
        'This context provides a term-by-term breakdown and assessment guidelines based on the official CAPS document.',
        '',
        '**Term-by-Term Content Strands:**',
        '*   **Term 1: Life and Living (9 weeks):** The Biosphere, Biodiversity, Sexual Reproduction in Angiosperms & Humans, Variation.',
        '*   **Term 2: Matter and Materials (8 weeks):** Properties of materials, Separating mixtures, Acids/Bases/Neutrals, Introduction to the Periodic Table.',
        '*   **Term 3: Energy and Change (9 weeks):** Sources of energy, Potential and kinetic energy, Heat transfer (conduction, convection, radiation), Insulation, Energy transfer, National electricity supply system.',
        '*   **Term 4: Planet Earth and Beyond (8 weeks):** Relationship of the Sun to Earth (seasons), Relationship of the Moon to Earth (tides, gravity), Historical development of astronomy.',
        '',
        '**Assessment Guidelines for Question Papers:**',
        '*   **Class Tests (e.g., 60 marks):** Should cover the work of a term.',
        '*   **Term Exams (e.g., 80-100 marks):** Term 2 exam covers Term 1 & 2 work. Term 4 exam covers Term 3 & 4 work.',
        '*   **Final Exams (e.g., 150 marks):** Covers the entire year\'s work, split into two papers if necessary.',
        '*   **Cognitive Level Weighting:**',
        '    - Low Order (Knowing Science - definitions, labels): 40%',
        '    - Middle Order (Understanding & Applying - explanations, calculations, comparisons): 45%',
        '    - High Order (Evaluating, Analyzing, Synthesizing - analyzing data, designing investigations, making conclusions): 15%',
        '*   **Common Question Types:** Multiple choice, matching columns, terminology definitions, case studies, data interpretation (tables/graphs), drawing/labeling diagrams, designing investigations.',
    ].join('\n'),
    "Grade 8": [
        '**Curriculum Context: CAPS Grade 8 Natural Sciences (South Africa)**',
        '',
        'This context provides a term-by-term breakdown and assessment guidelines based on the official CAPS document.',
        '',
        '**Term-by-Term Content Strands:**',
        '*   **Term 1: Life and Living (9 weeks):** Photosynthesis and respiration, Interactions and interdependence within the environment (food webs, ecosystems), Micro-organisms.',
        '*   **Term 2: Matter and Materials (8 weeks):** Atoms, Particle model of matter, Chemical reactions.',
        '*   **Term 3: Energy and Change (9 weeks):** Static electricity, Energy transfer in electrical systems, Series and parallel circuits, Visible light (spectrum, absorption, reflection, refraction).',
        '*   **Term 4: Planet Earth and Beyond (8 weeks):** The Solar System, Beyond the Solar System (galaxies, stars), Looking into space (telescopes).',
        '',
        '**Assessment Guidelines for Question Papers:**',
        '*   **Structure:** Follows the same principles as Grade 7.',
        '*   **Cognitive Level Weighting:**',
        '    - Low Order (Knowing Science): 40%',
        '    - Middle Order (Understanding & Applying): 45%',
        '    - High Order (Evaluating, Analyzing, Synthesizing): 15%',
    ].join('\n'),
    "Grade 9": [
        '**Curriculum Context: CAPS Grade 9 Natural Sciences (South Africa)**',
        '',
        'This context provides a term-by-term breakdown and assessment guidelines based on the official CAPS document.',
        '',
        '**Term-by-Term Content Strands:**',
        '*   **Term 1: Life and Living (9 weeks):** Cells as the basic units of life, Systems in the human body (circulatory, respiratory, musculoskeletal, excretory, nervous, reproductive).',
        '*   **Term 2: Matter and Materials (8 weeks):** Compounds (Periodic Table review), Chemical reactions, Reactions of acids with metals, metal oxides, metal hydroxides, and metal carbonates (Parts I, II, III).',
        '*   **Term 3: Energy and Change (9 weeks):** Forces, Electric cells as energy systems, Resistance, Series and parallel circuits.',
        '*   **Term 4: Planet Earth and Beyond (8 weeks):** The Earth as a system, Lithosphere (rock cycle), Mining of mineral resources, Atmosphere, The greenhouse effect, Birth, life and death of stars.',
        '',
        '**Assessment Guidelines for Question Papers:**',
        '*   **Structure:** Follows the same principles as Grade 7 & 8.',
        '*   **Cognitive Level Weighting:**',
        '    - Low Order (Knowing Science): 40%',
        '    - Middle Order (Understanding & Applying): 45%',
        '    - High Order (Evaluating, Analyzing, Synthesizing): 15%',
    ].join('\n'),
  },
  "Physical Sciences": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Physical Sciences (South Africa)**',
      '',
      'This document outlines the examinable content for the final Grade 12 examination.',
      '',
      '**Paper 1: Physics (150 marks)**',
      '*   **Mechanics (63 marks):** Newton\'s Laws (including momentum, impulse), Work-Energy-Power, Doppler Effect.',
      '*   **Waves, Sound and Light (17 marks):**',
      '*   **Electricity and Magnetism (55 marks):** Electrostatics, Electric Circuits (Ohm\'s Law), Electrodynamics (motors, generators), Photoelectric effect.',
      '*   **Matter and Materials (15 marks):**',
      '',
      '**Paper 2: Chemistry (150 marks)**',
      '*   **Chemical Change (84 marks):** Rates of reaction, Chemical equilibrium, Acids and bases, Electrochemical reactions (Galvanic and Electrolytic cells).',
      '*   **Chemical Systems (18 marks):**',
      '*   **Matter and Materials (48 marks):** Organic chemistry (nomenclature, physical properties, reactions), plastics and polymers.',
      '',
      '**Cognitive Levels Weighting (Both Papers):**',
      '*   Remembering/Knowledge (Level 1): 15%',
      '*   Understanding/Comprehension (Level 2): 35%',
      '*   Applying/Analyzing (Level 3): 40%',
      '*   Evaluating/Creating (Level 4): 10%',
      '',
      '**Required LaTeX Formatting for Mathematical Expressions:**',
      '- Inline math must be enclosed in `\\(...\\)`. Example: `The formula is \\(E=mc^2\\).`',
      '- Block math (for standalone equations) must be enclosed in `\\[...\\]`. Example: `\\[F_{net} = ma\\]`',
      '- Use standard LaTeX commands like `\\frac{...}{...}` for fractions, `^{...}` for superscripts, `_{...}` for subscripts, `\\times` for multiplication, `\\cdot` for dot product, `\\circ` for degrees.',
      '- Chemical formulas should use subscripts, e.g., `H_{2}O`.',
      '- Vector notation: Use `\\vec{F}` for vector F.',
      '- Equilibrium arrows: Use `\\rightleftharpoons`.',
    ].join('\n'),
  },
  "Social Sciences": {
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Social Sciences (South Africa)**',
      '',
      'Social Sciences consists of two separate disciplines: History and Geography.',
      '',
      '**History:**',
      '*   **The Kingdom of Mali and the city of Timbuktu:** Society, culture, and trade in the 14th century.',
      '*   **The Trans-Saharan Trade:** Routes, goods (gold, salt), and impact.',
      '*   **The Renaissance in Europe:** Changes in art, science, and thinking.',
      '*   **European exploration and conquest:** Focus on the 15th to 17th centuries, including the Age of Discovery.',
      '',
      '**Geography:**',
      '*   **Map Skills (focus on Africa):** Latitude, longitude, scale, and calculating distance.',
      '*   **Volcanoes, Earthquakes, and Floods:** Causes, effects, and human responses.',
      '*   **Population Growth and Change:** Factors influencing population size and density.',
      '',
      'Assessment involves source-based analysis, paragraph writing (History), and map interpretation (Geography).',
    ].join('\n'),
  },
  "Technology": {
    "Grade 7": [
      '**Curriculum Context: CAPS Grade 7 Technology (South Africa)**',
      '',
      '**Key Knowledge Areas:**',
      '*   **Design Skills:** The design process (Investigate, Design, Make, Evaluate, Communicate).',
      '*   **Structures:** Frame structures, forces (tension, compression), strengthening techniques.',
      '*   **Mechanical Systems and Control:** Simple mechanisms (levers, gears, pulleys).',
      '*   **Electrical Systems and Control:** Simple circuits, components (cells, switches, bulbs), conductors and insulators.',
      '*   **Processing:** Properties of materials (plastics, wood, metals), processing techniques.',
      '',
      'The curriculum is project-based, requiring learners to solve practical problems by creating solutions.',
    ].join('\n'),
  },
  "Visual Arts": {
    "Grade 12": [
      '**Curriculum Context: CAPS Grade 12 Visual Arts (South Africa)**',
      '',
      '**Written Paper (100 marks):**',
      '*   **Visual Literacy:** Analysis of unseen visual sources (artworks, design, media).',
      '*   **Art History & Theory:** In-depth study of prescribed artists and art movements, focusing on thematic links. Examples include \'The Voice of the Land\', \'The Body Politic\', etc.',
      '*   **South African Art Context:** Understanding key South African artists and their socio-political contexts.',
      '',
      '**Cognitive Levels Weighting:**',
      '*   Identifying & Describing: 30%',
      '*   Analyzing & Interpreting: 40%',
      '*   Evaluating & Synthesizing: 30%',
    ].join('\n'),
  },
};

const getCurriculumContext = (subject: string, grade: string): string => {
  const subjectContexts = curriculumContexts[subject as keyof typeof curriculumContexts];
  
  if (typeof subjectContexts === 'object' && subjectContexts !== null) {
    const gradeContext = subjectContexts[grade as keyof typeof subjectContexts];
    if (gradeContext) {
      return gradeContext;
    }
  }

  return `No specific curriculum context found for ${subject} at ${grade}. Please generate content based on general educational principles for the specified grade.`;
};

export const generateLesson = async (inputs: UserInputs): Promise<Omit<LessonData, 'id' | 'type'>> => {
  const curriculumContext = getCurriculumContext(inputs.subject, inputs.grade);
  const prompt = `
    You are an expert instructional designer for South African schools. Your task is to generate a comprehensive, ready-to-use lesson package based on the provided curriculum goals.

    **CRITICAL INSTRUCTIONS:**
    1.  **Adherence:** Strictly adhere to the provided curriculum standard (${inputs.standard}), grade level (${inputs.grade}), and subject (${inputs.subject}).
    2.  **Schema Compliance:** Your entire response MUST be a single, valid JSON object that strictly conforms to the provided schema. Do not output any text or markdown outside of this JSON object.
    3.  **Content Quality:** All generated content must be pedagogically sound, engaging, and age-appropriate.
    4.  **LaTeX for Math:** For any subject involving mathematics or formulas (especially Physical Sciences and Mathematics), all mathematical notation in ANY field (titles, content, questions, answers, etc.) MUST be enclosed in LaTeX delimiters. This is a non-negotiable rule. Use \\(...\\) for inline math and \\[...\\] for block equations. This applies to everything from complex equations to simple notations like superscripts (e.g., must be \`\\(2^{nd}\\)\`, not \`2^nd\`), subscripts, and symbols. Strictly follow standard LaTeX syntax (e.g., \\frac, ^, _, \\times).
    5.  **Diagram Generation:**
        - If 'generateDiagram' is true, you MUST provide both a 'diagramDescription' and corresponding 'diagramLabels' and/or 'arrows' in the worksheet object.
        - The 'diagramDescription' is CRITICAL. It must be a PURELY VISUAL AND GEOMETRIC description for an AI image model. Describe ONLY the base shapes, lines, objects, and their arrangement. DO NOT include any text, letters, numbers, or arrows in this description. All text/arrows are handled by other fields. End the description with the explicit instruction: 'Do NOT add any text, numbers, labels, or arrows to the image.'
        - 'diagramLabels' and 'arrows' must contain the textual and vector information to be overlaid on the generated image. Ensure label positions are logical and avoid overlap.
    6.  **Chart Generation:** If 'includeChart' is true and the topic is suitable for data visualization (e.g., Economics, Science), generate relevant 'chartData'. Otherwise, omit this field.
    7.  **Mismatch Handling:** If the user's curriculum goals are clearly inappropriate for the specified subject or grade (e.g., 'Calculus' for 'Grade 9 English'), set 'mismatch' to true and provide a clear 'mismatchReason'. In this case, you do not need to generate the rest of the lesson content.
    8.  **Comprehensive Content:** Pay close attention to the descriptions in the schema. They demand highly detailed and comprehensive content for fields like 'lessonPlan.content', 'slides.speakerNotes', and 'notes'. Fulfill these requirements diligently.

    **Curriculum Context for ${inputs.subject} (${inputs.grade}):**
    ${curriculumContext}

    **User's Request:**
    -   **Goals:** ${inputs.goals}
    -   **Generate Diagram:** ${inputs.generateDiagram}
    -   **Include Chart:** ${inputs.includeChart}
    
    Now, generate the complete lesson package as a single JSON object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: lessonResponseSchema,
    },
  });

  const jsonString = response.text.trim();
  const parsedJson = JSON.parse(jsonString);

  if (parsedJson.mismatch) {
    throw new Error(parsedJson.mismatchReason || "The provided topic does not match the selected subject or grade.");
  }

  // After parsing, clean any LaTeX errors that might have been generated.
  const cleanedData = cleanLatexInObject(parsedJson);

  // Generate the image if a description is available
  if (inputs.generateDiagram && cleanedData.worksheet?.diagramDescription) {
    try {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: cleanedData.worksheet.diagramDescription }] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          cleanedData.worksheet.generatedImage = {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    } catch (imageError) {
      console.error("Error generating diagram image:", imageError);
      // Don't throw an error, just proceed without the image. The rest of the content is still valuable.
    }
  }

  return cleanedData as Omit<LessonData, 'id' | 'type'>;
};

export const regenerateDiagramImage = async (base64ImageData: string, prompt: string): Promise<{ data: string; mimeType: string; }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: 'image/png', // Assume PNG for simplicity, could be derived if needed
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }

  throw new Error("The AI did not return a new image. Please try a different prompt.");
};


const questionPaperResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A formal title for the question paper, e.g., 'Grade 12 Physical Sciences: Term 3 Examination'." },
    instructions: { 
        type: Type.ARRAY, 
        description: "A list of standard examination instructions for the student.",
        items: { type: Type.STRING }
    },
    questions: {
      type: Type.ARRAY,
      description: "An array of exam questions. Questions must be structured with clear question numbers (e.g., '1.1', '1.2', '2.1.1'). Include a mix of cognitive levels based on the curriculum context. Question numbers should be sequential and logical. Include section headings as questions with a mark allocation of 0, e.g., {'questionNumber': 'QUESTION 1', 'questionText': 'Multiple Choice Questions', 'markAllocation': 0, 'answer': ''}. The AI must be able to generate markdown tables inside the questionText field.",
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.STRING, description: "The unique number for the question (e.g., '1.1', '2.3.1')." },
          questionText: { type: Type.STRING, description: "The full text of the question. For questions requiring structured data, use standard markdown tables. All mathematical and chemical notation MUST use LaTeX formatting." },
          markAllocation: { type: Type.NUMBER, description: "The number of marks allocated to this question." },
          answer: { type: Type.STRING, description: "A detailed, step-by-step answer for the memorandum. All mathematical working and chemical formulas MUST use LaTeX formatting. For calculation questions, show the formula, substitution, and final answer with units." },
          bloomTaxonomyLevel: { type: Type.STRING, description: "The cognitive level from Bloom's Taxonomy (e.g., 'Remembering', 'Understanding', 'Applying', 'Analyzing')." },
        },
        required: ["questionNumber", "questionText", "markAllocation", "answer", "bloomTaxonomyLevel"],
      },
    },
     diagramDescription: {
        type: Type.STRING,
        description: "If 'generateDiagram' is true, provide a PURELY VISUAL AND GEOMETRIC description for an AI image model. Describe ONLY shapes, lines, and their arrangement. CRITICAL: Do NOT include any text, letters, numbers, or arrows. All labels/vectors will be handled by other fields. End the description with: 'Do NOT add any text, numbers, labels, or arrows to the image.'"
    },
    diagramLabels: {
      type: Type.ARRAY,
      description: "An array of text labels to overlay on the generated diagram. Ensure positions are logical and do not overlap.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The text of the label. Must use LaTeX for math." },
          x: { type: Type.NUMBER, description: "Horizontal position of the label's center (0-100)." },
          y: { type: Type.NUMBER, description: "Vertical position of the label's center (0-100)." },
        },
        required: ["text", "x", "y"],
      }
    },
    arrows: arrowSchema,
    chartData: {
      type: Type.OBJECT,
      description: "Data for a chart/graph if 'includeChart' is true and relevant.",
      properties: {
        type: { type: Type.STRING, description: "Chart type: 'bar', 'line', or 'pie'." },
        title: { type: Type.STRING, description: "The title of the chart." },
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
        description: { type: Type.STRING, description: "Brief explanation of the chart's relevance." },
      },
    },
  },
  required: ["title", "instructions", "questions"],
};


export const generateQuestionPaper = async (inputs: QuestionPaperInputs): Promise<Omit<QuestionPaperData, 'id' | 'type'>> => {
  const curriculumContext = getCurriculumContext(inputs.subject, inputs.grade);

  const finalExamTopicsInstruction = "all topics for the entire year, weighted appropriately according to the curriculum context provided. The paper must be a comprehensive final examination covering the full year's work.";
  const topicsToCover = inputs.examType === 'Final Exam' ? finalExamTopicsInstruction : inputs.topics;

  const prompt = `
    You are an expert examiner for the South African Department of Basic Education. Your task is to generate a formal, CAPS-aligned question paper and a complete memorandum.

    **CRITICAL INSTRUCTIONS:**
    1.  **Curriculum Alignment:** Strictly adhere to the provided curriculum standard (CAPS), grade level (${inputs.grade}), subject (${inputs.subject}), and the specified topics. The cognitive level weighting and content outlined in the context below are non-negotiable.
    2.  **Schema Compliance:** Your entire response MUST be a single, valid JSON object that strictly conforms to the provided schema. Do not output any text or markdown outside of this JSON object.
    3.  **Question Structure:**
        - Create questions covering the topics: ${topicsToCover}. For a 'Final Exam', this means covering all topics from the curriculum context with appropriate weighting. For a 'Term Exam', ensure topics are appropriate for the term(s) from the context. For a 'Class Test', focus only on the specific topics listed.
        - The sum of 'markAllocation' for all questions in the entire paper MUST EXACTLY equal the user-specified total of ${inputs.totalMarks}. This is a non-negotiable requirement. You must adjust the number and scope of questions to hit this target precisely.
        - Structure the paper logically with sections (e.g., 'QUESTION 1', 'QUESTION 2'). Represent these main headings as question objects with a mark allocation of 0.
        - Use a clear, hierarchical numbering system for sub-questions (e.g., 1.1, 1.1.1, 1.1.2, 1.2).
    4.  **LaTeX for Math & Science:** This is mission-critical. For any subject involving mathematics or formulas (especially Physical Sciences and Mathematics), all mathematical and chemical notation in ANY field (questionText, answer, etc.) MUST be enclosed in LaTeX delimiters. This is a non-negotiable rule. Use \\(...\\) for inline math and \\[...\\] for block equations. This applies to everything from complex equations to simple notations like superscripts (e.g., must be \`\\(2^{nd}\\)\`, not \`2^nd\`), subscripts, and symbols like \`\\(H_{2}O\\)\`. Strictly follow standard LaTeX syntax.
    5.  **Memorandum Quality:** The 'answer' for each question must be detailed and serve as a comprehensive marking guideline. For calculations, this means showing the formula, substitution, and the final answer with correct units.
    6.  **Diagram Generation:**
        - If 'generateDiagram' is true, you MUST provide a 'diagramDescription' and corresponding 'diagramLabels' and/or 'arrows'.
        - The 'diagramDescription' is CRITICAL. It must be a PURELY VISUAL AND GEOMETRIC description for an AI image model. DO NOT include any text, labels, or arrows in the description itself. All such elements are handled by other fields. End the description with the explicit instruction: 'Do NOT add any text, numbers, labels, or arrows to the image.'
    7.  **Chart Generation:** If 'includeChart' is true and relevant, generate 'chartData'. Otherwise, omit the field.

    **Curriculum Context for ${inputs.subject} (${inputs.grade}):**
    ${curriculumContext}

    **User's Request:**
    -   **Topics:** ${topicsToCover}
    -   **Total Marks:** ${inputs.totalMarks}
    -   **Exam Type:** ${inputs.examType}
    -   **Generate Diagram:** ${inputs.generateDiagram}
    -   **Include Chart:** ${inputs.includeChart}

    Now, generate the complete question paper and memorandum as a single JSON object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: questionPaperResponseSchema,
    },
  });

  const jsonString = response.text.trim();
  const parsedJson = JSON.parse(jsonString);

  const cleanedData = cleanLatexInObject(parsedJson);

  if (inputs.generateDiagram && cleanedData.diagramDescription) {
    try {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: cleanedData.diagramDescription }] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          cleanedData.generatedImage = {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    } catch (imageError) {
      console.error("Error generating diagram image for paper:", imageError);
    }
  }

  return cleanedData as Omit<QuestionPaperData, 'id' | 'type'>;
};
