import { Request, Response } from "express";
import Answer from "../models/Answer.js";
import mongoose from "mongoose";
import { z } from "zod";

import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import Chapter from "../models/Chapter.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { generateDocumentEmbedding } from "../services/embedding.service.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const questionSchema = z.object({
  questionText: z.string().trim().min(5).max(5000),
  subject: objectIdSchema,
  chapter: objectIdSchema,
  board: z.enum(["RBSE", "CBSE"]),
  courseLevel: z.enum(["11", "12", "BCom", "CA_FOUNDATION"]),
  questionType: z.enum(["MCQ", "SHORT", "LONG", "NUMERICAL"]).default("SHORT"),
  options: z.array(z.string().trim().min(1).max(500)).optional().default([]),

  // Correct option index for MCQ questions (0-based).
  correctOptionIndex: z.number().int().min(0).optional(),

  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  marks: z.number().min(0).max(100).default(1),
});

const updateQuestionSchema = questionSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

type QuestionInput = z.infer<typeof questionSchema>;

const validateQuestionReferences = async (
  subjectId: string,
  chapterId: string,
  board: "RBSE" | "CBSE",
  courseLevel: "11" | "12" | "BCom" | "CA_FOUNDATION",
): Promise<string | null> => {
  const subject = await Subject.findOne({
    _id: subjectId,
    isActive: true,
    boards: board,
    courseLevels: courseLevel,
  });

  if (!subject) {
    return "The selected subject does not support this board and course level.";
  }

  const chapter = await Chapter.findOne({
    _id: chapterId,
    subject: subjectId,
    board,
    courseLevel,
    isActive: true,
  });

  if (!chapter) {
    return "The selected chapter does not belong to this subject, board, and course level.";
  }

  return null;
};

// GET /api/questions
// Public: only published questions with verified answers are returned.
export const getQuestions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {
      status: "published",
    };

    if (req.query.board) {
      if (!["CBSE", "RBSE"].includes(String(req.query.board))) {
        res.status(400).json({
          success: false,
          message: "Board must be CBSE or RBSE.",
        });
        return;
      }

      filter.board = req.query.board;
    }

    if (req.query.courseLevel) {
      if (
        !["11", "12", "BCom", "CA_FOUNDATION"].includes(
          String(req.query.courseLevel),
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid course level.",
        });
        return;
      }

      filter.courseLevel = req.query.courseLevel;
    }

    if (req.query.subject) {
      if (!mongoose.isValidObjectId(String(req.query.subject))) {
        res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
        return;
      }

      filter.subject = req.query.subject;
    }

    if (req.query.chapter) {
      if (!mongoose.isValidObjectId(String(req.query.chapter))) {
        res.status(400).json({
          success: false,
          message: "Invalid chapter ID.",
        });
        return;
      }

      filter.chapter = req.query.chapter;
    }

    if (req.query.questionType) {
      const allowedTypes = ["MCQ", "SHORT", "LONG", "NUMERICAL"];

      if (!allowedTypes.includes(String(req.query.questionType))) {
        res.status(400).json({
          success: false,
          message: "Invalid question type.",
        });
        return;
      }

      filter.questionType = req.query.questionType;
    }

    if (req.query.difficulty) {
      const allowedDifficulties = ["easy", "medium", "hard"];

      if (!allowedDifficulties.includes(String(req.query.difficulty))) {
        res.status(400).json({
          success: false,
          message: "Invalid difficulty.",
        });
        return;
      }

      filter.difficulty = req.query.difficulty;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      if (search.length > 100) {
        res.status(400).json({
          success: false,
          message: "Search text must not exceed 100 characters.",
        });
        return;
      }

      if (search) {
        filter.questionText = {
          $regex: search,
          $options: "i",
        };
      }
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate("subject", "name slug")
        .populate("chapter", "title chapterNumber")
        .select("-createdBy -embedding -correctOptionIndex")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Question.countDocuments(filter),
    ]);

    // Retrieve only verified answers for the published questions.
    const questionIds = questions.map((question) => question._id);

    const answers = await Answer.find({
      question: { $in: questionIds },
      isVerified: true,
    }).select("question answerText explanation isVerified createdAt updatedAt");

    // Match each answer with its question.
    const answerMap = new Map(
      answers.map((answer) => [answer.question.toString(), answer]),
    );

    const data = questions.map((question) => {
      const questionObject = question.toObject();

      return {
        ...questionObject,
        answer: answerMap.get(question._id.toString()) ?? null,
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("Get questions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve questions.",
    });
  }
};

// GET /api/questions/:id
// Public: only published questions are visible.
export const getQuestionById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
      return;
    }

    const question = await Question.findOne({
      _id: req.params.id,
      status: "published",
    })
      .populate("subject", "name slug")
      .populate("chapter", "title chapterNumber")
      .select("-createdBy -embedding -correctOptionIndex");

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Published question not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("Get question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question.",
    });
  }
};

// POST /api/questions
// Admin only: creates a question in draft status.
export const createQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = questionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid question data.",
        errors: validation.error.issues,
      });
      return;
    }

    const data: QuestionInput = validation.data;

    if (data.questionType === "MCQ") {
      if (data.options.length < 2) {
        res.status(400).json({
          success: false,
          message: "MCQ questions must have at least two options.",
        });
        return;
      }

      if (
        data.correctOptionIndex === undefined ||
        data.correctOptionIndex >= data.options.length
      ) {
        res.status(400).json({
          success: false,
          message: "A valid correctOptionIndex is required for MCQ questions.",
        });
        return;
      }
    }

    if (data.questionType !== "MCQ") {
      if (data.options.length > 0) {
        res.status(400).json({
          success: false,
          message: "Options are only allowed for MCQ questions.",
        });
        return;
      }

      if (data.correctOptionIndex !== undefined) {
        res.status(400).json({
          success: false,
          message: "correctOptionIndex is only allowed for MCQ questions.",
        });
        return;
      }
    }

    const referenceError = await validateQuestionReferences(
      data.subject,
      data.chapter,
      data.board,
      data.courseLevel,
    );

    if (referenceError) {
      res.status(400).json({
        success: false,
        message: referenceError,
      });
      return;
    }

    const authenticatedRequest = req as AuthenticatedRequest;

    if (!authenticatedRequest.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    // Generate semantic embedding before saving.
    const embedding = await generateDocumentEmbedding(data.questionText);

    const question = await Question.create({
      ...data,
      embedding,
      status: "draft",
      createdBy: authenticatedRequest.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Question created successfully as draft.",
      data: question,
    });
  } catch (error) {
    console.error("Create question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create question.",
    });
  }
};

// PUT /api/questions/:id
// Admin only: updates a question and can publish/archive it.
export const updateQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
      return;
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
      return;
    }

    const validation = updateQuestionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid question data.",
        errors: validation.error.issues,
      });
      return;
    }

    const question = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found.",
      });
      return;
    }

    const updated = {
      questionText: validation.data.questionText ?? question.questionText,
      subject: validation.data.subject ?? String(question.subject),
      chapter: validation.data.chapter ?? String(question.chapter),
      board: validation.data.board ?? question.board,
      courseLevel: validation.data.courseLevel ?? question.courseLevel,
      questionType: validation.data.questionType ?? question.questionType,
      options: validation.data.options ?? question.options,
      correctOptionIndex:
        validation.data.correctOptionIndex ?? question.correctOptionIndex,
      difficulty: validation.data.difficulty ?? question.difficulty,
      marks: validation.data.marks ?? question.marks,
    };

    if (updated.questionType === "MCQ") {
      if (updated.options.length < 2) {
        res.status(400).json({
          success: false,
          message: "MCQ questions must have at least two options.",
        });
        return;
      }

      if (
        updated.correctOptionIndex === undefined ||
        updated.correctOptionIndex === null ||
        updated.correctOptionIndex >= updated.options.length
      ) {
        res.status(400).json({
          success: false,
          message: "A valid correctOptionIndex is required for MCQ questions.",
        });
        return;
      }
    }

    if (updated.questionType !== "MCQ" && updated.options.length > 0) {
      res.status(400).json({
        success: false,
        message: "Options are only allowed for MCQ questions.",
      });
      return;
    }

    if (updated.questionType !== "MCQ") {
      updated.correctOptionIndex = null;
    }

    const referenceError = await validateQuestionReferences(
      updated.subject,
      updated.chapter,
      updated.board,
      updated.courseLevel,
    );

    if (referenceError) {
      res.status(400).json({
        success: false,
        message: referenceError,
      });
      return;
    }

    // Regenerate embedding only when question text changes.
    const questionTextChanged =
      validation.data.questionText !== undefined &&
      validation.data.questionText !== question.questionText;

    if (questionTextChanged) {
      question.embedding = await generateDocumentEmbedding(
        updated.questionText,
      );
    }

    Object.assign(question, updated);

    if (validation.data.status) {
      question.status = validation.data.status;

      if (validation.data.status === "published" && !question.publishedAt) {
        question.publishedAt = new Date();
      }

      if (validation.data.status !== "published") {
        question.publishedAt = undefined;
      }
    }

    await question.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      data: question,
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question.",
    });
  }
};

// DELETE /api/questions/:id
// Admin only: soft-deactivates by archiving.
export const deactivateQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
      return;
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        status: "archived",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question archived successfully.",
      data: question,
    });
  } catch (error) {
    console.error("Archive question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive question.",
    });
  }
};
