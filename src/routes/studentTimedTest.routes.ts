import { Router } from "express";

import {
  getAvailableTimedTests,
  startTimedTest,
  getTimedTestAttempt,
  saveTimedTestAnswer,
  submitTimedTest,
  getTimedTestResult,
  getMyTimedTestAttempts,
} from "../controllers/studentTimedTest.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require student authentication.
router.use(protect, authorize("student"));

// Get available tests according to student's board and class.
router.get("/", getAvailableTimedTests);

// Get student's test history.
router.get("/attempts", getMyTimedTestAttempts);

// Start a timed test.
router.post("/:testId/start", startTimedTest);

// Get test questions and saved answers.
router.get("/attempts/:attemptId", getTimedTestAttempt);

// Save or update an answer.
router.post("/attempts/:attemptId/answer", saveTimedTestAnswer);

// Submit test.
router.post("/attempts/:attemptId/submit", submitTimedTest);

// Get test result.
router.get("/attempts/:attemptId/result", getTimedTestResult);

export default router;
