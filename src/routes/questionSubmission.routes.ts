import { Router } from "express";
import { getTeacherDashboardStats } from "../controllers/teacher.controller.js";
import { getTeacherPerformanceReports } from "../controllers/teacher.controller.js";

import {
  createSubmission,
  getMySubmissions,
  getAllSubmissions,
  updateSubmission,
  getTeacherSubmissions,
  submitTeacherAnswer,
  assignSubmissionChapter,
  verifyTeacherAnswer,
  getMyTeacherAnswers,
} from "../controllers/questionSubmission.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Student-only routes
router.post("/", protect, authorize("student"), createSubmission);
router.get("/my", protect, authorize("student"), getMySubmissions);

// TEACHER: View submissions from assigned subjects
router.get("/teacher", protect, authorize("teacher"), getTeacherSubmissions);
router.get(
  "/teacher/my-answers",
  protect,
  authorize("teacher"),
  getMyTeacherAnswers,
);
// TEACHER: Submit or edit an answer
router.post("/:id/answer", protect, authorize("teacher"), submitTeacherAnswer);

// Admin-only routes
router.get("/", protect, authorize("admin"), getAllSubmissions);
router.put("/:id", protect, authorize("admin"), updateSubmission);
// ADMIN: Verify teacher answer and publish question
router.patch("/:id/verify", protect, authorize("admin"), verifyTeacherAnswer);

// TEACHER: Get dashboard statistics
router.get(
  "/teacher/dashboard-stats",
  protect,
  authorize("teacher"),
  getTeacherDashboardStats,
);

router.get(
  "/teacher/performance-reports",
  protect,
  authorize("teacher"),
  getTeacherPerformanceReports,
);

// ADMIN: Assign or update submission chapter
router.patch(
  "/:id/chapter",
  protect,
  authorize("admin"),
  assignSubmissionChapter,
);

export default router;
