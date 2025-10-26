




import { GoogleGenAI, Type } from "@google/genai";
import type { UserInputs, LessonData, QuestionPaperInputs, QuestionPaperData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
          content: { type: Type.STRING, description: "Detailed description of activities, teaching methods, and resources needed. This should be structured with subheadings like 'Teacher Activities', 'Learner Activities', and 'Resources'." },
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
          speakerNotes: { type: Type.STRING, description: "CRITICAL: Detailed notes for the teacher explaining the content, providing examples, and suggesting questions to ask the class. This should be comprehensive." },
        },
        required: ["title", "keyConcept", "content", "speakerNotes"],
      },
    },
    worksheet: {
      type: Type.OBJECT,
      description: "A worksheet for students with a title, instructions, and a variety of questions organized into sections.",
      properties: {
        title: { type: Type.STRING, description: "The title of the worksheet." },
        instructions: { type: Type.STRING, description: "Clear instructions for the students." },
        sections: {
          type: Type.ARRAY,
          description: "An array of sections, each containing a title and a set of questions.",
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
            description: "A detailed, descriptive prompt for an AI image generation model to create a scientific diagram relevant to the worksheet questions. This prompt MUST explicitly instruct the image model NOT to include any text, labels, or numbers. For example: 'A simple line diagram of a block on a frictionless inclined plane... Do NOT add any text or labels.' Omit this field if no diagram is relevant or requested."
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
  },
  required: ["lessonPlan", "slides", "worksheet"],
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
            .replace(/×/g, '\\times ')
            .replace(/−/g, '-')
            // Interpret middle dot between numbers as a decimal point.
            .replace(/(\d)\s*⋅\s*(\d)/g, '$1.$2')
            .replace(/⋅/g, ' \\cdot ')
            .replace(/→/g, '\\rightarrow ')
            .replace(/°/g, '^{\\circ}')
            .replace(/Δ/g, '\\Delta ')
            .replace(/λ/g, '\\lambda ')
            .replace(/≈/g, '\\approx ')
            .replace(/\f/g, '') // Remove form feed characters

            // === Fix Common Command Typos & Variations ===
            .replace(/\\fract\b/g, '\\frac')
            .replace(/\\sqr\b/g, '\\sqrt')
            .replace(/\brac\b/g, '\\frac')
            .replace(/\\appro/g, '\\approx') // More aggressive replacement for 'approx'
            .replace(/\\mbox/g, '\\text') // Standardize mbox to text for KaTeX

            // === Ensure Commands Have Braces ===
            // Handles commands like \text or \mathrm that should have content in braces.
            .replace(/\\(text|mathrm)\s+([\s\S]+?)(?=\s*\\|\s*$|[{])/g, (match, cmd, content) => `\\${cmd}{${content.trim()}}`)
            // Fix vector notation: \vec F -> \vec{F}
            .replace(/\\vec\s+([a-zA-Z])/g, '\\vec{$1}')

            // === Formatting Numbers and Units ===
            // Standardize multiplication 'x' to \times when it's between numbers/formulas
            .replace(/\s*x\s*(?=\d|\\frac|\()/g, ' \\times ')
            // Fix badly formed scientific notation (e.g., "10 - 34" or "10^ -34")
            .replace(/(\d(?:\.\d+)?)\s*(?:x|\\times)\s*10\s*(-?\d+)/g, '$1 \\times 10^{$2}')
            .replace(/10\^\s*({?(-?\d+)}?)/g, (match, exp, num) => `10^{${num || exp}}`)
            // Fix badly formed unit exponents from spaces (e.g., "s -1")
            .replace(/\b([a-zA-Z]{1,3})\s+(-)?\s*(\d+)\b/g, (match, unit, sign, exponent) => {
                 // Avoid matching trig functions like 'sin 2x'
                if (['sin', 'cos', 'tan', 'log', 'ln'].includes(unit.toLowerCase())) return match;
                return `${unit}^{${sign || ''}${exponent}}`;
            })
            // Fix badly formed unit exponents from carets (e.g., "s^-1")
            .replace(/\b([a-zA-Z]{1,3})\^({?(-?\d+)}?)/g, (match, unit, exp, num) => {
                if (['sin', 'cos', 'tan', 'log', 'ln'].includes(unit.toLowerCase())) return match;
                const finalExp = num || exp;
                return `${unit}^{${finalExp}}`;
            })
            // Fix degree notation variations
            .replace(/(\d+)\s*\^o/g, '$1^{\\circ}')
            .replace(/\\(cos|sin)\^\{?(\d+)\}?\^\{?\\circ\}?/g, '\\$1($2^{\\circ})')
            
            // === Final Cleanup ===
            // Clean up stray \cdots artifacts from incomplete thoughts
            .replace(/([a-zA-Z\d\^\{\}-]+)\s*\\cdots/g, '$1')
            // Clean up stray closing brackets, e.g., "force F\]"
            .replace(/([a-zA-Z0-9])\s*\\\]/g, '$1');
            
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

const curriculumContexts = {
  "Accounting": `
**Curriculum Context: CAPS Grade 12 Accounting (South Africa)**

This document outlines the examinable content for the final Grade 12 examination, which consists of two papers.

**Paper 1: Financial Accounting (150 marks)**
*   **Bank Reconciliations, Creditors Reconciliations, Debtors Age Analysis (35 marks):** Preparing and understanding these financial control processes.
*   **Value-Added Tax (VAT) (20 marks):** Concepts and calculations.
*   **Inventory Systems and Valuation (20 marks):** Periodic vs. perpetual systems; FIFO, weighted average methods.
*   **Fixed/Tangible Assets (25 marks):** Asset disposal, depreciation calculations.
*   **Companies (50 marks):** Unique accounts, concepts, preparation of financial statements (Statement of Comprehensive Income, Statement of Financial Position), and analysis & interpretation of financial data.

**Paper 2: Managerial Accounting & Internal Control (150 marks)**
*   **Cost Accounting (Manufacturing) (50 marks):** Production Cost Statement, concepts of fixed and variable costs.
*   **Budgeting (40 marks):** Debtors' Collection Schedule, Creditors' Payment Schedule, Projected Income Statement, Cash Budget.
*   **Analysis and Interpretation of Financial Information (30 marks):** Includes analysis of cash flow statements.
*   **Internal Control & Ethics (30 marks):** Theory on internal controls, audit reports, and corporate governance.

**Cognitive Levels Weighting (Both Papers):**
*   Remembering/Knowledge: 15%
*   Understanding/Comprehension: 25%
*   Applying: 30%
*   Analysing, Evaluating, Creating: 30%
`,
  "Afrikaans First Additional Language": `
**Curriculum Context: CAPS Grade 12 Afrikaans First Additional Language (South Africa)**

**Vraestel 1: Taal (80 Punte)**
*   **Afdeling A: Leesbegrip (30 Punte):** Begrip van 'n geskrewe teks. Vrae fokus op letterlike, herorganiseerende, inferensiële, en evaluerende begrip.
*   **Afdeling B: Opsomming (10 Punte):** Vermoë om hoofpunte uit 'n teks te identifiseer en in eie woorde op te som.
*   **Afdeling C: Taalstrukture en -konvensies (40 Punte):** Toepassing van taalreels, woordeskat, en sinskonstruksie, dikwels in die konteks van 'n advertensie, spotprent, of teks.

**Vraestel 2: Letterkunde (70 Punte)**
*   **Afdeling A: Gedigte (35 Punte):** Analise van voorgeskrewe gedigte. Een gesiene gedig.
*   **Afdeling B & C: Roman & Drama (35 Punte elk - kies EEN):** Beantwoording van konteks- en opsteltipe vrae oor die voorgeskrewe roman of drama.

**Kognitiewe Vlakke (Vraestel 1):**
*   Vlak 1 & 2 (Letterlik, Herorganisasie): 40%
*   Vlak 3 (Inferensie): 40%
*   Vlak 4 (Evaluering, Waardering): 20%

**Kognitiewe Vlakke (Vraestel 2):**
*   Level 1 & 2 (Kennis, Begrip): 40%
*   Level 3 (Toepassing, Analise): 40%
*   Level 4 (Sintese, Evaluering): 20%
`,
  "Business Studies": `
**Curriculum Context: CAPS Grade 12 Business Studies (South Africa)**

**Paper 1: Business Environments & Business Operations (150 marks)**
*   **Business Environments:** Impact of recent legislation, business strategies (integration, diversification, etc.), sectors (primary, secondary, tertiary).
*   **Business Operations:** Human resources function, quality management, investment concepts, forms of ownership.

**Paper 2: Business Ventures & Business Roles (150 marks)**
*   **Business Ventures:** Management and leadership, investment securities, presentation of business information, entrepreneurship.
*   **Business Roles:** Ethics and professionalism, creative thinking and problem-solving, corporate social responsibility, human rights in the workplace.

**Cognitive Levels Weighting (Both Papers):**
*   Level 1: Remembering/Knowledge (Lower Order): 30%
*   Level 2: Understanding/Applying (Middle Order): 50%
*   Level 3: Analysing/Evaluating/Creating (Higher Order): 20%
`,
  "Computer Applications Technology": `
**Curriculum Context: CAPS Grade 12 Computer Applications Technology (CAT) (South Africa)**

**Theory Paper (150 marks):**
*   **Systems Technologies:** Hardware, software, computer management.
*   **Network Technologies:** Concepts, uses, advantages/disadvantages.
*   **Internet Technologies:** WWW, e-communications, web browsers, search techniques.
*   **Information Management:** Data vs. information, task analysis, data sources.
*   **Social Implications:** Legal, ethical, security, and environmental issues.
*   **Solution Development:** Using application packages (Word, Excel, Access, HTML) to solve problems.

**Cognitive Levels Weighting (Theory Paper):**
*   Level 1: Remembering: 15%
*   Level 2: Understanding: 30%
*   Level 3: Applying: 30%
*   Level 4: Analyzing & Evaluating: 25%
`,
  "Consumer Studies": `
**Curriculum Context: CAPS Grade 12 Consumer Studies (South Africa)**

**Question Paper (200 marks):**
*   **The Consumer (32 marks):** Consumer rights and responsibilities, legislation (e.g., CPA), financial management.
*   **Food and Nutrition (80 marks):** Meal planning, food-borne diseases, food safety, food security.
*   **Clothing (24 marks):** Fashion, consumer choices, textiles.
*   **Housing (24 marks):** Factors influencing housing choices, contracts, financing.
*   **Entrepreneurship (40 marks):** Production planning, marketing, business plan.

**Cognitive Levels Weighting:**
*   Level 1: Remembering/Knowledge: 30%
*   Level 2: Understanding/Comprehension: 40%
*   Level 3: Applying, Analysing, Evaluating, Creating: 30%
`,
  "Dramatic Arts": `
**Curriculum Context: CAPS Grade 12 Dramatic Arts (South Africa)**

**Written Paper (150 marks):**
*   **South African Theatre History:** Focus on key periods and practitioners (e.g., Workshop Theatre, Protest Theatre).
*   **Play Texts Analysis:** In-depth study of prescribed plays, understanding themes, characters, structure, and context.
*   **Theatre Theory & Practice:** Concepts like Realism, Expressionism, Absurdism; roles of director, designer, actor.
*   **Contemporary Theatre:** Analysis of unseen theatre reviews and performance texts.

**Cognitive Levels Weighting (Written Paper):**
*   Level 1: Knowledge & Comprehension: 40%
*   Level 2: Application & Analysis: 40%
*   Level 3: Synthesis & Evaluation: 20%
`,
  "Economics": `
**Curriculum Context: CAPS Grade 12 Economics (South Africa)**

**Paper 1: Macroeconomics & Economic Pursuits (150 marks)**
*   **Macroeconomics:** Circular flow model, business cycles, the public sector, foreign exchange markets.
*   **Economic Pursuits:** Protectionism and free trade, economic growth and development.

**Paper 2: Microeconomics & Economic Pursuits (150 marks)**
*   **Microeconomics:** Perfect markets, imperfect markets (monopoly, oligopoly, monopolistic competition), market failure.
*   **Economic Pursuits:** Inflation, tourism, environmental sustainability.

**Cognitive Levels Weighting (Both Papers):**
*   Level 1: Remembering/Knowledge (Lower Order): 30%
*   Level 2: Understanding/Applying (Middle Order): 50%
*   Level 3: Analysing/Evaluating/Creating (Higher Order): 20%
`,
  "Engineering Graphics and Design": `
**Curriculum Context: CAPS Grade 12 Engineering Graphics and Design (EGD) (South Africa)**

**Paper 1 (200 marks):**
*   **Civil Drawing:** Detailed drawings of civil structures, including sectional views.
*   **Mechanical Drawing:** Detailed assembly drawings, including sectional views.
*   **Electrical Technology Drawing:** Circuit diagrams.

**Paper 2 (200 marks):**
*   **Orthographic Projection:** First and third angle projections.
*   **Loci:** Locus of a point on a mechanism.
*   **Interpenetration & Development:** Intersection of solids.
*   **Isometric Drawing.**

**Cognitive Levels Weighting:**
*   Level 1: Knowledge: 20%
*   Level 2: Comprehension: 30%
*   Level 3-4: Application, Analysis, Synthesis, Evaluation: 50%
`,
  "English Home Language": `
**Curriculum Context: CAPS Grade 12 English Home Language (South Africa)**

**Paper 1: Language in Context (70 marks)**
*   **Section A: Comprehension (30 marks):** Understanding and analysis of a written text. Questions test literal, reorganisational, inferential, and evaluative comprehension.
*   **Section B: Summary (10 marks):** Ability to identify main points and synthesise them into a coherent paragraph.
*   **Section C: Language Structures and Conventions (30 marks):** Application of language rules, analysis of advertising, cartoons, and editing skills.

**Paper 2: Literature (80 marks)**
*   **Section A: Poetry (30 marks):** Analysis of prescribed poems (essay and contextual questions). Unseen poem analysis.
*   **Section B: Novel (25 marks):** Essay or contextual questions on the prescribed novel.
*   **Section C: Drama (25 marks):** Essay or contextual questions on the prescribed drama.

**Cognitive Levels (Paper 1):**
*   Level 1 & 2 (Literal, Reorganisation): 40%
*   Level 3 (Inference): 40%
*   Level 4 (Evaluation, Appreciation): 20%

**Cognitive Levels (Paper 2):**
*   Level 1 & 2 (Kennis, Begrip): 40%
*   Level 3 (Toepassing, Analise): 40%
*   Level 4 (Sintese, Evaluering): 20%
`,
  "Geography": `
**Curriculum Context: CAPS Grade 12 Geography (South Africa)**

**Paper 1: Physical Geography (150 marks)**
*   **Climate and Weather (60 marks):** Mid-latitude cyclones, tropical cyclones, valley climates, urban climates.
*   **Geomorphology (60 marks):** Drainage systems in SA, fluvial processes, catchment and river management.
*   **Mapwork (30 marks):** Map interpretation and calculations.

**Paper 2: Human Geography (150 marks)**
*   **Settlement Geography (60 marks):** Rural and urban settlements, urban hierarchies, urban structure and issues.
*   **Economic Geography of SA (60 marks):** Primary, secondary, tertiary sectors, industrial regions, informal sector.
*   **Mapwork (30 marks):** Map interpretation and calculations.

**Cognitive Levels Weighting (Both Papers):**
*   Lower Order (Knowledge): 20%
*   Middle Order (Comprehension, Application): 50%
*   Higher Order (Analysis, Synthesis, Evaluation): 30%
`,
  "History": `
**Curriculum Context: CAPS Grade 12 History (South Africa)**

**Paper 1: Source-Based (150 marks)**
*   **The Cold War:** Origins, case study (e.g., Vietnam), end of the Cold War.
*   **Independent Africa:** Case study on challenges (e.g., Tanzania, Congo).
*   **Civil Society Protests 1950s to 1970s:** US Civil Rights Movement, Anti-Apartheid Movement.

**Paper 2: Essay (150 marks)**
*   **Civil Resistance in SA 1970s to 1980s:** Black Consciousness, Soweto Uprising, Trade Unions.
*   **The Coming of Democracy in SA (1990-1994):** Release of Mandela, negotiations, democratic election.
*   **The End of the Cold War and a New World Order.**

**Cognitive Levels Weighting (Both Papers):**
*   Level 1 (Extracting evidence): 20%
*   Level 2 (Explanation, analysis): 40%
*   Level 3 (Interpretation, evaluation, synthesis): 40%
`,
  "Information Technology": `
**Curriculum Context: CAPS Grade 12 Information Technology (IT) (South Africa)**

**Paper 1: Theory (150 marks)**
*   **Systems Technologies:** Hardware, software, virtualization.
*   **Communication & Network Technologies:** Network concepts, security.
*   **Data & Information Management:** Databases, SQL, data warehousing.
*   **Solution Development:** Algorithm design, programming principles (using Java/Delphi).
*   **Social & Ethical Implications:** E-commerce, AI, legal and ethical issues.

**Paper 2: Practical (150 marks)**
*   **Problem Solving using Programming Language (Java/Delphi):** Application of algorithms, data structures (arrays, records/objects), file handling, database connectivity.

**Cognitive Levels Weighting (Theory):**
*   Remembering/Understanding: 45%
*   Applying: 30%
*   Analyzing/Evaluating/Creating: 25%
`,
  "Life Orientation": `
**Curriculum Context: CAPS Grade 12 Life Orientation (South Africa)**

**Common Assessment Task (CAT) & Final Exam:**
*   **Development of the self in society:** Life skills, managing stress, conflict resolution.
*   **Social and environmental responsibility:** Social issues, environmental justice.
*   **Democracy and human rights:** Responsible citizenship, dealing with discrimination.
*   **Careers and career choices:** Post-school destinations, financing, career trends.
*   **Study skills:** Goal setting, time management, exam writing skills.

**Cognitive Levels Weighting:**
*   Low Order (Knowledge, comprehension): 30%
*   Middle Order (Application, analysis): 40%
*   High Order (Synthesis, evaluation): 30%
`,
  "Life Sciences": `
**Curriculum Context: CAPS Grade 12 Life Sciences (South Africa)**

This document outlines the examinable content for the final Grade 12 examination.

**Paper 1 Topics (Responding to the Environment, Reproduction, Homeostasis):**
*   **Reproduction in Vertebrates (8 marks):** Reproductive strategies (e.g., external/internal fertilisation, ovipary, ovovivipary, vivipary, amniotic egg).
*   **Human Reproduction (41 marks):** Male and female reproductive systems, puberty, gametogenesis (spermatogenesis & oogenesis), menstrual cycle (hormonal control), fertilisation, implantation, gestation, role of placenta.
*   **Responding to the Environment (Humans) (54 marks):** Nervous system (central, peripheral, autonomic), neurons, reflex arc, human eye (structure, function, accommodation), human ear (structure, function in hearing and balance).
*   **Responding to the Environment (Plants) (13 marks):** Plant hormones (auxins, gibberellins, abscisic acid), role of auxins in phototropism and geotropism.
*   **Endocrine System & Homeostasis (Humans) (34 marks):** Key endocrine glands (e.g., Pituitary, Pancreas, Thyroid) and hormones, a negative feedback loops for thermoregulation, blood glucose, water balance (osmoregulation), and CO2 levels.

**Paper 2 Topics (Code of Life, Meiosis, Genetics, Evolution):**
*   **DNA: Code of Life (27 marks):** Structure of DNA (double helix, nucleotides) and RNA, DNA replication, protein synthesis (transcription and translation).
*   **Meiosis (21 marks):** Process of Meiosis I and II, importance (gamete formation, genetic variation via crossing over), abnormal meiosis (non-disjunction leading to conditions like Down syndrome).
*   **Genetics and Inheritance (48 marks):** Mendel's principles, concepts (alleles, dominant/recessive, phenotype/genotype), monohybrid crosses (complete, incomplete, co-dominance), dihybrid crosses, sex determination, sex-linked inheritance (haemophilia), blood groups (multiple alleles), mutations, pedigree diagrams.
*   **Evolution (54 marks):** Theories (Lamarckism, Darwin's theory of natural selection, Punctuated Equilibrium), evidence (fossils, biogeography, homologous structures), variation, speciation (geographic isolation), human evolution (fossil evidence, 'Out-of-Africa' hypothesis).

**Cognitive Levels Weighting (Life Sciences):**
*   Knowledge (Remembering): 40%
*   Comprehension (Understanding): 25%
*   Application: 20%
*   Analysis, Synthesis and Evaluation: 15%
`,
  "Mathematical Literacy": `
**Curriculum Context: CAPS Grade 12 Mathematical Literacy (South Africa)**

**Paper 1: Basic Skills (150 marks)**
*   **Finance:** Financial documents, tariff systems, inflation, income/expenditure.
*   **Measurement:** Conversions, perimeter, area, volume.
*   **Maps, plans and other representations:** Scale, maps, floor plans.
*   **Data Handling:** Collecting, organising, representing and interpreting data.
*   **Probability.**

**Paper 2: Application & Interpretation (150 marks)**
*   In-depth, scenario-based questions integrating content from the entire curriculum. Requires application of skills from Paper 1 to solve complex, real-life problems.

**Cognitive Levels Weighting (Both Papers):**
*   Level 1: Knowing: 30%
*   Level 2: Applying routine procedures: 30%
*   Level 3: Applying multi-step procedures: 20%
*   Level 4: Reasoning and reflecting: 20%
`,
  "Mathematics": `
**Curriculum Context: CAPS Grade 12 Mathematics (South Africa)**

This document outlines the examinable content for the final Grade 12 examination.

**Paper 1 (150 marks):**
*   **Algebra, Equations and Inequalities (25 marks):** Solving quadratic equations (including substitution), equations with surds, non-quadratic inequalities in the context of functions, nature of roots.
*   **Number Patterns, Sequences and Series (25 marks):** Linear and quadratic patterns, arithmetic and geometric sequences and series.
*   **Functions and Graphs (35 marks):** Interpretation of linear, quadratic, hyperbolic, exponential, and logarithmic functions. Transformations, inverses.
*   **Finance, Growth and Decay (15 marks):** Nominal vs effective interest rates, calculations involving future value, present value, and annuities.
*   **Differential Calculus (35 marks):** First principles, differentiation rules, cubic functions (graphing, interpreting derivatives), optimization problems (maxima/minima).
*   **Probability (15 marks):** Dependent and independent events, counting principles (fundamental counting principle), Venn diagrams, tree diagrams.

**Paper 2 (150 marks):**
*   **Statistics (20 marks):** Measures of central tendency and dispersion, standard deviation, variance, least squares regression line, identifying outliers.
*   **Analytical Geometry (40 marks):** Equation of a line, angle of inclination, equation of a circle (center at origin and other), properties of polygons using analytical methods.
*   **Trigonometry (50 marks):** Identities, reduction formulae, solving trigonometric equations, graphs, 2D and 3D problems (sine, cosine, area rules).
*   **Euclidean Geometry (40 marks):** Circle geometry theorems (angles at center/circumference, cyclic quads, tangents), ratio and proportion, similarity. Proofs of key theorems are examinable.

**Cognitive Levels Weighting (Both Papers):**
*   Knowledge: 20%
*   Routine Procedures: 35%
*   Complex Procedures: 30%
*   Problem Solving: 15%
`,
  "Music": `
**Curriculum Context: CAPS Grade 12 Music (South Africa)**

**Written Paper (150 marks):**
*   **Music Theory & Analysis:** Advanced harmony, intervals, chords, scales, analysis of musical forms.
*   **Aural Skills:** Dictation (rhythmic, melodic), identification of chords, intervals, cadences.
*   **Music History & Analysis (Set Works):** In-depth analysis of prescribed works from Western Art Music, Jazz, and South African Music genres.

**Cognitive Levels Weighting (Written Paper):**
*   Knowledge/Comprehension (Theory/Recall): 40%
*   Application/Analysis (Applying theory to analyse works): 60%
`,
  "Physical Sciences": `
**Curriculum Context: CAPS Grade 12 Physical Sciences (South Africa)**

This document outlines the examinable content for the final Grade 12 examination.

**Paper 1: Physics (150 marks)**
*   **Mechanics (65 marks):**
    *   **Newton's Laws and Applications:** Different kinds of forces (weight, normal, friction, applied, tension). Force diagrams and free-body diagrams. Newton's first, second, and third laws. Newton's Law of Universal Gravitation.
    *   **Momentum and Impulse:** Definitions, Newton's second law in terms of momentum, conservation of momentum, elastic and inelastic collisions.
    *   **Vertical Projectile Motion in 1D:** Free fall, equations of motion, graphs of motion.
    *   **Work, Energy and Power:** Work-energy theorem, conservation of energy with non-conservative forces, power.
*   **Waves, Sound and Light (15 marks):**
    *   **Doppler Effect:** With sound and light (red shifts).
*   **Electricity and Magnetism (55 marks):**
    *   **Electrostatics:** Coulomb's law, electric fields.
    *   **Electric Circuits:** Ohm's law, power, energy, internal resistance.
    *   **Electrodynamics:** Electrical machines (generators, motors).
*   **Optical Phenomena and Materials (15 marks):**
    *   **Photo-electric effect:** Threshold frequency, work function, emission and absorption spectra.

**Paper 2: Chemistry (150 marks)**
*   **Chemical Change (84 marks):**
    *   **Rates of Reaction:** Factors affecting rates, measuring rates, collision theory.
    *   **Chemical Equilibrium:** Le Châtelier's principle, equilibrium constant (Kc).
    *   **Acids and Bases:** Theories, pH calculations, titrations.
    *   **Electrochemistry:** Galvanic and electrolytic cells.
*   **Chemical Systems (18 marks):**
    *   **Electrolytic Cells:** Industrial applications (e.g., chloro-alkali industry).
*   **Matter and Materials (48 marks):**
    *   **Organic Chemistry:** Nomenclature, physical properties, reactions of alkanes, alkenes, alkynes, haloalkanes, alcohols, carboxylic acids, esters. Polymers.

**Cognitive Levels Weighting (Both Papers):**
*   Level 1: Remembering (Recall) - 15%
*   Level 2: Understanding (Comprehension) - 35%
*   Level 3: Applying and Analysing - 40%
*   Level 4: Evaluating and Creating (Synthesis) - 10%
`,
  "Visual Arts": `
**Curriculum Context: CAPS Grade 12 Visual Arts (South Africa)**

**Paper 1: Visual Culture Studies (Theory) (100 marks)**
*   **Themes in Contemporary Art:** Focus on socio-political, environmental, and identity-based art.
*   **South African Art:** Key movements, artists, and their socio-political context.
*   **Global Art Movements:** In-depth study of specific movements (e.g., Surrealism, Pop Art) and their influence.
*   **Unseen Analysis:** Ability to analyse and write about an unseen artwork using visual analysis skills.

**Cognitive Levels Weighting (Theory Paper):**
*   Remembering/Understanding: 30%
*   Applying/Analysing: 40%
*   Evaluating/Creating (forming reasoned arguments): 30%
`,
  "Generic": `
**Curriculum Context: Generic CAPS (South Africa)**

This is a generic context for a subject not specifically detailed. Please use your general knowledge of the South African CAPS curriculum for the specified grade and subject.

**General CAPS Principles:**
*   **Content:** Focus on the core knowledge, concepts, and skills outlined for the subject at the Grade 12 level.
*   **Cognitive Levels:** Ensure a spread of questions across different cognitive demands:
    *   **Lower Order (approx. 30-40%):** Remembering facts, understanding concepts.
    *   **Middle Order (approx. 40-50%):** Applying procedures, analysing information.
    *   **Higher Order (approx. 15-20%):** Evaluating, synthesising, and creating.
*   **Assessment:** Structure worksheets and lesson activities to build from simple recall to complex problem-solving, mirroring the scaffolding approach used in CAPS assessments.
`
};


const systemInstruction = `
You are an expert AI instructional designer specializing in creating educational materials based on the South African CAPS curriculum. Your task is to generate a complete lesson package based on user-provided curriculum goals. You MUST use the curriculum context provided below to inform your generation and to verify the user's request against the specified grade and subject.

**Guidelines for Generating High-Quality Diagrams and Charts (Based on CAPS Exam Papers):**
To ensure the generated visuals are of exam quality, follow these subject-specific examples:

*   **For Physical Sciences:**
    *   **Common Diagrams:** Free-body diagrams, electric circuits, ray diagrams, force diagrams.
    *   **Example \`diagramDescription\`:** "A simple line diagram of a 5 kg block on a frictionless inclined plane at an angle of 30 degrees to the horizontal. An arrow indicates a force of 40 N being applied to the block parallel to the incline, upwards. Do NOT add any text or labels."
    *   **Example \`diagramLabels\`:** \`[{"text": "\\\\(F_N\\\\)", "x": 45, "y": 35, "rotate": -60}, {"text": "\\\\(F_g\\\\)", "x": 50, "y": 60}, {"text": "\\\\(F_{app} = 40 \\\\text{ N}\\\\)", "x": 75, "y": 58, "rotate": -30}, {"text": "\\\\(30^{\\\\circ}\\\\)", "x": 30, "y": 88}]\`
*   **For Life Sciences:**
    *   **Common Diagrams:** Neuron structure, reflex arc, the human ear/eye, DNA replication fork, protein synthesis process.
    *   **Example \`diagramDescription\`:** "A cross-section of a synapse between two neurons. Show the pre-synaptic terminal containing vesicles with neurotransmitters, the synaptic cleft, and the post-synaptic membrane with receptors. Do NOT add any text or labels."
    *   **Example \`diagramLabels\`:** \`[{"text": "Axon", "x": 10, "y": 50}, {"text": "Vesicle", "x": 30, "y": 40}, {"text": "Neurotransmitter", "x": 45, "y": 55}, {"text": "Synaptic Cleft", "x": 60, "y": 80}, {"text": "Receptor", "x": 75, "y": 45}, {"text": "Dendrite", "x": 90, "y": 50}]\`
*   **For Geography:**
    *   **Common Diagrams:** Synoptic weather maps, river profiles, cross-sections of landforms (e.g., cyclone, valley).
    *   **Example \`diagramDescription\`:** "A simplified synoptic weather chart of Southern Africa. Show isobars forming a high-pressure cell over the interior and a coastal low-pressure system near the east coast. Indicate a cold front approaching from the southwest. Do NOT add any text or labels."
    *   **Example \`chartData\` (Climate Graph):** \`{"type": "bar", "title": "Climate Graph for Cape Town", "data": {"labels": ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], "datasets": [{"label": "Average Rainfall (mm)", "data": [15, 17, 20, 41, 69, 93, 82, 77, 40, 30, 21, 17]}]}}\`
*   **For Economics:**
    *   **Common Diagrams:** Supply and demand curves, production possibility frontiers, cost/revenue curves.
    *   **Example \`diagramDescription\`:** "A standard supply and demand graph. The vertical axis is Price (P) and the horizontal axis is Quantity (Q). Draw a downward-sloping demand curve and an upward-sloping supply curve. Show the equilibrium point where they intersect. Do NOT add any text or labels."
    // FIX: The backticks around the JSON string were not escaped, causing a parsing error.
    *   Example \`diagramLabels\`: \`[{"text": "Price (P)", "x": 5, "y": 10}, {"text": "Quantity (Q)", "x": 90, "y": 95}, {"text": "D", "x": 85, "y": 25}, {"text": "S", "x": 85, "y": 75}, {"text": "P_e", "x": 12, "y": 50}, {"text": "Q_e", "x": 50, "y": 95}]\`
    *   **Example \`chartData\` (GDP Contribution):** \`{"type": "pie", "title": "Contribution to GDP by Sector", "data": {"labels": ["Primary", "Secondary", "Tertiary"], "datasets": [{"label": "GDP %", "data": [10, 22, 68]}]}}\`
*   **For Mathematics:**
    *   **Common Diagrams:** Cartesian planes with functions, Euclidean geometry diagrams (circles, triangles), Venn diagrams.
    *   **Accuracy Rule:** Diagrams must be clean and accurate. Graphs must not extend past their axes. Coordinate labels MUST be formatted as \`(x, y)\` using commas, without extra brackets or semicolons. For example, \`(-1, 0)\` is correct; \`((-1;0))\` or \`(1, 8\` are incorrect.
    *   **Example 1 \`diagramDescription\`:** "A Cartesian plane showing a parabola opening upwards with its vertex in the third quadrant. A straight line with a negative gradient intersects the parabola at two distinct points, A and B. Do NOT add any text or labels."
    // FIX: The backticks around the JSON string were not escaped, causing a parsing error.
    *   Example 1 \`diagramLabels\`: \`[{"text": "y", "x": 52, "y": 5}, {"text": "x", "x": 95, "y": 48}, {"text": "A", "x": 30, "y": 35}, {"text": "B", "x": 70, "y": 15}, {"text": "\\\\(f(x)\\\\)", "x": 80, "y": 60}, {"text": "\\\\(g(x)\\\\)", "x": 80, "y": 5}]\`
    *   **Example 2 \`diagramDescription\`:** "A Cartesian plane showing an exponential growth function f(x) and a decreasing linear function g(x). The two functions intersect at a single point in the first quadrant. The exponential function passes through the y-axis above the origin. The linear function also has a positive y-intercept. Do NOT add any text or labels."
    // FIX: The backticks around the JSON string were not escaped, causing parsing errors.
    *   Example 2 \`diagramLabels\`: \`[{"text": "y", "x": 48, "y": 5}, {"text": "x", "x": 95, "y": 52}, {"text": "\\\\(f(x)\\\\)", "x": 60, "y": 15}, {"text": "\\\\(g(x)\\\\)", "x": 20, "y": 20}, {"text": "(1, 2)", "x": 58, "y": 35}, {"text": "(0, 1)", "x": 42, "y": 45}, {"text": "(0, 3)", "x": 42, "y": 28}]\`

**CRITICAL RULES:**
1.  **Verification First:** Before generating any content, you MUST first verify that the user's 'goals' are appropriate for the specified grade and subject, using the detailed curriculum context provided above. If the goal is about a topic not listed (e.g., 'Organic Chemistry' for a Physics lesson, or 'Newton's Laws' for a Life Sciences lesson), you MUST set \`mismatch: true\` and provide a clear \`mismatchReason\`.
2.  **LaTeX for Math:** ALL mathematical notation, variables, formulas, equations, and units (e.g., kg, m/s) in ANY field (questions, answers, speaker notes, etc.) MUST be enclosed in LaTeX delimiters. Use \\( ... \\) for inline math and \\[ ... \\] for block math. This is non-negotiable. An equation not wrapped in delimiters is a failure.
3.  **Diagram-Question Cohesion:** The generated diagram and its labels MUST be a direct, logical, and accurate visual representation of the scenario described in the accompanying source-based question(s). All key values and variables mentioned in the question (e.g., initial velocity, height, mass, angles) must be clearly and correctly labeled on the diagram. The diagram is not a generic illustration; it is a specific component of the problem statement.
4.  **CAPS Question Style:** When generating source-based questions with a diagram for CAPS, the questions MUST be scaffolded in a multi-part, examination style, respecting the cognitive level weightings. Start with foundational questions (e.g., definitions, stating laws - Level 1/2) and then move to analytical or calculation-based questions that require using the diagram (Level 3/4).
5.  **Diagram Generation Workflow (Mandatory):**
    1.  **MOST IMPORTANT FIRST STEP:** If the user requests a diagram ('generateDiagram: true') AND the topic is suitable for a diagram (e.g., Physics, Biology), you MUST first create a detailed, descriptive prompt for an AI image model in the 'diagramDescription' field. This prompt MUST explicitly forbid the image model from rendering any text or labels.
    2.  **Second Step:** You MUST then provide the corresponding labels for that diagram in the 'diagramLabels' field, with their precise x/y coordinates and text formatted in LaTeX.
    3.  **Final Step:** The questions in the worksheet must then directly refer to this diagram. If the topic is not suitable for a diagram (e.g., English essay writing), you MUST omit the 'diagramDescription' and 'diagramLabels' fields entirely.
6.  **Multi-step Calculation Formatting:** When providing a worked answer for a calculation, you MUST follow this three-step pattern for clarity and correctness, separating steps with explanatory text. EACH of the three lines (formula, substitution, final answer) MUST be individually wrapped in its own \\[ ... \\] delimiters. There are no exceptions.
    a. **Formula:** State the formula in its own block-level LaTeX line.
    b. **Substitution:** Show the substitution of values into the formula in a new block-level LaTeX line.
    c. **Final Answer:** State the final answer with units in a final block-level LaTeX line.
    **Example of a correctly formatted multi-step answer:**
    "First, state the formula for gravitational force:
    \\[F = G \\frac{m_1 m_2}{r^2}\\]
    Next, substitute the given values for the Earth and Moon:
    \\[F = (6.67 \\times 10^{-11}) \\frac{(5.97 \\times 10^{24})(7.35 \\times 10^{22})}{(3.84 \\times 10^8)^2}\\]
    Finally, calculate the result:
    \\[F \\approx 1.98 \\times 10^{20} \\text{ N}\\]"
7.  **JSON Output:** You must return the lesson package as a single, valid JSON object that strictly adheres to the provided schema. Do not include any introductory text, markdown formatting, or apologies.
`;

export const generateLesson = async (inputs: UserInputs): Promise<Omit<LessonData, 'id' | 'inputs'> & { type: 'lesson' }> => {

  const curriculumContext = curriculumContexts[inputs.subject as keyof typeof curriculumContexts] || curriculumContexts["Generic"];

  const fullSystemPrompt = `${systemInstruction}\n${curriculumContext}`;

    const userPrompt = `
        Curriculum Goals: "${inputs.goals}"
        Standard: ${inputs.standard}
        Grade: ${inputs.grade}
        Subject: ${inputs.subject}
        Generate Diagram: ${inputs.generateDiagram ? 'Yes' : 'No'}
        Include Chart: ${inputs.includeChart ? 'Yes' : 'No'}
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: fullSystemPrompt,
            responseMimeType: "application/json",
            responseSchema: lessonResponseSchema,
        },
    });

    let lessonJson = JSON.parse(response.text);

    if (lessonJson.mismatch) {
        throw new Error(`Curriculum Mismatch: ${lessonJson.mismatchReason}`);
    }

    lessonJson = cleanLatexInObject(lessonJson);

    if (inputs.generateDiagram && lessonJson.worksheet?.diagramDescription) {
        try {
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `A scientific diagram for a school textbook. It MUST be clean, simple, black and white line art ONLY. CRITICAL INSTRUCTION: Do NOT add any text, numbers, labels, or mathematical equations of any kind directly onto the image. The image must be completely blank of any typography. All labels will be overlaid later. ${lessonJson.worksheet.diagramDescription}`,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: '4:3',
                },
            });
            
            if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                const image = imageResponse.generatedImages[0].image;
                if (lessonJson.worksheet) {
                  lessonJson.worksheet.generatedImage = {
                    data: image.imageBytes,
                    mimeType: image.mimeType,
                  };
                }
            }
        } catch (imageError) {
            console.error("Image generation failed, proceeding without diagram:", imageError);
            if (lessonJson.worksheet) {
                lessonJson.worksheet.source = {
                    title: "Source A: Diagram",
                    content: "A diagram was requested but could not be generated. Please refer to the following description: " + lessonJson.worksheet.diagramDescription,
                };
            }
        }
    }

    return { ...lessonJson, type: 'lesson' };
};

// --- Question Paper Generator ---

const questionPaperResponseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A formal title for the question paper, e.g., 'Grade 12 Physical Sciences: Final Examination'." },
        instructions: {
            type: Type.ARRAY,
            description: "A list of general instructions for the students, e.g., 'Read all questions carefully.', 'Number your answers correctly.'",
            items: { type: Type.STRING }
        },
        questions: {
            type: Type.ARRAY,
            description: "A list of all exam questions, including sub-questions, structured sequentially.",
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.STRING, description: "The number of the question, e.g., '1.1', '2.3.1', 'QUESTION 3'." },
                    questionText: { type: Type.STRING, description: "The full text of the question. Must refer to sources like 'Source A' if applicable." },
                    markAllocation: { type: Type.NUMBER, description: "The number of marks allocated to this specific question." },
                    answer: { type: Type.STRING, description: "A detailed, correct answer for the memorandum. For calculations, it must show the formula, substitution, and final answer with units, each on a new line and formatted in LaTeX." },
                    bloomTaxonomyLevel: { type: Type.STRING, description: "The cognitive level from Bloom's Taxonomy (e.g., 'Remembering', 'Applying')." },
                },
                required: ["questionNumber", "questionText", "markAllocation", "answer", "bloomTaxonomyLevel"]
            }
        },
        diagramDescription: {
            type: Type.STRING,
            description: "If a diagram is requested and relevant, a detailed prompt for an AI image model. This MUST explicitly forbid the model from adding text or labels."
        },
        diagramLabels: {
          type: Type.ARRAY,
          description: "CRITICAL: An array of text labels to be overlaid on the generated diagram. Ensure labels are clearly positioned and DO NOT overlap with each other or obscure important parts of the diagram. Omit if no diagram is generated.",
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The label text. Must use LaTeX for math." },
              x: { type: Type.NUMBER, description: "Horizontal position (0-100)." },
              y: { type: Type.NUMBER, description: "Vertical position (0-100)." },
              rotate: { type: Type.NUMBER, description: "Optional rotation angle." },
            },
            required: ["text", "x", "y"],
          }
        },
        chartData: {
          type: Type.OBJECT,
          description: "Data for a chart if requested and relevant.",
          properties: {
            type: { type: Type.STRING, description: "MUST be one of: 'bar', 'line', or 'pie'." },
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
                  },
                },
              },
            },
            description: { type: Type.STRING },
          },
        },
    },
    required: ["title", "instructions", "questions"]
};

export const generateQuestionPaper = async (inputs: QuestionPaperInputs): Promise<Omit<QuestionPaperData, 'id' | 'inputs'>> => {
    const curriculumContext = curriculumContexts[inputs.subject as keyof typeof curriculumContexts] || curriculumContexts["Generic"];

    const questionPaperSystemPrompt = `
${systemInstruction}

// --- OVERRIDE AND SPECIALIZATION FOR EXAM GENERATION ---
You are now acting as an expert AI EXAMINER for the South African Department of Basic Education. Your task is to generate a formal, CAPS-compliant question paper and memorandum. All previous guidelines on content quality, LaTeX, and diagram generation still apply, but you must prioritize the following examination-specific rules:

**CRITICAL INSTRUCTIONS FOR EXAM GENERATION:**
1.  **Role & Tone:** Maintain a formal, precise, and academic tone suitable for an official examination document.
2.  **Instructions & Data Sheet:** You MUST generate a comprehensive 'INSTRUCTIONS AND INFORMATION' list. For Physical Sciences, it MUST include standard points about numbering, leaving lines between sub-questions, using a non-programmable calculator, showing ALL calculations, rounding off to TWO decimal places, and stating that a data sheet is provided.
3.  **Total Marks Adherence (NON-NEGOTIABLE):** The sum of all \`markAllocation\` fields MUST precisely match the user-specified \`totalMarks\`. Plan the mark distribution before generating.
4.  **Clean Diagrams & Sources:** The \`diagramDescription\` MUST ONLY contain a pure visual description of the scientific setup (e.g., "A free-body diagram showing forces acting on a block..."). It MUST NOT contain any text, labels, or meta-text like "Source A". The corresponding \`questionText\` MUST refer to the source, e.g., "Refer to SOURCE A below...".
5.  **Memorandum Quality (MANDATORY):** Every answer must be a complete, fully worked-out solution. For calculations, show every step: 1. Formula, 2. Substitution, 3. Simplification, 4. Final Answer with units. Each step should be on a new line and in its own LaTeX block. Avoid conversational text.
6.  **Question Structure:** Use main headings (e.g., 'QUESTION 2') for new sections (\`markAllocation: 0\`, \`questionNumber: "2"\`). Do not create headings for sub-questions.

${curriculumContext}
`;

    const userPrompt = `
        Subject: ${inputs.subject}
        Grade: ${inputs.grade}
        Exam Type: ${inputs.examType}
        Total Marks: ${inputs.totalMarks}
        Topics to Cover: "${inputs.topics}"
        Generate Diagram: ${inputs.generateDiagram ? 'Yes' : 'No'}
        Include Chart: ${inputs.includeChart ? 'Yes' : 'No'}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: questionPaperSystemPrompt,
            responseMimeType: "application/json",
            responseSchema: questionPaperResponseSchema,
        },
    });

    let paperJson = JSON.parse(response.text);
    paperJson = cleanLatexInObject(paperJson);

    // Image generation logic (similar to lesson generator)
    if (inputs.generateDiagram && paperJson.diagramDescription) {
        try {
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `A scientific diagram for a school examination paper. It MUST be clean, simple, black and white line art ONLY. CRITICAL INSTRUCTION: Do NOT add any text, numbers, labels, or mathematical equations of any kind directly onto the image. The image must be completely blank of any typography. All labels will be overlaid later. ${paperJson.diagramDescription}`,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: '4:3',
                },
            });
            if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                const image = imageResponse.generatedImages[0].image;
                paperJson.generatedImage = {
                    data: image.imageBytes,
                    mimeType: image.mimeType,
                };
            }
        } catch (imageError) {
            console.error("Image generation for question paper failed:", imageError);
        }
    }

    return { ...paperJson, type: 'paper' };
};