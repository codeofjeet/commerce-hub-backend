import mongoose from "mongoose";

import Question from "../models/Question.js";
import Answer from "../models/Answer.js";

import { generateQuestionEmbedding } from "./embedding.service.js";
import { translateCommerceTerms } from "./commerceDictionary.js";

// --------------------------------------------------
// 1. Types
// --------------------------------------------------

interface SearchQuestionInput {
  questionText: string;
  subjectId: string;
  chapterId?: string;
  board?: string;
  courseLevel: string;
}

interface VerifiedAnswerResult {
  found: boolean;
  source: "verified_database" | "no_answer";
  question?: {
    id: string;
    questionText: string;
  };
  answer?: {
    answerText: string;
    explanation: string;
  };
}

interface VectorSearchQuestion {
  _id: mongoose.Types.ObjectId;
  questionText: string;
  score: number;
}

type QuestionIntent =
  | "definition"
  | "importance"
  | "objectives"
  | "features"
  | "types"
  | "functions"
  | "unknown";

// --------------------------------------------------
// 2. Search configuration
// --------------------------------------------------

const VECTOR_INDEX_NAME = "question_vector_index";

const VECTOR_LIMIT = 10;
const VECTOR_CANDIDATES = 100;

// Atlas vector score threshold.
// This is only one of the checks, not the sole condition.
const MIN_VECTOR_SCORE = 0.92;

// Minimum topic keyword overlap.
const MIN_TOPIC_RELEVANCE = 0.4;

// --------------------------------------------------
// 3. Regex helper
// --------------------------------------------------

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// --------------------------------------------------
// 4. Stop words
// --------------------------------------------------

const stopWords = new Set([
  // English question words
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "what",
  "why",
  "when",
  "where",
  "who",
  "whom",
  "which",
  "whose",
  "how",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "can",
  "could",
  "would",
  "should",
  "will",
  "shall",
  "kaam",
  "kam",
  "kya",
  "karta",
  "karte",
  "karti",

  // English connecting words
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "with",
  "by",
  "from",
  "as",
  "about",
  "into",
  "through",
  "their",
  "its",
  "this",
  "that",
  "these",
  "those",

  // English instruction words
  "explain",
  "describe",
  "define",
  "discuss",
  "write",
  "state",
  "list",
  "mention",
  "give",
  "tell",
  "show",
  "please",
  "me",
  "simple",
  "words",
  "briefly",
  "detail",
  "details",

  // Intent words
  "meaning",
  "importance",
  "advantages",
  "advantage",
  "benefits",
  "benefit",
  "significance",
  "objectives",
  "objective",
  "purpose",
  "aims",
  "aim",
  "goals",
  "goal",
  "features",
  "feature",
  "characteristics",
  "characteristic",
  "properties",
  "property",
  "types",
  "type",
  "kinds",
  "kind",
  "classification",
  "categories",
  "category",
  "functions",
  "function",
  "role",
  "duties",
  "definition",

  // General question terms
  "main",
  "major",
  "important",
  "different",
  "following",
  "any",
  "five",
  "three",
  "four",
  "two",
  "one",

  // Common Hinglish words
  "kya",
  "hai",
  "hain",
  "hota",
  "hoti",
  "hote",
  "ka",
  "ki",
  "ke",
  "ko",
  "kise",
  "kaise",
  "kyun",
  "kyo",
  "karen",
  "karo",
  "kijiye",
  "samjhao",
  "samjhaiye",
  "batao",
  "bataiye",
  "hain",
  "aur",
  "mein",
  "me",
  "se",
  "par",
  "liye",
  "karta",
  "karte",
  "karti",
  "karna",
  "karne",
  "kare",

  // Common Hindi words
  "क्या",
  "है",
  "हैं",
  "का",
  "की",
  "के",
  "को",
  "में",
  "से",
  "और",
  "क्यों",
  "कैसे",
  "बताइए",
  "बताएं",
  "समझाइए",
  "समझाएं",
  "लिखिए",
  "लिखें",
  "करे",
  "करें",
  "होता",
  "होती",
  "होते",
  "किया",
  "जाता",
  "जाती",
  "जाते",
]);

// --------------------------------------------------
// 5. Normalize question text
// --------------------------------------------------

const normalizeSearchQuery = (text: string): string => {
  let normalized = text.toLowerCase().trim();

  const questionPatterns = [
    // Hindi question phrases
    /क्या\s+है/g,
    /क्या\s+होता\s+है/g,
    /क्या\s+होती\s+है/g,
    /क्या\s+होते\s+हैं/g,
    /किसे\s+कहते\s+हैं/g,
    /किसे\s+कहते\s+है/g,
    /का\s+अर्थ\s+क्या\s+है/g,
    /का\s+मतलब\s+क्या\s+है/g,
    /का\s+अर्थ\s+बताइए/g,
    /का\s+अर्थ\s+बताएं/g,
    /का\s+मतलब\s+बताइए/g,
    /का\s+मतलब\s+बताएं/g,
    /समझाइए/g,
    /समझाएं/g,
    /बताइए/g,
    /बताएं/g,

    // Hinglish question phrases
    /\bkya\s+hai\b/g,
    /\bkya\s+hota\s+hai\b/g,
    /\bkya\s+hoti\s+hai\b/g,
    /\bkya\s+hote\s+hain\b/g,
    /\bkise\s+kehte\s+hain\b/g,
    /\bkise\s+kehte\s+hai\b/g,
    /\bka\s+arth\s+kya\s+hai\b/g,
    /\bka\s+matlab\s+kya\s+hai\b/g,
    /\bka\s+matlab\s+batao\b/g,
    /\bka\s+arth\s+batao\b/g,
    /\bsamjhao\b/g,
    /\bsamjhaiye\b/g,
    /\bbatao\b/g,
    /\bbataiye\b/g,

    // English question phrases
    /\bwhat\s+do\s+you\s+understand\s+by\b/g,
    /\bwhat\s+is\s+meant\s+by\b/g,
    /\bwhat\s+are\s+meant\s+by\b/g,
    /\bwhat\s+is\b/g,
    /\bwhat\s+are\b/g,
    /\bdefine\b/g,
    /\bexplain\b/g,
    /\bdescribe\b/g,
    /\bdiscuss\b/g,
    /\bplease\b/g,
  ];

  for (const pattern of questionPatterns) {
    normalized = normalized.replace(pattern, " ");
  }

  // Translate Hindi and Hinglish commerce terms.
  normalized = translateCommerceTerms(normalized);

  return normalized
    .replace(/[?!.,;:।"'`(){}[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// --------------------------------------------------
// 6. Extract meaningful keywords
// --------------------------------------------------

const getKeywords = (text: string): string[] => {
  const normalized = normalizeSearchQuery(text);

  const translated = translateCommerceTerms(normalized);

  return [
    ...new Set(
      translated
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 && !stopWords.has(word)),
    ),
  ];
};

// --------------------------------------------------
// 7. Detect question intent
// --------------------------------------------------

const getQuestionIntent = (text: string): QuestionIntent => {
  const original = text.toLowerCase().trim();

  const normalized = translateCommerceTerms(original);

  const combined = `${original} ${normalized}`;

  const matches = (patterns: RegExp[]): boolean => {
    return patterns.some((pattern) => pattern.test(combined));
  };

  // Importance / Advantages
  const importancePatterns = [
    /\bimportance\b/,
    /\badvantages?\b/,
    /\bbenefits?\b/,
    /\bsignificance\b/,
    /\busefulness\b/,
    /\bwhy\s+is\b/,
    /\bwhy\s+are\b/,
    /\bwhy\s+do\b/,
    /\bwhy\s+does\b/,
    /\bneed\s+for\b/,
    /\buseful\b/,
    /महत्व/,
    /फायदे/,
    /फायदा/,
    /उपयोगिता/,
    /mahatva/,
    /fayde/,
    /fayda/,
    /upayogita/,
  ];

  // Objectives / Purpose
  const objectivePatterns = [
    /\bobjectives?\b/,
    /\bpurpose\b/,
    /\baims?\b/,
    /\bgoals?\b/,
    /\bwhat\s+does\s+.*\s+aim\b/,
    /उद्देश्य/,
    /लक्ष्य/,
    /uddeshya/,
    /uddesya/,
    /lakshya/,
  ];

  // Features / Characteristics
  const featurePatterns = [
    /\bfeatures?\b/,
    /\bcharacteristics?\b/,
    /\bproperties\b/,
    /\bnature\b/,
    /विशेषत/,
    /लक्षण/,
    /visheshta/,
    /visheshata/,
    /lakshan/,
  ];

  // Types / Classification
  const typePatterns = [
    /\btypes?\b/,
    /\bkinds?\b/,
    /\bclassification\b/,
    /\bcategories\b/,
    /प्रकार/,
    /वर्गीकरण/,
    /prakar/,
    /vargikaran/,
  ];

  // Functions / Role
  const functionPatterns = [
    /\bfunctions?\b/,
    /\brole\b/,
    /\bduties\b/,
    /\bkaam\b/,
    /\bkam\b/,
    /\bwhat\s+does\s+.*\s+do\b/,
    /\bwhat\s+do\s+.*\s+do\b/,
    /\bwork\s+of\b/,
    /\bwhat\s+is\s+the\s+work\s+of\b/,
    /कार्य/,
    /भूमिका/,
    /karya/,
    /kaarya/,
    /bhoomika/,
  ];

  // Definition / Meaning
  const definitionPatterns = [
    /\bwhat\s+is\b/,
    /\bwhat\s+are\b/,
    /\bdefine\b/,
    /\bmeaning\b/,
    /\bconcept\b/,
    /\bdefinition\b/,
    /\bwhat\s+do\s+you\s+understand\b/,
    /क्या\s+है/,
    /क्या\s+होता/,
    /क्या\s+होती/,
    /किसे\s+कहते/,
    /का\s+अर्थ/,
    /का\s+मतलब/,
    /\bkya\s+hai\b/,
    /\bkise\s+kehte\b/,
    /\bka\s+arth\b/,
    /\bka\s+matlab\b/,
  ];

  // Check specific intents before definition.
  if (matches(importancePatterns)) return "importance";

  if (matches(objectivePatterns)) return "objectives";

  if (matches(featurePatterns)) return "features";

  if (matches(typePatterns)) return "types";

  if (matches(functionPatterns)) return "functions";

  if (matches(definitionPatterns)) return "definition";

  return "unknown";
};

// --------------------------------------------------
// 8. Check intent compatibility
// --------------------------------------------------

const isIntentCompatible = (
  studentQuestion: string,
  databaseQuestion: string,
): boolean => {
  const studentIntent = getQuestionIntent(studentQuestion);

  const databaseIntent = getQuestionIntent(databaseQuestion);

  // Unknown intent must not automatically match
  // a question from a different known category.
  if (studentIntent === "unknown" || databaseIntent === "unknown") {
    return studentIntent === databaseIntent;
  }

  return studentIntent === databaseIntent;
};

// --------------------------------------------------
// 9. Calculate topic relevance
// --------------------------------------------------

const getQuestionRelevance = (
  studentQuestion: string,
  databaseQuestion: string,
): number => {
  const studentKeywords = getKeywords(studentQuestion);

  const databaseKeywords = new Set(getKeywords(databaseQuestion));

  if (studentKeywords.length === 0) {
    return 0;
  }

  const matchedKeywords = studentKeywords.filter((word) =>
    databaseKeywords.has(word),
  );

  return matchedKeywords.length / studentKeywords.length;
};

// --------------------------------------------------
// 10. Validate question relevance
// --------------------------------------------------

const isQuestionRelevant = (
  studentQuestion: string,
  databaseQuestion: string,
): boolean => {
  if (!isIntentCompatible(studentQuestion, databaseQuestion)) {
    return false;
  }

  const studentIntent = getQuestionIntent(studentQuestion);

  const databaseIntent = getQuestionIntent(databaseQuestion);

  const studentKeywords = getKeywords(studentQuestion);

  const databaseKeywords = getKeywords(databaseQuestion);

  const relevance = getQuestionRelevance(studentQuestion, databaseQuestion);

  // An unknown-intent question needs stronger topic overlap.
  if (studentIntent === "unknown") {
    return databaseIntent === "unknown" && relevance >= 0.6;
  }

  // A recognized intent must also have a matching topic.
  if (studentKeywords.length === 0 || databaseKeywords.length === 0) {
    return false;
  }

  // Single-topic questions need an exact topic keyword match.
  if (studentKeywords.length === 1) {
    return relevance === 1 && databaseIntent === studentIntent;
  }

  return relevance >= MIN_TOPIC_RELEVANCE;
};

// --------------------------------------------------
// 11. Find verified answers
// --------------------------------------------------

const findVerifiedAnswer = async (
  questionIds: mongoose.Types.ObjectId[],
): Promise<VerifiedAnswerResult | null> => {
  if (questionIds.length === 0) {
    return null;
  }

  const questions = await Question.find({
    _id: { $in: questionIds },
    status: "published",
  })
    .select("questionText")
    .lean();

  if (questions.length === 0) {
    return null;
  }

  const verifiedAnswers = await Answer.find({
    question: { $in: questionIds },
    isVerified: true,
  }).lean();

  if (verifiedAnswers.length === 0) {
    return null;
  }

  const questionMap = new Map(
    questions.map((question) => [question._id.toString(), question]),
  );

  const answerMap = new Map(
    verifiedAnswers.map((answer) => [answer.question.toString(), answer]),
  );

  // Preserve the original ranking order.
  for (const questionId of questionIds) {
    const id = questionId.toString();

    const question = questionMap.get(id);
    const answer = answerMap.get(id);

    if (!question || !answer) {
      continue;
    }

    return {
      found: true,
      source: "verified_database",
      question: {
        id: question._id.toString(),
        questionText: question.questionText,
      },
      answer: {
        answerText: answer.answerText,
        explanation: answer.explanation || "",
      },
    };
  }

  return null;
};

// --------------------------------------------------
// 12. Main verified answer search
// --------------------------------------------------

export const searchVerifiedAnswer = async (
  input: SearchQuestionInput,
): Promise<VerifiedAnswerResult> => {
  const { questionText, subjectId, chapterId, board, courseLevel } = input;

  // -----------------------------------------------
  // Validate input
  // -----------------------------------------------

  if (!questionText || !questionText.trim()) {
    throw new Error("Question text is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new Error("Invalid subject ID.");
  }

  if (chapterId && !mongoose.Types.ObjectId.isValid(chapterId)) {
    throw new Error("Invalid chapter ID.");
  }

  // -----------------------------------------------
  // Base database filter
  // -----------------------------------------------

  const baseFilter: Record<string, unknown> = {
    subject: new mongoose.Types.ObjectId(subjectId),
    courseLevel,
    status: "published",
  };

  if (board) {
    baseFilter.board = board;
  }

  if (chapterId) {
    baseFilter.chapter = new mongoose.Types.ObjectId(chapterId);
  }

  const normalizedQuestion = normalizeSearchQuery(questionText);

  const studentIntent = getQuestionIntent(questionText);

  console.log("Student question analysis:", {
    originalQuestion: questionText,
    normalizedQuestion,
    studentIntent,
    keywords: getKeywords(questionText),
  });

  // -----------------------------------------------
  // 1. Exact question search
  // -----------------------------------------------

  const exactQuestion = await Question.findOne({
    ...baseFilter,
    questionText: {
      $regex: `^${escapeRegex(questionText.trim())}$`,
      $options: "i",
    },
  });

  if (exactQuestion) {
    const exactAnswer = await Answer.findOne({
      question: exactQuestion._id,
      isVerified: true,
    });

    if (exactAnswer) {
      console.log("Exact verified question matched.");

      return {
        found: true,
        source: "verified_database",
        question: {
          id: exactQuestion._id.toString(),
          questionText: exactQuestion.questionText,
        },
        answer: {
          answerText: exactAnswer.answerText,
          explanation: exactAnswer.explanation || "",
        },
      };
    }
  }

  // -----------------------------------------------
  // 2. MongoDB text search
  // -----------------------------------------------

  if (normalizedQuestion) {
    const matchingQuestions = await Question.find(
      {
        ...baseFilter,
        $text: {
          $search: normalizedQuestion,
        },
      },
      {
        score: {
          $meta: "textScore",
        },
      },
    )
      .sort({
        score: {
          $meta: "textScore",
        },
      })
      .limit(10);

    const relevantQuestions = matchingQuestions.filter((question) => {
      const relevant = isQuestionRelevant(questionText, question.questionText);

      console.log("Text search candidate:", {
        question: question.questionText,
        studentIntent,
        databaseIntent: getQuestionIntent(question.questionText),
        relevance: getQuestionRelevance(questionText, question.questionText),
        relevant,
      });

      return relevant;
    });

    if (relevantQuestions.length > 0) {
      const verifiedResult = await findVerifiedAnswer(
        relevantQuestions.map((question) => question._id),
      );

      if (verifiedResult) {
        console.log("Verified answer found through text search.");

        return verifiedResult;
      }
    }
  }

  // -----------------------------------------------
  // 3. Multilingual semantic vector search
  // -----------------------------------------------

  console.log("Starting semantic question search...");

  const queryForEmbedding = normalizedQuestion || questionText.trim();

  const queryEmbedding = await generateQuestionEmbedding(queryForEmbedding);

  const vectorFilter: Record<string, unknown> = {
    subject: {
      $eq: new mongoose.Types.ObjectId(subjectId),
    },
    courseLevel: {
      $eq: courseLevel,
    },
    status: {
      $eq: "published",
    },
  };

  if (board) {
    vectorFilter.board = {
      $eq: board,
    };
  }

  if (chapterId) {
    vectorFilter.chapter = {
      $eq: new mongoose.Types.ObjectId(chapterId),
    };
  }

  const semanticQuestions = await Question.aggregate<VectorSearchQuestion>([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: VECTOR_CANDIDATES,
        limit: VECTOR_LIMIT,
        filter: vectorFilter,
      },
    },
    {
      $project: {
        questionText: 1,
        score: {
          $meta: "vectorSearchScore",
        },
      },
    },
  ]);

  console.log(
    "Semantic search results:",
    semanticQuestions.map((question) => ({
      question: question.questionText,
      score: question.score,
      intent: getQuestionIntent(question.questionText),
      relevance: getQuestionRelevance(questionText, question.questionText),
    })),
  );

  // -----------------------------------------------
  // 4. Validate and rank semantic results
  // -----------------------------------------------

  const rankedSemanticQuestions = [...semanticQuestions].sort(
    (a, b) => b.score - a.score,
  );

  const relevantSemanticQuestions = rankedSemanticQuestions.filter(
    (question) => {
      const scoreIsValid = question.score >= MIN_VECTOR_SCORE;

      const intentIsValid = isIntentCompatible(
        questionText,
        question.questionText,
      );

      const topicIsValid = isQuestionRelevant(
        questionText,
        question.questionText,
      );

      const accepted = scoreIsValid && intentIsValid && topicIsValid;

      console.log("Vector candidate validation:", {
        question: question.questionText,
        score: question.score,
        scoreIsValid,
        studentIntent,
        databaseIntent: getQuestionIntent(question.questionText),
        intentIsValid,
        relevance: getQuestionRelevance(questionText, question.questionText),
        topicIsValid,
        accepted,
      });

      return accepted;
    },
  );

  const topScore = rankedSemanticQuestions[0]?.score ?? 0;

  const secondScore = rankedSemanticQuestions[1]?.score ?? 0;

  const scoreMargin = topScore - secondScore;

  console.log("Semantic ranking summary:", {
    studentQuestion: questionText,
    studentIntent,
    topQuestion: rankedSemanticQuestions[0]?.questionText ?? null,
    topScore,
    secondQuestion: rankedSemanticQuestions[1]?.questionText ?? null,
    secondScore,
    scoreMargin,
    acceptedCandidates: relevantSemanticQuestions.map((question) => ({
      question: question.questionText,
      score: question.score,
    })),
  });

  // -----------------------------------------------
  // 5. Return verified semantic answer
  // -----------------------------------------------

  if (relevantSemanticQuestions.length > 0) {
    const verifiedResult = await findVerifiedAnswer(
      relevantSemanticQuestions.map((question) => question._id),
    );

    if (verifiedResult) {
      console.log("Verified answer found through semantic search.");

      return verifiedResult;
    }
  }

  // -----------------------------------------------
  // 6. No suitable verified answer
  // -----------------------------------------------

  console.log("No suitable verified answer found.");

  return {
    found: false,
    source: "no_answer",
  };
};
