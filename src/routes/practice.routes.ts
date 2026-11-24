import { Router } from "express";

import {
  startPractice,
  getCurrentPracticeQuestion,
  submitPracticeAnswer,
  nextPracticeQuestion,
  getPracticeResult,
  getMyPracticeAttempts,
} from "../controllers/practice.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// All practice routes require authentication.
router.use(protect);

// Keep this route before /:attemptId.
router.get("/my-attempts", getMyPracticeAttempts);

router.post("/start", startPractice);

router.get("/:attemptId", getCurrentPracticeQuestion);

router.post("/:attemptId/answer", submitPracticeAnswer);

router.post("/:attemptId/next", nextPracticeQuestion);

router.get("/:attemptId/result", getPracticeResult);

export default router;
