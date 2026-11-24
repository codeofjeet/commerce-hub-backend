import { Router } from "express";

import {
  sendMessage,
  deleteConversation,
  renameConversation,
} from "../controllers/chat.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Send a chat message
router.post("/message", protect, authorize("student"), sendMessage);

// Rename a conversation
router.patch(
  "/history/:conversationId/rename",
  protect,
  authorize("student"),
  renameConversation,
);

// Delete a conversation
router.delete(
  "/history/:conversationId",
  protect,
  authorize("student"),
  deleteConversation,
);

export default router;
