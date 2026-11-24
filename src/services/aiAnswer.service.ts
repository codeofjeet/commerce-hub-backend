import openai from "../config/openai.js";

interface GenerateAIAnswerInput {
  questionText: string;
  subjectName: string;
  courseLevel: string;
  board?: string;
}

interface AIAnswerResult {
  answer: string;
  source: "ai_generated";
  model: string;
}

export const generateAIAnswer = async (
  input: GenerateAIAnswerInput,
): Promise<AIAnswerResult> => {
  const { questionText, subjectName, courseLevel, board } = input;

  if (!questionText.trim()) {
    throw new Error("Question text is required.");
  }

  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL is missing in backend .env");
  }

  const courseName =
    courseLevel === "11"
      ? "Class 11"
      : courseLevel === "12"
        ? "Class 12"
        : courseLevel === "BCom"
          ? "Bachelor of Commerce (B.Com)"
          : courseLevel === "CA_FOUNDATION"
            ? "CA Foundation"
            : courseLevel;

  const academicContext = `
Student Course: ${courseName}
Subject: ${subjectName}
Board: ${board || "Not applicable"}
`;

  const instructions = `
You are an experienced commerce subject teacher
working for Commerce Hub Kota.

Your task is to provide accurate, educational answers
to students' academic questions.

ACADEMIC GUIDELINES:

1. Answer according to the student's subject and course level.
2. Use simple and understandable English.
3. Explain concepts step by step.
4. Use headings and bullet points wherever useful.
5. Include relevant examples.
6. For numerical questions, show the calculation steps.
7. For accounting questions, use appropriate accounting
   terminology and formats.
8. For theory questions, provide an introduction,
   explanation and conclusion where appropriate.
9. Do not invent facts, accounting standards, laws,
   formulas or references.
10. If the question is outside the selected subject,
    politely explain that it is outside the current
    subject context.
11. If the question is unclear or incomplete, ask the
    student for clarification instead of guessing.
12. Never claim that your answer is officially verified
    or approved by a teacher.

Write answers in a student-friendly educational format.
`;

  const response = await openai.responses.create({
    model,
    instructions,
    input: `
Student academic details:
${academicContext}

Student question:
${questionText}
`,
    max_output_tokens: 2000,
  });

  const answer = response.output_text?.trim();

  if (!answer) {
    throw new Error("AI could not generate an answer.");
  }

  return {
    answer,
    source: "ai_generated",
    model,
  };
};
