import { Router } from "express";

import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deactivateSubject,
} from "../controllers/subject.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// GET /api/subjects
// Get all active subjects, with optional filters
router.get("/", getSubjects);

// GET /api/subjects/:id
// Get one subject by ID
router.get("/:id", getSubjectById);

// ========================================
// ADMIN-ONLY ROUTES
// ========================================

// POST /api/subjects
// Create a new subject
router.post("/", protect, authorize("admin"), createSubject);

// PUT /api/subjects/:id
// Update an existing subject
router.put("/:id", protect, authorize("admin"), updateSubject);

// DELETE /api/subjects/:id
// Deactivate a subject without permanently deleting it
router.delete("/:id", protect, authorize("admin"), deactivateSubject);

export default router;
