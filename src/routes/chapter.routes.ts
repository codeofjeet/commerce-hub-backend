import { Router } from "express";
import {
  getChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deactivateChapter,
} from "../controllers/chapter.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Public read endpoints
router.get("/", getChapters);
router.get("/:id", getChapterById);

// Admin-only write endpoints
router.post("/", protect, authorize("admin"), createChapter);
router.put("/:id", protect, authorize("admin"), updateChapter);
router.delete("/:id", protect, authorize("admin"), deactivateChapter);

export default router;
