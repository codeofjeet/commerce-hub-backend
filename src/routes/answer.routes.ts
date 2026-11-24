import { Router } from "express";

import {
  getAnswerByQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} from "../controllers/answer.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Public route
router.get("/question/:questionId", getAnswerByQuestion);

// Admin-only routes
router.post("/", protect, authorize("admin"), createAnswer);
router.put("/:id", protect, authorize("admin"), updateAnswer);
router.delete("/:id", protect, authorize("admin"), deleteAnswer);

export default router;
