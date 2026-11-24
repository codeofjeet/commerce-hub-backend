import { Response } from "express";
import mongoose from "mongoose";

import TestAttempt from "../models/TestAttempt.js";
import TestResponse from "../models/TestResponse.js";
import TimedTest from "../models/TimedTest.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

// ==========================================
// GET PENDING TIMED TEST ANSWERS
// ==========================================

export const getPendingTimedTestAnswers = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher authentication.",
      });
    }

    const teacher = await mongoose.model("User").findById(teacherId);

    if (!teacher || teacher.role !== "teacher" || !teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "Active teacher access required.",
      });
    }

    const assignedSubjects = (teacher.assignedSubjects || []).map(
      (id: mongoose.Types.ObjectId) => id.toString(),
    );

    if (assignedSubjects.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const responses = await TestResponse.find({
      evaluationStatus: "pending_review",
    })
      .populate({
        path: "attempt",
        match: { status: { $in: ["submitted", "evaluated"] } },
        populate: [
          {
            path: "student",
            select: "name email",
          },
          {
            path: "test",
            select: "title subject board courseLevel",
            populate: {
              path: "subject",
              select: "name",
            },
          },
        ],
      })
      .populate({
        path: "question",
        select: "questionText questionType marks options",
      })
      .sort({ createdAt: 1 });

    const filteredResponses = responses.filter((response: any) => {
      const attempt = response.attempt as any;

      if (!attempt || !attempt.test) {
        return false;
      }

      const subjectId =
        attempt.test.subject?._id?.toString() ||
        attempt.test.subject?.toString();

      return assignedSubjects.includes(subjectId);
    });

    return res.status(200).json({
      success: true,
      count: filteredResponses.length,
      data: filteredResponses,
    });
  } catch (error) {
    console.error("Get pending timed test answers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve pending timed test answers.",
    });
  }
};

// ==========================================
// EVALUATE STUDENT TIMED TEST ANSWER
// ==========================================

export const evaluateTimedTestAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const teacherId = req.user?.userId;
    const { responseId } = req.params;

    if (
      !teacherId ||
      !mongoose.Types.ObjectId.isValid(teacherId) ||
      !mongoose.Types.ObjectId.isValid(String(responseId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher or response ID.",
      });
    }

    const { marksAwarded, feedback } = req.body;

    if (
      typeof marksAwarded !== "number" ||
      !Number.isFinite(marksAwarded) ||
      marksAwarded < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid marksAwarded is required.",
      });
    }

    if (feedback !== undefined && typeof feedback !== "string") {
      return res.status(400).json({
        success: false,
        message: "Feedback must be text.",
      });
    }

    const teacher = await mongoose.model("User").findById(teacherId);

    if (!teacher || teacher.role !== "teacher" || !teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "Active teacher access required.",
      });
    }

    const response = await TestResponse.findById(responseId)
      .populate("attempt")
      .populate("question");

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Student answer not found.",
      });
    }

    if (response.evaluationStatus !== "pending_review") {
      return res.status(400).json({
        success: false,
        message: "This answer has already been evaluated.",
      });
    }

    const attempt = response.attempt as any;
    const question = response.question as any;

    if (!attempt || !question) {
      return res.status(404).json({
        success: false,
        message: "Attempt or question not found.",
      });
    }

    if (!["submitted", "evaluated"].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: "Only submitted examinations can be evaluated.",
      });
    }

    const test = await TimedTest.findById(attempt.test).select("subject");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Timed test not found.",
      });
    }

    const assignedSubjects = (teacher.assignedSubjects || []).map(
      (id: mongoose.Types.ObjectId) => id.toString(),
    );

    if (!assignedSubjects.includes(test.subject.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this subject.",
      });
    }

    if (marksAwarded > question.marks) {
      return res.status(400).json({
        success: false,
        message: `Maximum marks for this question are ${question.marks}.`,
      });
    }

    // Save teacher evaluation
    response.marksAwarded = marksAwarded;
    response.feedback = (feedback || "").trim();
    response.evaluationStatus = "reviewed";
    response.evaluatedBy = new mongoose.Types.ObjectId(teacherId);
    response.evaluatedAt = new Date();

    // Written answers are marked correct when they receive full marks.
    response.isCorrect = marksAwarded === question.marks;

    await response.save();

    // Recalculate examination result
    const allResponses = await TestResponse.find({
      attempt: attempt._id,
    });

    const totalMarksAwarded = allResponses.reduce(
      (sum, item) => sum + (item.marksAwarded || 0),
      0,
    );

    const pendingCount = allResponses.filter(
      (item) => item.evaluationStatus === "pending_review",
    ).length;

    const correctCount = allResponses.filter(
      (item) => item.isCorrect === true,
    ).length;

    const incorrectCount = allResponses.filter(
      (item) => item.isCorrect === false,
    ).length;

    await TestAttempt.findByIdAndUpdate(attempt._id, {
      marksObtained: totalMarksAwarded,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      status: pendingCount === 0 ? "evaluated" : "submitted",
      evaluatedAt: pendingCount === 0 ? new Date() : null,
    });

    return res.status(200).json({
      success: true,
      message: "Timed test answer evaluated successfully.",
      data: {
        responseId: response._id,
        marksAwarded: response.marksAwarded,
        maximumMarks: question.marks,
        feedback: response.feedback,
        evaluationStatus: response.evaluationStatus,
        pendingEvaluation: pendingCount,
        marksObtained: totalMarksAwarded,
        status: pendingCount === 0 ? "evaluated" : "submitted",
      },
    });
  } catch (error) {
    console.error("Evaluate timed test answer error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to evaluate timed test answer.",
    });
  }
};
