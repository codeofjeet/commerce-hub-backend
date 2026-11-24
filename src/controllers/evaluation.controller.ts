import type { Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import StudentResponse from "../models/StudentResponse.js";
import PracticeAttempt from "../models/PracticeAttempt.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import User from "../models/User.js";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const evaluationSchema = z.object({
  marksAwarded: z.number().finite().min(0),
  feedback: z.string().trim().max(2000).default(""),
});

const getResponseId = (req: AuthenticatedRequest): string => {
  return String(req.params.responseId || "");
};

// GET PENDING EVALUATIONS
export const getPendingEvaluations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const responses = await StudentResponse.find({
      evaluationStatus: "pending_review",
    })
      .populate("student", "name email")
      .populate("question", "questionText questionType marks")
      .populate("attempt", "subject chapter board courseLevel status")
      .sort({ submittedAt: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: responses.length,
      data: responses,
    });
  } catch (error) {
    console.error("Get pending evaluations error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve pending evaluations",
    });
  }
};

// GET SINGLE EVALUATION DETAILS
export const getEvaluationDetails = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const responseId = getResponseId(req);

  if (!mongoose.Types.ObjectId.isValid(responseId)) {
    res.status(400).json({
      success: false,
      message: "Invalid student response ID",
    });
    return;
  }

  try {
    const studentResponse = await StudentResponse.findById(responseId)
      .populate("student", "name email")
      .populate("question", "questionText questionType options marks")
      .populate({
        path: "attempt",
        select: "subject chapter board courseLevel status",
        populate: [
          { path: "subject", select: "name" },
          { path: "chapter", select: "title chapterNumber" },
        ],
      });

    if (!studentResponse) {
      res.status(404).json({
        success: false,
        message: "Student response not found",
      });
      return;
    }

    const verifiedAnswer = await Answer.findOne({
      question: studentResponse.question._id,
      isVerified: true,
    }).select("answerText explanation");

    res.status(200).json({
      success: true,
      data: {
        response: studentResponse,
        verifiedAnswer,
      },
    });
  } catch (error) {
    console.error("Get evaluation details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve evaluation details",
    });
  }
};

// SUBMIT TEACHER/ADMIN EVALUATION
export const submitEvaluation = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const responseId = getResponseId(req);

  if (!mongoose.Types.ObjectId.isValid(responseId)) {
    res.status(400).json({
      success: false,
      message: "Invalid student response ID",
    });
    return;
  }

  const parsed = evaluationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid evaluation details",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const studentResponse = await StudentResponse.findOne({
      _id: responseId,
      evaluationStatus: "pending_review",
    });

    if (!studentResponse) {
      res.status(404).json({
        success: false,
        message: "Pending student response not found or already evaluated",
      });
      return;
    }

    const question = await Question.findById(studentResponse.question);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Associated question not found",
      });
      return;
    }

    if (parsed.data.marksAwarded > question.marks) {
      res.status(400).json({
        success: false,
        message: `Awarded marks cannot exceed ${question.marks}`,
      });
      return;
    }

    const attempt = await PracticeAttempt.findById(studentResponse.attempt);

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Associated practice attempt not found",
      });
      return;
    }

    // Full marks means the written answer is considered correct.
    const isCorrect = parsed.data.marksAwarded === question.marks;

    studentResponse.marksAwarded = parsed.data.marksAwarded;
    studentResponse.feedback = parsed.data.feedback;
    studentResponse.isCorrect = isCorrect;
    studentResponse.evaluationStatus = "reviewed";

    await studentResponse.save();

    // Include the evaluated written answer in the attempt totals.
    if (isCorrect) {
      attempt.correctAnswers += 1;
    } else {
      attempt.incorrectAnswers += 1;
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Student answer evaluated successfully",
      data: {
        responseId: studentResponse._id,
        marksAwarded: studentResponse.marksAwarded,
        maximumMarks: question.marks,
        isCorrect: studentResponse.isCorrect,
        evaluationStatus: studentResponse.evaluationStatus,
        feedback: studentResponse.feedback,
      },
    });
  } catch (error) {
    console.error("Submit evaluation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit evaluation",
    });
  }
};
