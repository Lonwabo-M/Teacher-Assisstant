import { GoogleGenAI, Type } from "@google/genai";
import type { UserInputs, LessonData } from '../types';

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
      description: "A worksheet for students with a title, instructions, and a variety of questions.",
      properties: {
        title: { type: Type.STRING, description: "The title of the worksheet." },
        instructions: { type: Type.STRING, description: "Clear instructions for the students." },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The question or prompt for the student." },
              type: { type: Type.STRING, description: "Type of question (e.g., 'multiple-choice', 'short-answer', 'source-based', 'true-false', 'matching')." },
              bloomTaxonomyLevel: { type: Type.STRING, description: "The cognitive level from Bloom's Taxonomy (e.g., 'Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating')." },
              options: { 
                type: Type.ARRAY, 
                description: "An array of options for multiple-choice questions.",
                items: { type: Type.STRING }
              },
              answer: { type: Type.STRING, description: "The correct answer to the question. All mathematical notation in the answer MUST strictly follow the LaTeX formatting rules defined in the main prompt."}
            },
            required: ["question", "type", "bloomTaxonomyLevel"],
          },
        },
        source: {
            type: Type.OBJECT,
            description: "An optional source material for source-based questions.",
            properties: {
                title: { type: Type.STRING, description: "The title of the source material (e.g., 'Excerpt from the Freedom Charter')." },
                content: { type: Type.STRING, description: "The full text or detailed description of the source material." },
            },
        },
      },
      required: ["title", "instructions", "questions"],
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
    // Fix common model error of `\ext{...}` instead of `\text{...}`
    return data.replace(/\\ext\{/g, '\\text{') as unknown as T;
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


export async function generateLesson(inputs: UserInputs): Promise<LessonData> {
  const { goals, standard, grade, subject, sourceBased, includeChart } = inputs;

  const prompt = `
    You are an expert instructional designer and textbook author, tasked with creating a comprehensive, high-quality, and engaging lesson package that is of publishable, textbook-level quality. The materials must be deeply informative, well-structured, and pedagogically sound. Your first duty is as a strict curriculum compliance officer.

    **Topic Details:**
    - **Subject:** ${subject}
    - **Grade Level:** ${grade}
    - **Educational Standard:** ${standard}
    - **Core Curriculum Goals/Objectives:** ${goals}
    - **Source-Based Questions Requested:** ${sourceBased ? 'Yes' : 'No'}
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
    1.  **Lesson Plan:** A step-by-step plan for the teacher. Each section's 'content' must be detailed, outlining specific 'Teacher Activities' (e.g., 'Explain...', 'Demonstrate...'), 'Learner Activities' (e.g., 'In pairs, students will discuss...'), and 'Resources Needed'.
    2.  **Presentation Slides:** Content for a slide deck. For each slide, you MUST provide detailed **'speakerNotes'**. These notes are crucial and should offer the teacher in-depth explanations, additional examples, discussion prompts, and potential student misconceptions to address. They should transform a simple slide into a rich teaching moment.
    3.  **Student Worksheet:** A high-quality, well-structured worksheet. The worksheet MUST be thoughtfully designed to assess a range of cognitive skills. For each question, specify its **'bloomTaxonomyLevel'** (e.g., 'Remembering', 'Understanding', 'Applying', 'Analyzing'). Ensure a good mix of levels, moving from foundational knowledge to higher-order thinking.
        *   **General Questions:** 3-5 questions testing foundational knowledge.
        *   **Source-Based Analysis:** MANDATORY if source material is generated. 2-4 questions requiring deep analysis of the provided source, not just surface-level information retrieval. All questions in this section MUST have the type 'source-based'.

    **CRITICAL FORMATTING INSTRUCTION FOR SCIENTIFIC & MATHEMATICAL CONTENT:**
    The final rendered output must look like a professional physics textbook. Adherence to the LaTeX rules below is **MANDATORY** to achieve this high-quality visual standard. There are no exceptions.

    **1. Delimiters:**
    *   For **inline** math (e.g., a variable like \\(g\\) in a sentence), you MUST use \`\\(\`...\`\\)\`.
    *   For **block** (centered, on its own line) equations, you MUST use \`\\[\`...\`\\]\`.
    *   NEVER use \`$$\`...\`$$\` or \`$\`...\`$\`.

    **2. Absolute Rule:**
    *   Every single mathematical element—including single variables in text (\\(F_g\\)), numbers (\\(9.8\\)), constants (\\(G\\)), and units (\\(\\text{m/s}^2\\))—MUST be wrapped in the appropriate LaTeX delimiters. Do not mix plain text math with regular text.

    **3. Syntax:**
    *   **Fractions:** Use \`\\frac{numerator}{denominator}\`.
    *   **Exponents/Subscripts:** Use \`^\` and \`_\`. Example: \`\\[r^2\\]\`, \`\\[m_1\\]\`.
    *   **Multiplication:** Use \`\\times\`. Example: \`\\[6.67 \\times 10^{-11}\\]\`.
    *   **Units:** ALWAYS use \`\\text{...}\` inside math delimiters. Example: \`\\[9.8 \\text{ m/s}^2\\]\`. For compound units like N m^2/kg^2, format it as a fraction: \`\\[\\frac{\\text{N m}^2}{\\text{kg}^2}\\]\`.

    **4. Formula & Variable Definition Rules:**
    *   When a formula is introduced, you MUST define each variable clearly using a list format.
    *   **Example:**
        \`\`\`
        The formula for Newton's Law of Universal Gravitation is:
        \\[F = G \\frac{m_1 m_2}{r^2}\\]
        Where:
        * \\(F\\) is the gravitational force (\\(\\text{N}\\))
        * \\(G\\) is the Universal Gravitational Constant (\\(6.67 \\times 10^{-11} \\text{ } \\frac{\\text{N m}^2}{\\text{kg}^2}\\))
        * \\(m_1\\) is the mass of the first object (\\(\\text{kg}\\))
        * \\(m_2\\) is the mass of the second object (\\(\\text{kg}\\))
        * \\(r\\) is the distance between the centers of the two objects (\\(\\text{m}\\))
        \`\`\`
    
    **5. Gold Standard Example of a Multi-Step Calculation:**
    *   This is the required format for all step-by-step calculations. It must be followed exactly.
        \`\`\`
        **Question:** Calculate the gravitational force between a \\(70 \\text{ kg}\\) student and a \\(50 \\text{ kg}\\) student sitting \\(0.5 \\text{ m}\\) apart.
        
        **Answer:**
        Given:
        * \\(m_1 = 70 \\text{ kg}\\)
        * \\(m_2 = 50 \\text{ kg}\\)
        * \\(r = 0.5 \\text{ m}\\)
        * \\(G = 6.67 \\times 10^{-11} \\frac{\\text{Nm}^2}{\\text{kg}^2}\\)
        
        The formula for gravitational force is:
        \\[F_g = G \\frac{m_1 m_2}{r^2}\\]
        Substitute the values:
        \\[F_g = (6.67 \\times 10^{-11}) \\frac{(70)(50)}{(0.5)^2}\\]
        \\[F_g = (6.67 \\times 10^{-11}) \\frac{3500}{0.25}\\]
        \\[F_g = (6.67 \\times 10^{-11}) (14000)\\]
        \\[F_g = 9.338 \\times 10^{-7} \\text{ N}\\]
        \`\`\`
    
    **6. Negative Examples (Incorrect Formatting):**
    *   **WRONG:** \`The force is Fg = G * m1*m2 / r^2\` (Reason: No LaTeX delimiters.)
    *   **WRONG:** \`The force is $F_g = G \\frac{m_1 m_2}{r^2}$\` (Reason: Uses forbidden \`$\` delimiters.)
    *   **WRONG:** \`\\[F_g = 9.8 m/s^2\\]\` (Reason: Unit 'm/s^2' is not wrapped in \`\\text{...}\`.)
    *   **CORRECT:** \`\\[F_g = 9.8 \\text{ m/s}^2\\]\`

    This level of formatting precision is mandatory for all mathematical content.

    **Source Material and Chart Generation Rules:**
    - If **"Source-Based Questions Requested" is Yes**, you MUST create a relevant, high-quality primary or secondary source (e.g., a text excerpt, diary entry, data table). Populate the \`worksheet.source\` object.
    - If **"Chart Generation Requested" is Yes** and relevant, create data for a simple 'bar', 'line', 'pie' chart and populate the \`chartData\` object. OMIT the field if a chart is not relevant.
    - If you generate EITHER a text source OR a chart, it becomes the source material for the "Source-Based Analysis" section of the worksheet.

    Please provide the output in a structured JSON format that adheres to the provided schema. Ensure the content is professional, engaging, and appropriate for the specified grade level and educational standard.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    const parsedResponse = JSON.parse(jsonText);
    const cleanedData = cleanLatexInObject(parsedResponse);
    
    // Handle topic/subject/grade mismatch reported by the model
    if (cleanedData.mismatch) {
      throw new Error(cleanedData.mismatchReason || "The provided curriculum goals do not match the selected subject or grade level.");
    }
    
    // Basic validation
    if (!cleanedData.lessonPlan || !cleanedData.slides || !cleanedData.worksheet) {
        throw new Error("Generated data is missing required fields.");
    }
    
    return cleanedData as LessonData;
  } catch (error) {
    console.error("Error in Gemini service:", error);
    if (error instanceof Error) {
        // Re-throw the specific error message (either from the mismatch or another issue)
        throw error;
    }
    throw new Error("Failed to generate lesson content. The model may have returned an invalid format.");
  }
}