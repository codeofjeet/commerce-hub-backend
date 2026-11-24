import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import TimedTest from "../models/TimedTest.js";
import TestAttempt from "../models/TestAttempt.js";
import User from "../models/User.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import Subject from "../models/Subject.js";
import Chapter from "../models/Chapter.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const timedTestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  subject: objectIdSchema,
  chapters: z.array(objectIdSchema).min(1),
  board: z.enum(["RBSE", "CBSE"]),
  courseLevel: z.enum(["11", "12", "BCom", "CA_FOUNDATION"]),
  questions: z.array(objectIdSchema).min(1),
  durationMinutes: z.number().int().min(1).max(600),
});

const updateTimedTestSchema = timedTestSchema.partial().extend({
  isActive: z.boolean().optional(),
});

type TimedTestInput = z.infer<typeof timedTestSchema>;

// Validate subject, chapters, questions and verified answers.
const validateTimedTestReferences = async (
  data: TimedTestInput,
): Promise<{ error: string | null; totalMarks: number }> => {
  const subject = await Subject.findOne({
    _id: data.subject,
    isActive: true,
    boards: data.board,
    courseLevels: data.courseLevel,
  });

  if (!subject) {
    return {
      error: "Selected subject does not support this board and course level.",
      totalMarks: 0,
    };
  }

  const uniqueChapters = [...new Set(data.chapters)];

  if (uniqueChapters.length !== data.chapters.length) {
    return {
      error: "Duplicate chapters are not allowed.",
      totalMarks: 0,
    };
  }

  const chapters = await Chapter.find({
    _id: { $in: uniqueChapters },
    subject: data.subject,
    board: data.board,
    courseLevel: data.courseLevel,
    isActive: true,
  });

  if (chapters.length !== uniqueChapters.length) {
    return {
      error:
        "One or more chapters do not belong to the selected subject, board and course level.",
      totalMarks: 0,
    };
  }

  const uniqueQuestions = [...new Set(data.questions)];

  if (uniqueQuestions.length !== data.questions.length) {
    return {
      error: "Duplicate questions are not allowed.",
      totalMarks: 0,
    };
  }

  const questions = await Question.find({
    _id: { $in: uniqueQuestions },
    subject: data.subject,
    chapter: { $in: uniqueChapters },
    board: data.board,
    courseLevel: data.courseLevel,
    status: "published",
  });

  if (questions.length !== uniqueQuestions.length) {
    return {
      error:
        "One or more questions are not published or do not match the selected test details.",
      totalMarks: 0,
    };
  }

  const nonMcqQuestions = questions.filter(
    (question) => question.questionType !== "MCQ",
  );

  const nonMcqQuestionIds = nonMcqQuestions.map((question) =>
    String(question._id),
  );

  if (nonMcqQuestionIds.length > 0) {
    const verifiedAnswers = await Answer.find({
      question: { $in: nonMcqQuestionIds },
      isVerified: true,
    }).select("question");

    const verifiedQuestionIds = new Set(
      verifiedAnswers.map((answer) => String(answer.question)),
    );

    const missingAnswers = nonMcqQuestionIds.filter(
      (id) => !verifiedQuestionIds.has(id),
    );

    if (missingAnswers.length > 0) {
      return {
        error: "Every non-MCQ test question must have a verified answer.",
        totalMarks: 0,
      };
    }
  }

  const totalMarks = questions.reduce(
    (sum, question) => sum + Number(question.marks || 0),
    0,
  );

  if (totalMarks <= 0) {
    return {
      error: "The total marks of the test must be greater than zero.",
      totalMarks: 0,
    };
  }

  return { error: null, totalMarks };
};

// GET /api/timed-tests
// Admin: Get all timed tests.
export const getTimedTests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

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

    if (req.query.board) {
      if (!["CBSE", "RBSE"].includes(String(req.query.board))) {
        res.status(400).json({
          success: false,
          message: "Invalid board.",
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

    if (req.query.isActive !== undefined) {
      if (!["true", "false"].includes(String(req.query.isActive))) {
        res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
        return;
      }

      filter.isActive = String(req.query.isActive) === "true";
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
      TimedTest.find(filter)
        .populate("subject", "name slug")
        .populate("chapters", "title chapterNumber")
        .populate("createdBy", "name email")
        .select("-questions")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TimedTest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: tests,
    });
  } catch (error) {
    console.error("Get timed tests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve timed tests.",
    });
  }
};

// GET /api/timed-tests/:id
// Admin: Get a single timed test.
export const getTimedTestById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
      });
      return;
    }

    const test = await TimedTest.findById(req.params.id)
      .populate("subject", "name slug")
      .populate("chapters", "title chapterNumber")
      .populate({
        path: "questions",
        select: "questionText questionType options difficulty marks",
      })
      .populate("createdBy", "name email");

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Timed test not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error("Get timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve timed test.",
    });
  }
};

// POST /api/timed-tests
// Admin: Create a timed test.
export const createTimedTest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = timedTestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test data.",
        errors: validation.error.issues,
      });
      return;
    }

    const data = validation.data;

    const referenceValidation = await validateTimedTestReferences(data);

    if (referenceValidation.error) {
      res.status(400).json({
        success: false,
        message: referenceValidation.error,
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

    const test = await TimedTest.create({
      ...data,
      totalQuestions: data.questions.length,
      totalMarks: referenceValidation.totalMarks,
      isActive: true,
      createdBy: authenticatedRequest.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Timed test created successfully.",
      data: test,
    });
  } catch (error) {
    console.error("Create timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create timed test.",
    });
  }
};

// PUT /api/timed-tests/:id
// Admin: Update a timed test.
export const updateTimedTest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
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

    const validation = updateTimedTestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test data.",
        errors: validation.error.issues,
      });
      return;
    }

    const test = await TimedTest.findById(req.params.id);

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Timed test not found.",
      });
      return;
    }

    const updatedData: TimedTestInput = {
      title: validation.data.title ?? test.title,
      description: validation.data.description ?? test.description,
      subject: validation.data.subject ?? String(test.subject),
      chapters: validation.data.chapters ?? test.chapters.map(String),
      board: validation.data.board ?? test.board,
      courseLevel: validation.data.courseLevel ?? test.courseLevel,
      questions: validation.data.questions ?? test.questions.map(String),
      durationMinutes: validation.data.durationMinutes ?? test.durationMinutes,
    };

    const referenceValidation = await validateTimedTestReferences(updatedData);

    if (referenceValidation.error) {
      res.status(400).json({
        success: false,
        message: referenceValidation.error,
      });
      return;
    }

    Object.assign(test, {
      ...updatedData,
      totalQuestions: updatedData.questions.length,
      totalMarks: referenceValidation.totalMarks,
    });

    if (validation.data.isActive !== undefined) {
      test.isActive = validation.data.isActive;
    }

    await test.save();

    res.status(200).json({
      success: true,
      message: "Timed test updated successfully.",
      data: test,
    });
  } catch (error) {
    console.error("Update timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update timed test.",
    });
  }
};

// PATCH /api/timed-tests/:id/status
// Admin: Activate or deactivate a timed test.
export const updateTimedTestStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
      });
      return;
    }

    const validation = z
      .object({
        isActive: z.boolean(),
      })
      .safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
      return;
    }

    const test = await TimedTest.findByIdAndUpdate(
      req.params.id,
      { isActive: validation.data.isActive },
      { new: true, runValidators: true },
    );

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Timed test not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Timed test ${test.isActive ? "activated" : "deactivated"} successfully.`,
      data: test,
    });
  } catch (error) {
    console.error("Update timed test status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update timed test status.",
    });
  }
};

// GET /api/timed-tests/student/available
// Student: Get active tests matching the student's academic details.
export const getStudentAvailableTimedTests = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const student = await User.findById(req.user?.userId).select(
      "name role board classLevel isActive",
    );

    if (!student || student.role !== "student" || !student.isActive) {
      res.status(403).json({
        success: false,
        message: "Active student account not found.",
      });
      return;
    }

    if (!student.board || !student.classLevel) {
      res.status(400).json({
        success: false,
        message: "Please complete your board and class details.",
      });
      return;
    }

    const tests = await TimedTest.find({
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    })
      .populate("subject", "name slug")
      .populate("chapters", "title chapterNumber")
      .select(
        "title description subject chapters board courseLevel durationMinutes totalQuestions totalMarks createdAt",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error("Get student available timed tests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve available tests.",
    });
  }
};

// GET /api/timed-tests/student/:id
// Student: Get instructions and details for one available test.
export const getStudentTimedTestById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
      });
      return;
    }

    const student = await User.findById(req.user?.userId).select(
      "role board classLevel isActive",
    );

    if (!student || student.role !== "student" || !student.isActive) {
      res.status(403).json({
        success: false,
        message: "Active student account not found.",
      });
      return;
    }

    if (!student.board || !student.classLevel) {
      res.status(400).json({
        success: false,
        message: "Please complete your board and class details.",
      });
      return;
    }

    const test = await TimedTest.findOne({
      _id: req.params.id,
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    })
      .populate("subject", "name slug")
      .populate("chapters", "title chapterNumber")
      .select(
        "title description subject chapters board courseLevel durationMinutes totalQuestions totalMarks createdAt",
      );

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found or not available for your class.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error("Get student timed test details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve test details.",
    });
  }
};

// POST /api/timed-tests/student/:id/start
// Student: Start a timed examination.
export const startStudentTimedTest = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const testId = String(req.params.id);

    if (!mongoose.isValidObjectId(testId)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
      });
      return;
    }

    // Verify authenticated student
    const student = await User.findById(req.user?.userId).select(
      "role board classLevel isActive",
    );

    if (!student || student.role !== "student" || !student.isActive) {
      res.status(403).json({
        success: false,
        message: "Active student account not found.",
      });
      return;
    }

    if (!student.board || !student.classLevel) {
      res.status(400).json({
        success: false,
        message: "Please complete your board and class details.",
      });
      return;
    }

    // Find test matching student's academic details
    const test = await TimedTest.findOne({
      _id: testId,
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found or not available for your class.",
      });
      return;
    }

    // Check for an existing active attempt
    const existingAttempt = await TestAttempt.findOne({
      student: student._id,
      test: test._id,
      status: "in_progress",
    });

    if (existingAttempt) {
      if (existingAttempt.expiresAt.getTime() <= Date.now()) {
        existingAttempt.status = "expired";
        existingAttempt.submittedAt = new Date();
        await existingAttempt.save();
      } else {
        res.status(409).json({
          success: false,
          message: "You already have an examination in progress for this test.",
          data: {
            attemptId: existingAttempt._id,
            expiresAt: existingAttempt.expiresAt,
          },
        });
        return;
      }
    }

    // Retrieve only published questions
    const questions = await Question.find({
      _id: { $in: test.questions },
      status: "published",
    })
      .select("questionText questionType options difficulty marks")
      .lean();

    if (questions.length !== test.questions.length) {
      res.status(400).json({
        success: false,
        message:
          "Some test questions are no longer published. Please contact the administrator.",
      });
      return;
    }

    // Preserve the question order configured by admin
    questions.sort(
      (a, b) =>
        test.questions.findIndex(
          (id: mongoose.Types.ObjectId) => String(id) === String(a._id),
        ) -
        test.questions.findIndex(
          (id: mongoose.Types.ObjectId) => String(id) === String(b._id),
        ),
    );

    // Confirm that every question still has a verified answer
    const verifiedAnswers = await Answer.find({
      question: { $in: test.questions },
      isVerified: true,
    }).select("question");

    const verifiedQuestionIds = new Set(
      verifiedAnswers.map((answer) => String(answer.question)),
    );

    const hasMissingAnswer = test.questions.some(
      (id: mongoose.Types.ObjectId) => !verifiedQuestionIds.has(String(id)),
    );

    if (hasMissingAnswer) {
      res.status(400).json({
        success: false,
        message:
          "Some questions do not have verified answers. Please contact the administrator.",
      });
      return;
    }

    // Initialize examination timer
    const startedAt = new Date();

    const expiresAt = new Date(
      startedAt.getTime() + test.durationMinutes * 60 * 1000,
    );

    // Create examination attempt
    const attempt = await TestAttempt.create({
      student: student._id,
      test: test._id,
      questions: test.questions,
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      marksObtained: 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      status: "in_progress",
      startedAt,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: "Examination started successfully.",
      data: {
        attemptId: attempt._id,
        testId: test._id,
        title: test.title,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        questions,
      },
    });
  } catch (error) {
    console.error("Start student timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to start the examination.",
    });
  }
};
