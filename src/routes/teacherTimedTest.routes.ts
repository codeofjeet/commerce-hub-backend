import { Router } from "express";

import {
  getPendingTimedTestAnswers,
  evaluateTimedTestAnswer,
} from "../controllers/teacherTimedTest.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Only authenticated teachers can access these routes.
router.use(protect, authorize("teacher"));

// Get written answers waiting for teacher evaluation.
router.get("/pending", getPendingTimedTestAnswers);

// Evaluate a student's written answer.
router.patch("/:responseId/evaluate", evaluateTimedTestAnswer);

export default router;
