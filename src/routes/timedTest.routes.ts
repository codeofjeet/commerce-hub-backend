import { Router } from "express";

import {
  getTimedTests,
  getTimedTestById,
  createTimedTest,
  updateTimedTest,
  updateTimedTestStatus,
  getStudentAvailableTimedTests,
  getStudentTimedTestById,
  startStudentTimedTest,
} from "../controllers/timedTest.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// ========================================
// STUDENT ROUTES
// ========================================

// Get available tests for logged-in student
router.get(
  "/student/available",
  protect,
  authorize("student"),
  getStudentAvailableTimedTests,
);

// Get one test's instructions and details
router.get(
  "/student/:id",
  protect,
  authorize("student"),
  getStudentTimedTestById,
);

// Start examination
router.post(
  "/student/:id/start",
  protect,
  authorize("student"),
  startStudentTimedTest,
);

// ========================================
// ADMIN ROUTES
// ========================================

// All routes below are admin-only
router.use(protect, authorize("admin"));

// Get all timed tests
router.get("/", getTimedTests);

// Get one timed test
router.get("/:id", getTimedTestById);

// Create timed test
router.post("/", createTimedTest);

// Update timed test
router.put("/:id", updateTimedTest);

// Activate / deactivate timed test
router.patch("/:id/status", updateTimedTestStatus);

export default router;
