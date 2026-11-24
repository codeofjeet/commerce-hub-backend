import { Router } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Get logged-in user's notifications
router.get("/", protect, getNotifications);

// Get unread notification count
router.get("/unread-count", protect, getUnreadNotificationCount);

// Mark all notifications as read
router.patch("/read-all", protect, markAllNotificationsAsRead);

// Mark a single notification as read
router.patch("/:id/read", protect, markNotificationAsRead);

export default router;
