import mongoose from "mongoose";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import { sendChatMessage } from "../services/chat.service.js";
import ChatConversation from "../models/ChatConversation.js";

// Send student message
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { subjectId, chapterId, questionText, conversationId } = req.body;

    if (!subjectId || !questionText) {
      res.status(400).json({
        success: false,
        message: "Subject ID and question text are required.",
      });
      return;
    }

    if (
      typeof subjectId !== "string" ||
      typeof questionText !== "string" ||
      (chapterId !== undefined && typeof chapterId !== "string") ||
      (conversationId !== undefined && typeof conversationId !== "string")
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid request data.",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
      return;
    }

    if (chapterId && !mongoose.Types.ObjectId.isValid(chapterId)) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter ID.",
      });
      return;
    }

    const studentId = req.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const result = await sendChatMessage({
      studentId,
      subjectId,
      chapterId,
      questionText,
      conversationId,
    });

    res.status(200).json({
      success: true,
      message: "Chat response generated successfully.",
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

// Rename student conversation
export const renameConversation = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const studentId = req.user?.userId;
    const conversationId = req.params.conversationId;
    const { customTitle } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (
      typeof conversationId !== "string" ||
      !mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
      return;
    }

    if (typeof customTitle !== "string") {
      res.status(400).json({
        success: false,
        message: "Conversation title is required.",
      });
      return;
    }

    const trimmedTitle = customTitle.trim();

    if (!trimmedTitle) {
      res.status(400).json({
        success: false,
        message: "Conversation title cannot be empty.",
      });
      return;
    }

    if (trimmedTitle.length > 100) {
      res.status(400).json({
        success: false,
        message: "Conversation title cannot exceed 100 characters.",
      });
      return;
    }

    const conversation = await ChatConversation.findOneAndUpdate(
      {
        _id: conversationId,
        student: studentId,
        isActive: true,
      },
      {
        $set: {
          customTitle: trimmedTitle,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Conversation renamed successfully.",
      data: {
        conversationId: conversation._id.toString(),
        customTitle: conversation.customTitle,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to rename conversation.";

    res.status(500).json({
      success: false,
      message,
    });
  }
};

// Delete student conversation
export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const studentId = req.user?.userId;
    const conversationId = req.params.conversationId;

    if (typeof conversationId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
      return;
    }

    const deletedConversation = await ChatConversation.findOneAndDelete({
      _id: conversationId,
      student: studentId,
    });

    if (!deletedConversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
      data: {
        conversationId,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to delete conversation.";

    res.status(500).json({
      success: false,
      message,
    });
  }
};
