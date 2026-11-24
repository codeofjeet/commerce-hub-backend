import { Router } from "express";

import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deactivateQuestion,
} from "../controllers/question.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getQuestions);
router.get("/:id", getQuestionById);

// Admin-only routes
router.post("/", protect, authorize("admin"), createQuestion);
router.put("/:id", protect, authorize("admin"), updateQuestion);
router.delete("/:id", protect, authorize("admin"), deactivateQuestion);

export default router;
