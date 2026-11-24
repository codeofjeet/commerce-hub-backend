import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  getStudentConversations,
  getConversationDetails,
} from "../services/chatHistory.service.js";

// Get all conversations of logged-in student
export const getMyChatHistory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const studentId = req.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const conversations = await getStudentConversations({
      studentId,
    });

    res.status(200).json({
      success: true,
      message: "Chat history retrieved successfully.",
      data: conversations,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retrieve chat history.";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

// Get complete details of one conversation
export const getChatConversationDetails = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const studentId = req.user?.userId;
    const { conversationId } = req.params;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!conversationId || Array.isArray(conversationId)) {
      res.status(400).json({
        success: false,
        message: "Valid conversation ID is required.",
      });
      return;
    }

    const conversation = await getConversationDetails({
      studentId,
      conversationId,
    });

    res.status(200).json({
      success: true,
      message: "Conversation retrieved successfully.",
      data: conversation,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retrieve conversation.";

    res.status(400).json({
      success: false,
      message,
    });
  }
};
