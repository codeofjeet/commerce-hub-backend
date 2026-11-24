import { Router } from "express";

import {
  createTeacher,
  getTeacherProfile,
  updateTeacherProfile,
  changeTeacherPassword,
  getAllTeachers,
  updateTeacherSubjects,
} from "../controllers/teacher.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Create teacher (Admin only)
router.post("/", protect, authorize("admin"), createTeacher);

// Get all teachers (Admin only)
router.get("/", protect, authorize("admin"), getAllTeachers);

// Update teacher subject assignments (Admin only)
router.patch(
  "/:id/subjects",
  protect,
  authorize("admin"),
  updateTeacherSubjects,
);

// Teacher Profile Management
router.get("/profile", protect, authorize("teacher"), getTeacherProfile);

router.put("/profile", protect, authorize("teacher"), updateTeacherProfile);

router.patch(
  "/change-password",
  protect,
  authorize("teacher"),
  changeTeacherPassword,
);

export default router;
