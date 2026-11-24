import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Answer from "../models/Answer.js";
import Question from "../models/Question.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const answerSchema = z.object({
  question: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid question ID"),
  answerText: z.string().trim().min(2).max(15000),
  explanation: z.string().trim().max(15000).optional().default(""),
});

const updateAnswerSchema = z.object({
  answerText: z.string().trim().min(2).max(15000).optional(),
  explanation: z.string().trim().max(15000).optional(),
  isVerified: z.boolean().optional(),
});

// GET /api/answers/question/:questionId
// Public: only verified answers for published questions are visible.
export const getAnswerByQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { questionId } = req.params;

    if (!mongoose.isValidObjectId(questionId)) {
      res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
      return;
    }

    const question = await Question.findOne({
      _id: questionId,
      status: "published",
    });

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Published question not found.",
      });
      return;
    }

    const answer = await Answer.findOne({
      question: questionId,
      isVerified: true,
    }).select("-answeredBy");

    if (!answer) {
      res.status(404).json({
        success: false,
        message: "Verified answer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    console.error("Get answer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve answer.",
    });
  }
};

// POST /api/answers
// Admin only: creates an unverified answer.
export const createAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = answerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid answer data.",
        errors: validation.error.issues,
      });
      return;
    }

    const question = await Question.findById(validation.data.question);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found.",
      });
      return;
    }

    if (question.status === "archived") {
      res.status(400).json({
        success: false,
        message: "Cannot add an answer to an archived question.",
      });
      return;
    }

    const existingAnswer = await Answer.findOne({
      question: validation.data.question,
    });

    if (existingAnswer) {
      res.status(409).json({
        success: false,
        message:
          "An answer already exists for this question. Use update instead.",
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

    const answer = await Answer.create({
      ...validation.data,
      answeredBy: authenticatedRequest.user.userId,
      isVerified: false,
    });

    res.status(201).json({
      success: true,
      message: "Answer created successfully. Verification is pending.",
      data: answer,
    });
  } catch (error) {
    console.error("Create answer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create answer.",
    });
  }
};

// PUT /api/answers/:id
// Admin only: updates or verifies an answer.
export const updateAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid answer ID.",
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

    const validation = updateAnswerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid answer data.",
        errors: validation.error.issues,
      });
      return;
    }

    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      res.status(404).json({
        success: false,
        message: "Answer not found.",
      });
      return;
    }

    if (validation.data.answerText !== undefined) {
      answer.answerText = validation.data.answerText;
    }

    if (validation.data.explanation !== undefined) {
      answer.explanation = validation.data.explanation;
    }

    if (validation.data.isVerified !== undefined) {
      answer.isVerified = validation.data.isVerified;
    }

    await answer.save();

    res.status(200).json({
      success: true,
      message: "Answer updated successfully.",
      data: answer,
    });
  } catch (error) {
    console.error("Update answer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update answer.",
    });
  }
};

// DELETE /api/answers/:id
// Admin only: removes an answer.
export const deleteAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid answer ID.",
      });
      return;
    }

    const answer = await Answer.findByIdAndDelete(req.params.id);

    if (!answer) {
      res.status(404).json({
        success: false,
        message: "Answer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Answer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete answer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete answer.",
    });
  }
};
