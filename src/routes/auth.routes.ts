import { Router } from "express";
import {
  registerStudent,
  loginUser,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerStudent);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
