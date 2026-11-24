import { Router } from "express";

import {
  getMyChatHistory,
  getChatConversationDetails,
} from "../controllers/chatHistory.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Get all conversations of logged-in student
router.get("/history", protect, authorize("student"), getMyChatHistory);

// Get messages of a particular conversation
router.get(
  "/history/:conversationId",
  protect,
  authorize("student"),
  getChatConversationDetails,
);

export default router;
