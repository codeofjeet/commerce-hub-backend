import { Router } from "express";

import {
  getPendingEvaluations,
  getEvaluationDetails,
  submitEvaluation,
} from "../controllers/evaluation.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.use(authorize("admin", "teacher"));

router.get("/pending", getPendingEvaluations);
router.get("/:responseId", getEvaluationDetails);
router.post("/:responseId/submit", submitEvaluation);

export default router;
