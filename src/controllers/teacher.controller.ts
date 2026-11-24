import Answer from "../models/Answer.js";
import TestResponse from "../models/TestResponse.js";
import QuestionSubmission from "../models/QuestionSubmission.js";
import type { Response } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { z } from "zod";

import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Notification from "../models/Notification.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

// Validate teacher creation
const createTeacherSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),

  password: z.string().min(8).max(72),

  assignedSubjects: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).default([]),
});

// Validate subject assignment updates
const updateSubjectsSchema = z.object({
  assignedSubjects: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)),
});

// Validate assigned subjects
const validateSubjects = async (subjectIds: string[]): Promise<boolean> => {
  const uniqueIds = [...new Set(subjectIds)];

  if (uniqueIds.length !== subjectIds.length) {
    return false;
  }

  const subjects = await Subject.find({
    _id: { $in: uniqueIds },
    isActive: true,
  }).select("_id");

  return subjects.length === uniqueIds.length;
};

// Create Teacher
export const createTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = createTeacherSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid teacher details",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { name, email, password, assignedSubjects } = parsed.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const validSubjects = await validateSubjects(assignedSubjects);

    if (!validSubjects) {
      res.status(400).json({
        success: false,
        message: "One or more subjects are invalid, inactive, or duplicated",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "teacher",
      assignedSubjects,
    });

    const populatedTeacher = await User.findById(teacher._id)
      .select("-password")
      .populate("assignedSubjects", "name slug");

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      data: populatedTeacher,
    });
  } catch (error) {
    console.error("Teacher creation failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create teacher",
    });
  }
};

// Get All Teachers
export const getAllTeachers = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("-password")
      .populate("assignedSubjects", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    console.error("Teacher lookup failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teachers",
    });
  }
};

// Update Teacher Subject Assignments
export const updateTeacherSubjects = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid teacher ID",
    });
    return;
  }

  const parsed = updateSubjectsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid subject assignment data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const teacher = await User.findOne({
      _id: id,
      role: "teacher",
    });

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    const { assignedSubjects } = parsed.data;

    const validSubjects = await validateSubjects(assignedSubjects);

    if (!validSubjects) {
      res.status(400).json({
        success: false,
        message: "One or more subjects are invalid, inactive, or duplicated",
      });
      return;
    }

    // Find newly assigned subjects only.
    const previousSubjectIds = new Set<string>(
      (teacher.assignedSubjects || []).map(
        (subjectId: mongoose.Types.ObjectId) => subjectId.toString(),
      ),
    );

    const newlyAssignedSubjectIds = assignedSubjects.filter(
      (subjectId) => !previousSubjectIds.has(subjectId),
    );

    // Update the complete assigned subject list.
    teacher.assignedSubjects = assignedSubjects.map(
      (subjectId) => new mongoose.Types.ObjectId(subjectId),
    );

    await teacher.save();

    // Create notifications for newly assigned subjects.
    if (newlyAssignedSubjectIds.length > 0) {
      try {
        const [newSubjects, adminId] = await Promise.all([
          Subject.find({
            _id: { $in: newlyAssignedSubjectIds },
          }).select("name"),

          Promise.resolve(req.user?.userId),
        ]);

        const notifications = newSubjects.map((subject) => ({
          recipient: teacher._id,
          ...(adminId ? { sender: adminId } : {}),
          title: "New Subject Assigned",
          message: `You have been assigned a new subject: ${subject.name}. Please check your teacher dashboard.`,
          type: "SUBJECT_ASSIGNED" as const,
          link: "/teacher/profile",
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notificationError) {
        // Notification failure should not undo subject assignment.
        console.error(
          "Subject assignment notification failed:",
          notificationError,
        );
      }
    }

    const updatedTeacher = await User.findById(teacher._id)
      .select("-password")
      .populate("assignedSubjects", "name slug");

    res.status(200).json({
      success: true,
      message: "Teacher subject assignments updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    console.error("Teacher subject update failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update teacher subjects",
    });
  }
};

// Get Teacher Dashboard Statistics
export const getTeacherDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      res.status(401).json({
        success: false,
        message: "Invalid teacher authentication",
      });
      return;
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    }).select("assignedSubjects");

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found or inactive",
      });
      return;
    }

    const assignedSubjects = teacher.assignedSubjects || [];

    const [pendingQuestions, answersSubmitted, verifiedAnswers] =
      await Promise.all([
        QuestionSubmission.countDocuments({
          subject: { $in: assignedSubjects },
          status: { $in: ["pending", "in_review"] },
        }),

        Answer.countDocuments({
          answeredBy: teacherId,
        }),

        Answer.countDocuments({
          answeredBy: teacherId,
          isVerified: true,
        }),
      ]);

    res.status(200).json({
      success: true,
      message: "Teacher dashboard statistics retrieved successfully",
      data: {
        pendingQuestions,
        answersSubmitted,
        verifiedAnswers,
        assignedSubjects: assignedSubjects.length,
      },
    });
  } catch (error) {
    console.error("Teacher dashboard statistics error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher dashboard statistics",
    });
  }
};

// ==========================================
// GET TEACHER PERFORMANCE REPORTS
// ==========================================

export const getTeacherPerformanceReports = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      res.status(401).json({
        success: false,
        message: "Invalid teacher authentication",
      });
      return;
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    }).select("assignedSubjects");

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found or inactive",
      });
      return;
    }

    const assignedSubjects = teacher.assignedSubjects || [];
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    if (assignedSubjects.length === 0) {
      res.status(200).json({
        success: true,
        message: "Teacher performance reports retrieved successfully",
        data: {
          subjectStatistics: [],
          monthlyActivity: [],
          timedTestPerformance: {
            totalEvaluated: 0,
            totalMarksAwarded: 0,
          },
        },
      });
      return;
    }

    // Last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Subject-wise answer statistics
    const answerStatistics = await Answer.aggregate([
      {
        $match: {
          answeredBy: teacherObjectId,
        },
      },
      {
        $lookup: {
          from: "questions",
          localField: "question",
          foreignField: "_id",
          as: "questionData",
        },
      },
      {
        $unwind: "$questionData",
      },
      {
        $match: {
          "questionData.subject": { $in: assignedSubjects },
        },
      },
      {
        $group: {
          _id: "$questionData.subject",
          answersSubmitted: { $sum: 1 },
          verifiedAnswers: {
            $sum: {
              $cond: ["$isVerified", 1, 0],
            },
          },
        },
      },
    ]);

    // Pending student questions by subject
    const pendingStatistics = await QuestionSubmission.aggregate([
      {
        $match: {
          subject: { $in: assignedSubjects },
          status: { $in: ["pending", "in_review"] },
        },
      },
      {
        $group: {
          _id: "$subject",
          pendingQuestions: { $sum: 1 },
        },
      },
    ]);

    // Get assigned subject names
    const subjects = await Subject.find({
      _id: { $in: assignedSubjects },
    }).select("name");

    const answerMap = new Map(
      answerStatistics.map((item: any) => [item._id.toString(), item]),
    );

    const pendingMap = new Map(
      pendingStatistics.map((item: any) => [
        item._id.toString(),
        item.pendingQuestions,
      ]),
    );

    const subjectStatistics = subjects.map((subject) => {
      const subjectId = subject._id.toString();
      const answerData = answerMap.get(subjectId) as any;

      return {
        subjectId,
        subjectName: subject.name,
        answersSubmitted: answerData?.answersSubmitted || 0,
        verifiedAnswers: answerData?.verifiedAnswers || 0,
        pendingQuestions: pendingMap.get(subjectId) || 0,
      };
    });

    // Monthly answers submitted
    const monthlyAnswers = await Answer.aggregate([
      {
        $match: {
          answeredBy: teacherObjectId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          answersSubmitted: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    // Monthly timed test evaluations
    const monthlyEvaluations = await TestResponse.aggregate([
      {
        $match: {
          evaluatedBy: teacherObjectId,
          evaluationStatus: "reviewed",
          evaluatedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$evaluatedAt" },
            month: { $month: "$evaluatedAt" },
          },
          answersEvaluated: { $sum: 1 },
          marksAwarded: { $sum: "$marksAwarded" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    // Combine monthly activity
    const monthlyMap = new Map<
      string,
      {
        year: number;
        month: number;
        answersSubmitted: number;
        timedAnswersEvaluated: number;
        marksAwarded: number;
      }
    >();

    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo);
      date.setMonth(sixMonthsAgo.getMonth() + i);

      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

      monthlyMap.set(key, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        answersSubmitted: 0,
        timedAnswersEvaluated: 0,
        marksAwarded: 0,
      });
    }

    monthlyAnswers.forEach((item: any) => {
      const key = `${item._id.year}-${item._id.month}`;
      const entry = monthlyMap.get(key);

      if (entry) {
        entry.answersSubmitted = item.answersSubmitted;
      }
    });

    monthlyEvaluations.forEach((item: any) => {
      const key = `${item._id.year}-${item._id.month}`;
      const entry = monthlyMap.get(key);

      if (entry) {
        entry.timedAnswersEvaluated = item.answersEvaluated;
        entry.marksAwarded = item.marksAwarded;
      }
    });

    const monthlyActivity = Array.from(monthlyMap.values());

    // Overall timed test evaluation performance
    const timedTestSummary = await TestResponse.aggregate([
      {
        $match: {
          evaluatedBy: teacherObjectId,
          evaluationStatus: "reviewed",
        },
      },
      {
        $group: {
          _id: null,
          totalEvaluated: { $sum: 1 },
          totalMarksAwarded: { $sum: "$marksAwarded" },
        },
      },
    ]);

    const timedTestPerformance = {
      totalEvaluated: timedTestSummary[0]?.totalEvaluated || 0,
      totalMarksAwarded: timedTestSummary[0]?.totalMarksAwarded || 0,
    };

    res.status(200).json({
      success: true,
      message: "Teacher performance reports retrieved successfully",
      data: {
        subjectStatistics,
        monthlyActivity,
        timedTestPerformance,
      },
    });
  } catch (error) {
    console.error("Teacher performance reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher performance reports",
    });
  }
};

// ==========================================
// TEACHER PROFILE VALIDATION
// ==========================================

const updateTeacherProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    mobileNumber: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
      .optional(),

    city: z.string().trim().min(2).max(100).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.mobileNumber !== undefined ||
      data.city !== undefined,
    {
      message: "Provide at least one field to update",
    },
  );

const changeTeacherPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
});

// ==========================================
// GET TEACHER PROFILE
// ==========================================

export const getTeacherProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      res.status(401).json({
        success: false,
        message: "Invalid teacher authentication",
      });
      return;
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    })
      .select("-password")
      .populate("assignedSubjects", "name slug");

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found or inactive",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Teacher profile retrieved successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("Get teacher profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher profile",
    });
  }
};

// ==========================================
// UPDATE TEACHER PROFILE
// ==========================================

export const updateTeacherProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      res.status(401).json({
        success: false,
        message: "Invalid teacher authentication",
      });
      return;
    }

    const parsed = updateTeacherProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid profile information",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    });

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found or inactive",
      });
      return;
    }

    const { name, mobileNumber, city } = parsed.data;

    if (name !== undefined) teacher.name = name;
    if (mobileNumber !== undefined) {
      teacher.mobileNumber = mobileNumber;
    }
    if (city !== undefined) teacher.city = city;

    await teacher.save();

    const updatedTeacher = await User.findById(teacherId)
      .select("-password")
      .populate("assignedSubjects", "name slug");

    res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    console.error("Update teacher profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update teacher profile",
    });
  }
};

// ==========================================
// CHANGE TEACHER PASSWORD
// ==========================================

export const changeTeacherPassword = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      res.status(401).json({
        success: false,
        message: "Invalid teacher authentication",
      });
      return;
    }

    const parsed = changeTeacherPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid password information",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    }).select("+password");

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found or inactive",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      teacher.password,
    );

    if (!passwordMatches) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    teacher.password = await bcrypt.hash(newPassword, 12);

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teacher password changed successfully",
    });
  } catch (error) {
    console.error("Change teacher password error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to change teacher password",
    });
  }
};
