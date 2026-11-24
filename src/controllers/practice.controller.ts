import type { Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import User from "../models/User.js";
import Chapter from "../models/Chapter.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import PracticeAttempt from "../models/PracticeAttempt.js";
import StudentResponse from "../models/StudentResponse.js";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const startPracticeSchema = z.object({
  chapterId: z
    .string()
    .refine(
      (value) => mongoose.Types.ObjectId.isValid(value),
      "Invalid chapter ID",
    ),
  questionLimit: z.number().int().min(1).max(100).default(10),
});

const submitAnswerSchema = z
  .object({
    selectedOptionIndex: z.number().int().min(0).optional(),
    responseText: z.string().trim().max(10000).optional(),
  })
  .refine(
    (data) =>
      data.selectedOptionIndex !== undefined || Boolean(data.responseText),
    "Please provide an answer",
  );

const getAttemptId = (req: AuthenticatedRequest): string => {
  return String(req.params.attemptId || "");
};

// START PRACTICE
export const startPractice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "student") {
    res.status(403).json({
      success: false,
      message: "Only students can start practice",
    });
    return;
  }

  const parsed = startPracticeSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid practice details",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const student = await User.findById(req.user.userId);

    if (!student || !student.isActive) {
      res.status(404).json({
        success: false,
        message: "Student account not found or inactive",
      });
      return;
    }

    if (!student.board || !student.classLevel) {
      res.status(400).json({
        success: false,
        message: "Please complete your academic profile first",
      });
      return;
    }

    const chapter = await Chapter.findOne({
      _id: parsed.data.chapterId,
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: "Chapter not found for your academic program",
      });
      return;
    }

    // Only questions with verified answers can enter practice.
    const verifiedQuestionIds = await Answer.distinct("question", {
      isVerified: true,
    });

    const questions = await Question.find({
      _id: { $in: verifiedQuestionIds },
      chapter: chapter._id,
      subject: chapter.subject,
      board: student.board,
      courseLevel: student.classLevel,
      status: "published",
    })
      .select("_id")
      .sort({ createdAt: 1 })
      .limit(parsed.data.questionLimit);

    if (questions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No verified questions are available in this chapter yet",
      });
      return;
    }

    const attempt = await PracticeAttempt.create({
      student: student._id,
      subject: chapter.subject,
      chapter: chapter._id,
      board: student.board,
      courseLevel: student.classLevel,
      questions: questions.map((question) => question._id),
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
    });

    res.status(201).json({
      success: true,
      message: "Practice started successfully",
      data: {
        attemptId: attempt._id,
        totalQuestions: attempt.totalQuestions,
        currentQuestionIndex: attempt.currentQuestionIndex,
        status: attempt.status,
      },
    });
  } catch (error) {
    console.error("Start practice error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to start practice",
    });
  }
};

// GET CURRENT QUESTION
export const getCurrentPracticeQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const attemptId = getAttemptId(req);

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(400).json({
      success: false,
      message: "Invalid practice attempt ID",
    });
    return;
  }

  try {
    const attempt = await PracticeAttempt.findOne({
      _id: attemptId,
      student: req.user.userId,
    }).populate("chapter", "title chapterNumber");

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Practice attempt not found",
      });
      return;
    }

    if (attempt.status === "completed") {
      res.status(400).json({
        success: false,
        message: "This practice session is already completed",
      });
      return;
    }

    const questionId = attempt.questions[attempt.currentQuestionIndex];

    if (!questionId) {
      res.status(404).json({
        success: false,
        message: "Current question not found",
      });
      return;
    }

    const question = await Question.findOne({
      _id: questionId,
      status: "published",
    }).select("-correctOptionIndex");

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question is no longer available",
      });
      return;
    }

    const previousResponse = await StudentResponse.findOne({
      attempt: attempt._id,
      question: question._id,
    });

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        chapter: attempt.chapter,
        currentQuestionIndex: attempt.currentQuestionIndex,
        totalQuestions: attempt.totalQuestions,
        progress: Math.round(
          ((attempt.currentQuestionIndex + 1) / attempt.totalQuestions) * 100,
        ),
        question,
        alreadyAnswered: Boolean(previousResponse),
      },
    });
  } catch (error) {
    console.error("Get practice question error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load practice question",
    });
  }
};

// SUBMIT ANSWER
export const submitPracticeAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const attemptId = getAttemptId(req);

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(400).json({
      success: false,
      message: "Invalid practice attempt ID",
    });
    return;
  }

  const parsed = submitAnswerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid answer",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const attempt = await PracticeAttempt.findOne({
      _id: attemptId,
      student: req.user.userId,
      status: "in_progress",
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Active practice attempt not found",
      });
      return;
    }

    const questionId = attempt.questions[attempt.currentQuestionIndex];

    const question = await Question.findOne({
      _id: questionId,
      status: "published",
    });

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    const existingResponse = await StudentResponse.findOne({
      attempt: attempt._id,
      question: question._id,
    });

    if (existingResponse) {
      res.status(409).json({
        success: false,
        message: "You have already answered this question",
      });
      return;
    }

    let isCorrect: boolean | null = null;
    let evaluationStatus: "auto_evaluated" | "pending_review" | "reviewed" =
      "pending_review";

    let marksAwarded = 0;

    if (question.questionType === "MCQ") {
      const selectedIndex = parsed.data.selectedOptionIndex;

      if (
        selectedIndex === undefined ||
        selectedIndex >= question.options.length
      ) {
        res.status(400).json({
          success: false,
          message: "Please select a valid MCQ option",
        });
        return;
      }

      if (
        question.correctOptionIndex === null ||
        question.correctOptionIndex === undefined
      ) {
        res.status(400).json({
          success: false,
          message: "Correct MCQ answer has not been configured",
        });
        return;
      }

      isCorrect = selectedIndex === question.correctOptionIndex;
      evaluationStatus = "auto_evaluated";
      marksAwarded = isCorrect ? question.marks : 0;
    } else {
      if (!parsed.data.responseText) {
        res.status(400).json({
          success: false,
          message: "Please enter your written answer",
        });
        return;
      }

      if (parsed.data.selectedOptionIndex !== undefined) {
        res.status(400).json({
          success: false,
          message: "Written questions require responseText",
        });
        return;
      }
    }

    await StudentResponse.create({
      attempt: attempt._id,
      student: req.user.userId,
      question: question._id,
      responseText: parsed.data.responseText || "",
      selectedOptionIndex: parsed.data.selectedOptionIndex ?? null,
      isCorrect,
      evaluationStatus,
      marksAwarded,
    });

    attempt.answeredQuestions += 1;

    if (question.questionType === "MCQ") {
      if (isCorrect) {
        attempt.correctAnswers += 1;
      } else {
        attempt.incorrectAnswers += 1;
      }
    }

    await attempt.save();

    // Release the verified answer only after submission.
    const verifiedAnswer = await Answer.findOne({
      question: question._id,
      isVerified: true,
    }).select("answerText explanation");

    res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        questionType: question.questionType,
        isCorrect,
        evaluationStatus,
        marksAwarded,
        feedback:
          question.questionType === "MCQ"
            ? isCorrect
              ? "Correct answer!"
              : "Incorrect answer. Review the explanation."
            : "Your written answer has been submitted for evaluation.",
        verifiedAnswer,
      },
    });
  } catch (error) {
    console.error("Submit practice answer error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit answer",
    });
  }
};

// MOVE TO NEXT QUESTION
export const nextPracticeQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const attemptId = getAttemptId(req);

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(400).json({
      success: false,
      message: "Invalid practice attempt ID",
    });
    return;
  }

  try {
    const attempt = await PracticeAttempt.findOne({
      _id: attemptId,
      student: req.user.userId,
      status: "in_progress",
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Active practice attempt not found",
      });
      return;
    }

    const currentQuestionId = attempt.questions[attempt.currentQuestionIndex];

    const response = await StudentResponse.findOne({
      attempt: attempt._id,
      question: currentQuestionId,
    });

    if (!response) {
      res.status(400).json({
        success: false,
        message: "Please submit your answer before continuing",
      });
      return;
    }

    const isLastQuestion =
      attempt.currentQuestionIndex >= attempt.totalQuestions - 1;

    if (isLastQuestion) {
      attempt.status = "completed";
      attempt.completedAt = new Date();
      await attempt.save();

      res.status(200).json({
        success: true,
        message: "Practice completed successfully",
        data: {
          completed: true,
          attemptId: attempt._id,
        },
      });
      return;
    }

    attempt.currentQuestionIndex += 1;
    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Next question is ready",
      data: {
        completed: false,
        currentQuestionIndex: attempt.currentQuestionIndex,
        totalQuestions: attempt.totalQuestions,
      },
    });
  } catch (error) {
    console.error("Next practice question error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to move to the next question",
    });
  }
};

// GET PRACTICE RESULT
export const getPracticeResult = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const attemptId = getAttemptId(req);

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(400).json({
      success: false,
      message: "Invalid practice attempt ID",
    });
    return;
  }

  try {
    const attempt = await PracticeAttempt.findOne({
      _id: attemptId,
      student: req.user.userId,
    })
      .populate("subject", "name")
      .populate("chapter", "title chapterNumber");

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Practice attempt not found",
      });
      return;
    }

    const responses = await StudentResponse.find({
      attempt: attempt._id,
    }).populate("question", "questionText questionType marks");

    res.status(200).json({
      success: true,
      data: {
        attempt,
        responses,
        summary: {
          totalQuestions: attempt.totalQuestions,
          answeredQuestions: attempt.answeredQuestions,
          correctAnswers: attempt.correctAnswers,
          incorrectAnswers: attempt.incorrectAnswers,
          pendingEvaluation: responses.filter(
            (item) => item.evaluationStatus === "pending_review",
          ).length,
          status: attempt.status,
        },
      },
    });
  } catch (error) {
    console.error("Practice result error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve practice result",
    });
  }
};

// GET STUDENT'S PREVIOUS PRACTICE ATTEMPTS
export const getMyPracticeAttempts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const attempts = await PracticeAttempt.find({
      student: req.user.userId,
    })
      .populate("subject", "name")
      .populate("chapter", "title chapterNumber")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    console.error("My practice attempts error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve practice history",
    });
  }
};
