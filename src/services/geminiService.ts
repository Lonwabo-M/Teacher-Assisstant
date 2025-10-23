import { GoogleGenAI, Type } from "@google/genai";
import type { UserInputs, LessonData, Worksheet } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
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
            description: "A detailed, descriptive prompt for an AI image generation model to create a scientific diagram relevant to the worksheet questions. For example: 'A simple line diagram showing a block on a frictionless inclined plane. The plane is at an angle theta to the horizontal. Show and label the forces acting on the block: weight (mg) acting vertically downwards, and the normal force (N) acting perpendicular to and away from the plane.' Omit this field if no diagram is relevant or requested." 
        },
      },
      required: ["title", "instructions", "sections"],
    },
    chartData: {
      type: Type.OBJECT,
      description: "Data for a relevant chart or graph, but ONLY if it is explicitly requested and relevant to the topic. Otherwise, this should be omitted.",
      properties: {
        type: { type: Type.STRING, description: "The type of chart, MUST be one of: 'bar', 'line', 'pie'." },
        title: { type: Type.STRING, description: "The title of the chart." },
        data: {
          type: Type.OBJECT,
          properties: {
            labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The labels for the X-axis (for bar/line) or for each segment (for pie)." },
            datasets: {
              type: Type.ARRAY,
              description: "An array of datasets to be plotted. Usually just one.",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "The label for this dataset (e.g., 'Population in Millions')." },
                  data: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "The numerical data points corresponding to the labels." },
                },
                required: ["label", "data"],
              },
            },
          },
          required: ["labels", "datasets"],
        },
        description: { type: Type.STRING, description: "A brief explanation of what the chart shows and why it is relevant to the lesson." },
      },
      required: ["type", "title", "data", "description"],
    },
  },
  required: ["mismatch"],
};

/**
 * Recursively traverses an object or array and cleans up common LaTeX errors in string values.
 * This is a safeguard against model hallucinations that produce invalid syntax.
 * @param data The data to clean.
 * @returns The cleaned data.
 */
function cleanLatexInObject<T>(data: T): T {
  if (typeof data === 'string') {
    // FIX: Explicitly type `cleanedString` as `string` to prevent TypeScript errors
    // when reassigning the result of `replace` to a variable of a generic type `T`.
    let cleanedString: string = data;

    // 1. Remove non-printable control characters that can break parsing.
    // The form feed character (`\f`) is a known issue.
    cleanedString = cleanedString.replace(/[\f\v]/g, '');

    // 2. Correct over-escaped LaTeX commands (e.g., `\\frac` -> `\frac`).
    cleanedString = cleanedString.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

    // 3. Fix common command typos or variations from the model.
    cleanedString = cleanedString.replace(/\\ext\{([^}]+)\}/g, '\\text{$1}');
    cleanedString = cleanedString.replace(/\(ext([^)]+)\)/g, '\\(\\text{$1}\\)');
    cleanedString = cleanedString.replace(/\bimes\b/g, '\\times');
    cleanedString = cleanedString.replace(/\\fract\b/g, '\\frac');
    cleanedString = cleanedString.replace(/\\sqr\b/g, '\\sqrt');
    
    // 4. Fix malformed commands like `\[lambda]` to `\lambda`.
    cleanedString = cleanedString.replace(/\\\[([a-z]+)\]/g, '\\$1 ');

    // 5. Standardize multiplication symbols.
    // Replace 'x' between numbers with `\times`.
    cleanedString = cleanedString.replace(/(\d)\s*x\s*(\d)/g, '$1 \\times $2');
    // Replace standalone dot between numbers with `\cdot`.
    cleanedString = cleanedString.replace(/(\d)\s+\.\s+(\d)/g, '$1 \\cdot $2');

    // 6. Replace common Unicode math symbols with their LaTeX equivalents.
    const unicodeToLatex: { [key: string]: string } = {
        '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
        '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
        '°': '^\\circ', 'Δ': '\\Delta', 'λ': '\\lambda', 'θ': '\\theta',
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'π': '\\pi', 'Σ': '\\Sigma',
        'Ω': '\\Omega', 'ω': '\\omega', 'μ': '\\mu', '≠': '\\neq', '≥': '\\geq', '≤': '\\leq',
        '±': '\\pm', '⋅': '\\cdot'
    };
    // Create a single regex for efficiency.
    const unicodeRegex = new RegExp(Object.keys(unicodeToLatex).join('|'), 'g');
    cleanedString = cleanedString.replace(unicodeRegex, (match) => unicodeToLatex[match]);

    // 7. Attempt to fix mismatched delimiters. Assume block mode is intended.
    // \ ( ... \] -> \[ ... \]
    cleanedString = cleanedString.replace(/\\\(\s*([^)]*?)\s*\\\]/g, '\\[ $1 \\]');
    // \[ ... \) -> \[ ... \]
    cleanedString = cleanedString.replace(/\\\[\s*([^\]]*?)\s*\\\)/g, '\\[ $1 \\]');

    // 8. Remove erroneous tab characters `\t` which can break parsing.
    cleanedString = cleanedString.replace(/\t/g, ' ');

    return cleanedString as unknown as T;
  }


  if (Array.isArray(data)) {
    return data.map(item => cleanLatexInObject(item)) as unknown as T;
  }
  
  if (data && typeof data === 'object') {
    const cleanedObject: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleanedObject[key] = cleanLatexInObject((data as any)[key]);
      }
    }
    return cleanedObject as T;
  }
  
  return data;
}

// FIX: Changed return type to Omit<LessonData, 'id' | 'inputs'> to accurately reflect what the API returns.
// The `id` and `inputs` are added in the App component after this function resolves.
export async function generateLesson(inputs: UserInputs): Promise<Omit<LessonData, 'id' | 'inputs'>> {
  const { goals, standard, grade, subject, generateDiagram, includeChart } = inputs;

  const prompt = `
    You are an expert instructional designer and textbook author, tasked with creating a comprehensive, high-quality, and engaging lesson package that is of publishable, textbook-level quality. The materials must be deeply informative, well-structured, and pedagogically sound. Your first duty is as a strict curriculum compliance officer.

    **Topic Details:**
    - **Subject:** ${subject}
    - **Grade Level:** ${grade}
    - **Educational Standard:** ${standard}
    - **Core Curriculum Goals/Objectives:** ${goals}
    - **Generate Diagram Requested:** ${generateDiagram ? 'Yes' : 'No'}
    - **Chart Generation Requested:** ${includeChart ? 'Yes' : 'No'}

    **CRITICAL VALIDATION STEP:**
    You must perform a strict, two-part validation. If the request fails ANY part of this validation, you MUST return a mismatch.
    1.  **Subject & Topic Alignment:** Is the topic fundamentally part of the specified Subject? (e.g., 'Evolution' is Life Sciences, not Physical Sciences).
    2.  **Curriculum Scope Alignment:** Is this specific topic officially covered in the specified **Grade Level** for the given **Educational Standard**? Be extremely precise. Your analysis must go beyond general subject association and confirm that the topic is part of the official curriculum scope for that specific grade. For example:
        *   Under CAPS, 'Geometric Optics' is a Grade 11 Physical Sciences topic, NOT Grade 12.
        *   Under CAPS, the 'Photoelectric Effect' is a Grade 12 Physical Sciences topic, NOT Grade 10 or 11.
        *   Under CAPS Grade 12 Life Sciences, while it covers molecular biology, a broad topic of 'Biochemistry' is out of scope. The curriculum focuses on specific strands like 'DNA: Code of Life' and 'Meiosis'. You must verify if the user's goals align with these specific curriculum strands.

    **Response Rules:**
    - If the request fails validation, you MUST return a JSON object with "mismatch": true and a "mismatchReason" explaining the specific conflict (e.g., "The photoelectric effect is a topic covered in Grade 12 Physical Sciences under the CAPS curriculum, not Grade 10.").
    - If the topic is perfectly aligned, return "mismatch": false and proceed to generate the full lesson package with the quality standards below.

    **Content Generation Task (only if there is no mismatch):**
    Generate a comprehensive lesson package with the following high-quality components:
    
    **SPECIAL INSTRUCTION FOR DIAGRAM GENERATION:**
    - If 'Generate Diagram Requested' is 'Yes' AND the topic is visually-driven (e.g., Physics, Life Sciences, Geography, Geometry), you MUST perform the following three actions:
    1.  **Create a Diagram Prompt:** In the 'worksheet' object, you MUST populate the 'diagramDescription' field with a detailed, clear, and concise prompt for an AI image generation model. This prompt should describe a scientifically accurate and pedagogically useful diagram.
        *   **Good Physics Example:** 'A simple, clear line diagram of a 20 kg block on a rough horizontal surface. A force of 35 N is applied to the block at an angle of 40 degrees above the horizontal. A light inextensible string connects it to a frictionless pulley, with two smaller blocks P and Q hanging vertically from the string. Label all forces and values clearly.'
        *   **Good Biology Example:** 'A simplified, labeled diagram of an animal cell. Include and label the following organelles: nucleus, cytoplasm, cell membrane, mitochondria, and ribosomes. Use clear lines and legible text.'
    2.  **Create High-Quality Source-Based Questions:** You MUST create a dedicated section in the worksheet with 'source-based' questions that specifically and directly require students to analyze the diagram you have described. When generating these questions, especially for Physical Sciences, Mathematics, or Life Sciences, you MUST emulate the style of high-quality, textbook-level examination questions (like those found in CAPS or Cambridge standards). This involves:
        *   **Multi-Part Structure:** Break down the main problem into several sub-questions (e.g., 4.1, 4.2, 4.2.1).
        *   **Cognitive Scaffolding:** Start with a foundational, lower-order question, such as defining a key term or stating a relevant law (e.g., "Define 'free fall'.", "State the principle of conservation of momentum."). This aligns with Bloom's 'Remembering' or 'Understanding'.
        *   **Application and Analysis:** Follow up with higher-order questions that require applying formulas, interpreting the diagram, and performing calculations based on the provided scenario (e.g., "Calculate the velocity of ball Q after the collision.", "Determine the magnitude of the impulse on ball P."). This aligns with Bloom's 'Applying' and 'Analyzing'.
        *   **Provide Full Context:** The question's introductory text, combined with the diagram, must provide all necessary values and context for a student to solve the problems.
    3.  **Create a Source Reference:** In the worksheet's 'source' property, you MUST set the title to 'Source A: Diagram' and provide a brief caption for the diagram in the 'content' field.
    - If a diagram is not relevant for the topic (e.g., History essay, English poetry), you MUST omit the 'diagramDescription' and related source material.

    1.  **Lesson Plan:** A step-by-step plan for the teacher. Each section's 'content' must be detailed, outlining specific 'Teacher Activities' (e.g., 'Explain...', 'Demonstrate...'), 'Learner Activities' (e.g., 'In pairs, students will discuss...'), and 'Resources Needed'.
    2.  **Presentation Slides:** Content for a slide deck. For each slide, you MUST provide detailed **'speakerNotes'**. These notes are crucial and should offer the teacher in-depth explanations, additional examples, discussion prompts, and potential student misconceptions to address. They should transform a simple slide into a rich teaching moment.
    3.  **Student Worksheet:** A high-quality, well-structured worksheet organized into logical sections. You MUST follow the structure below.
        - **Worksheet Structure:** The worksheet must be organized into an array of 'sections'. Each section has a title and a list of questions.
        - **Section Variety:** You MUST include a variety of section types appropriate to the topic, such as 'Key Term Matching', 'Label the Diagram', 'Short Answer Questions', and 'Application Scenario'.
        - **Bloom's Taxonomy:** For each question, specify its **'bloomTaxonomyLevel'**. Ensure a good mix of levels, moving from foundational knowledge to higher-order thinking.
        - **Gold Standard Example:**
          \`\`\`json
          "worksheet": {
            "title": "The Circular Flow of Income Worksheet",
            "instructions": "Answer all the questions in the spaces provided...",
            "sections": [
              {
                "title": "Section A: Key Term Matching",
                "questions": [
                  { "question": "1. Households", "type": "matching", "answer": "C", "options": ["A. Spending by firms...", "B. The part of income..."], "bloomTaxonomyLevel": "Remembering" }
                ]
              },
              {
                "title": "Section B: Label the Diagram",
                "content": "Word Bank: Households, Firms, Government...",
                "questions": [
                  { "question": "[A simplified circular flow diagram with several blank labels for students to fill in.]", "type": "diagram-labeling", "answer": "1. Households, 2. Firms...", "bloomTaxonomyLevel": "Understanding" }
                ]
              },
              {
                "title": "Section C: Short Answer Questions",
                "questions": [
                  { "question": "In your own words, explain the difference...", "type": "short-answer", "answer": "The real flow refers to the movement of actual goods and services...", "bloomTaxonomyLevel": "Understanding" }
                ]
              }
            ]
          }
          \`\`\`
    4.  **Chart Data (Conditional):**
        -   **If 'Chart Generation Requested' is 'Yes' AND the topic is inherently quantitative or visual (e.g., Physical Sciences, Economics, Life Sciences, Geography, Mathematics), you MUST generate relevant chart data.** Do not just describe a chart in the text; you must populate the \`chartData\` object in the JSON response.
        -   For a topic like **'Projectile Motion' in Physical Sciences**, a suitable chart would be a 'line' graph showing the height of the projectile over time. The labels would be time in seconds, and the dataset would be the height in meters.
        -   For **'Supply and Demand' in Economics**, a 'line' graph with two datasets (supply curve, demand curve) is appropriate.
        -   For **'Population Growth' in Life Sciences**, a 'bar' chart showing population over several years or a 'line' graph is suitable.
        -   The generated data must be realistic and pedagogically useful for the specified grade level.
        -   If, and ONLY IF, a chart is genuinely irrelevant to the topic (e.g., a poetry analysis in English Home Language), you may omit the 'chartData' object. In all other cases where a chart is requested, your primary duty is to generate it.

    **CRITICAL FORMATTING INSTRUCTION FOR SCIENTIFIC & MATHEMATICAL CONTENT:**
    The final rendered output must look like a professional physics textbook. Adherence to the LaTeX rules below is **MANDATORY** to achieve this high-quality visual standard. There are no exceptions.

    **1. Delimiters:**
    *   For **inline** math (e.g., a variable like \\(g\\) in a sentence), you MUST use \`\\(\`...\`\\)\`.
    *   For **block** (centered, on its own line) equations, you MUST use \`\\[\`...\`\\)\`.

    **2. Absolute Rule:**
    *   Every single mathematical element—including single variables in text (\\(F_g\\)), numbers (\\(9.8\\)), constants (\\(G\\)), and units (\\(\\text{m/s}^2\\))—MUST be wrapped in the appropriate LaTeX delimiters.

    **3. Core Syntax:**
    *   **Fractions:** Use \`\\frac{numerator}{denominator}\`.
    *   **Exponents/Subscripts:** Use \`^\` and \`_\`. Example: \`\\[r^2\\]\`, \`\\[m_1\\]\`.
    *   **Multiplication:** Use \`\\times\`. Example: \`\\[6.67 \\times 10^{-11}\\]\`.
    *   **Units:** ALWAYS use \`\\text{...}\` inside math delimiters. Example: \`\\[9.8 \\text{ m/s}^2\\]\`.

    **4. MANDATORY COMPLIANCE:** Any deviation from these LaTeX rules will result in a substandard, unprofessional output. All mathematical and scientific notation must be rendered using these specific commands and delimiters without exception.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", // Using a more advanced model for this complex, structured task.
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Lower temperature for more predictable, structured output.
      },
    });

    const jsonText = response.text.trim();
    // The model might wrap the JSON in markdown, so we strip it.
    const cleanedJsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsedData = JSON.parse(cleanedJsonText);

    if (parsedData.mismatch) {
      throw new Error(parsedData.mismatchReason || `Curriculum Mismatch: The provided topic does not seem to align with the curriculum for ${subject} at the ${grade} level.`);
    }

    const { mismatch, mismatchReason, ...lessonContent } = parsedData;

    // A final cleaning step to catch any LaTeX syntax errors from the model.
    let cleanedLessonContent = cleanLatexInObject(lessonContent);

    // Step 2: Generate diagram if requested and a prompt was provided
    const diagramPrompt = cleanedLessonContent.worksheet?.diagramDescription;
    if (diagramPrompt) {
      console.log("Generating diagram with prompt:", diagramPrompt);
      try {
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: diagramPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '4:3', // Good aspect ratio for diagrams
            },
        });
        
        if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
            const generatedImage = {
                data: imageResponse.generatedImages[0].image.imageBytes,
                mimeType: 'image/png',
            };
            // Add the generated image to the worksheet object
            cleanedLessonContent.worksheet.generatedImage = generatedImage;
        }
      } catch (imageError) {
        console.error("Error generating diagram:", imageError);
        // Don't fail the whole lesson if image generation fails, just log it.
      }
    }

    // Remove the temporary description from the final data
    if (cleanedLessonContent.worksheet) {
      delete (cleanedLessonContent.worksheet as Partial<Worksheet & { diagramDescription?: string }>).diagramDescription;
    }

    return cleanedLessonContent as Omit<LessonData, 'id' | 'inputs'>;

  } catch (error) {
    console.error("Error generating lesson from Gemini API:", error);
    if (error instanceof SyntaxError) {
      // This catches JSON.parse errors
      throw new Error("The AI returned a response in an unexpected format. Please try generating the lesson again.");
    }
    // Re-throw other errors (like the mismatch error or network issues)
    throw error;
  }
}
