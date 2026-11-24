import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import QuestionSubmission from "../models/QuestionSubmission.js";
import Subject from "../models/Subject.js";
import Chapter from "../models/Chapter.js";
import Question from "../models/Question.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import Answer from "../models/Answer.js";
import { generateDocumentEmbedding } from "../services/embedding.service.js";
import Notification from "../models/Notification.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const createSubmissionSchema = z.object({
  questionText: z.string().trim().min(5).max(5000),
  board: z.enum(["RBSE", "CBSE"]),
  courseLevel: z.enum(["11", "12", "BCom", "CA_FOUNDATION"]),
  subject: objectIdSchema,
  chapter: objectIdSchema.optional(),
});

const updateSubmissionSchema = z.object({
  status: z.enum(["pending", "in_review", "answered", "rejected"]).optional(),
  adminNotes: z.string().trim().max(3000).optional(),
  publishedQuestion: objectIdSchema.optional(),
});

const assignChapterSchema = z.object({
  chapter: objectIdSchema,
});

const teacherAnswerSchema = z.object({
  answerText: z.string().trim().min(2).max(15000),
  explanation: z.string().trim().max(15000).optional().default(""),
});

// STUDENT: Submit a new question
// POST /api/question-submissions
export const createSubmission = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = createSubmissionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid submission data.",
        errors: validation.error.issues,
      });
      return;
    }

    const data = validation.data;
    const authenticatedRequest = req as AuthenticatedRequest;
    const studentId = authenticatedRequest.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const subject = await Subject.findOne({
      _id: data.subject,
      isActive: true,
      boards: data.board,
      courseLevels: data.courseLevel,
    });

    if (!subject) {
      res.status(400).json({
        success: false,
        message:
          "Selected subject does not support this board and course level.",
      });
      return;
    }

    if (data.chapter) {
      const chapter = await Chapter.findOne({
        _id: data.chapter,
        subject: data.subject,
        board: data.board,
        courseLevel: data.courseLevel,
        isActive: true,
      });

      if (!chapter) {
        res.status(400).json({
          success: false,
          message:
            "Selected chapter does not belong to this subject, board, and course level.",
        });
        return;
      }
    }

    const submission = await QuestionSubmission.create({
      ...data,
      student: studentId,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Question submitted successfully. It is pending admin review.",
      data: submission,
    });
  } catch (error) {
    console.error("Create submission error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit question.",
    });
  }
};

// STUDENT: View their own submissions
// GET /api/question-submissions/my
export const getMySubmissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;
    const studentId = authenticatedRequest.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      QuestionSubmission.find({ student: studentId })
        .populate("subject", "name slug")
        .populate("chapter", "title chapterNumber")
        .populate("publishedQuestion", "questionText status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QuestionSubmission.countDocuments({ student: studentId }),
    ]);

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: submissions,
    });
  } catch (error) {
    console.error("Get my submissions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve your submissions.",
    });
  }
};

// ADMIN: View all student submissions with teacher answers
// GET /api/question-submissions
export const getAllSubmissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    const allowedStatuses = ["pending", "in_review", "answered", "rejected"];

    if (req.query.status) {
      if (!allowedStatuses.includes(String(req.query.status))) {
        res.status(400).json({
          success: false,
          message: "Invalid submission status.",
        });
        return;
      }

      filter.status = req.query.status;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      QuestionSubmission.find(filter)
        .populate("student", "name email")
        .populate("subject", "name slug")
        .populate("chapter", "title chapterNumber")
        .populate("publishedQuestion", "questionText status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      QuestionSubmission.countDocuments(filter),
    ]);

    // Get all draft question IDs from these submissions.
    const questionIds = submissions
      .map((submission) => submission.draftQuestion)
      .filter((id) => id != null);

    // Retrieve the corresponding teacher answers.
    const answers = await Answer.find({
      question: { $in: questionIds },
    }).select(
      "question answerText explanation answeredBy isVerified createdAt updatedAt",
    );

    // Create a map for quick answer lookup.
    const answerMap = new Map(
      answers.map((answer) => [answer.question.toString(), answer]),
    );

    // Attach the answer to each submission.
    const data = submissions.map((submission) => {
      const submissionObject = submission.toObject();

      const draftQuestionId = submission.draftQuestion?.toString();

      return {
        ...submissionObject,
        answer: draftQuestionId
          ? (answerMap.get(draftQuestionId) ?? null)
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "All submissions retrieved successfully.",
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("Get all submissions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve submissions.",
    });
  }
};

// ADMIN: Update submission status and notes
// PUT /api/question-submissions/:id
export const updateSubmission = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
      return;
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
      return;
    }

    const validation = updateSubmissionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid update data.",
        errors: validation.error.issues,
      });
      return;
    }

    const submission = await QuestionSubmission.findById(req.params.id);

    if (!submission) {
      res.status(404).json({
        success: false,
        message: "Question submission not found.",
      });
      return;
    }

    const { status, adminNotes, publishedQuestion } = validation.data;

    const finalStatus = status ?? submission.status;
    const finalPublishedQuestion =
      publishedQuestion ??
      (submission.publishedQuestion
        ? String(submission.publishedQuestion)
        : undefined);

    if (finalStatus === "answered") {
      if (!finalPublishedQuestion) {
        res.status(400).json({
          success: false,
          message:
            "A published question ID is required when marking a submission as answered.",
        });
        return;
      }

      const question = await Question.findOne({
        _id: finalPublishedQuestion,
        status: "published",
        subject: submission.subject,
        board: submission.board,
        courseLevel: submission.courseLevel,
      });

      if (!question) {
        res.status(400).json({
          success: false,
          message:
            "The linked question must be published and match the submission's subject, board, and course level.",
        });
        return;
      }

      submission.publishedQuestion = question._id;
    } else if (publishedQuestion) {
      const question = await Question.findOne({
        _id: publishedQuestion,
        status: "published",
        subject: submission.subject,
        board: submission.board,
        courseLevel: submission.courseLevel,
      });

      if (!question) {
        res.status(400).json({
          success: false,
          message:
            "The linked question must be published and match the submission details.",
        });
        return;
      }

      submission.publishedQuestion = question._id;
    }

    const previousStatus = submission.status;

    // Update submission status independently.
    if (status !== undefined) {
      submission.status = status;
    }

    if (adminNotes !== undefined) {
      submission.adminNotes = adminNotes;
    }

    await submission.save();

    // Notify teacher only when status changes to rejected.
    if (
      finalStatus === "rejected" &&
      previousStatus !== "rejected" &&
      submission.draftQuestion
    ) {
      try {
        const answer = await Answer.findOne({
          question: submission.draftQuestion,
        }).select("answeredBy");

        if (answer?.answeredBy) {
          const authenticatedRequest = req as AuthenticatedRequest;
          const adminId = authenticatedRequest.user?.userId;

          await Notification.create({
            recipient: answer.answeredBy,
            ...(adminId ? { sender: adminId } : {}),
            title: "Your Answer Has Been Rejected",
            message:
              adminNotes ||
              "Your submitted answer has been rejected by the admin. Please review the feedback.",
            type: "ANSWER_REJECTED",
            link: "/teacher/my-answers",
          });
        }
      } catch (notificationError) {
        console.error(
          "Teacher answer rejection notification failed:",
          notificationError,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Question submission updated successfully.",
      data: submission,
    });
  } catch (error) {
    console.error("Update submission error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update submission.",
    });
  }
};

// TEACHER: Submit or edit an answer for an assigned subject
// POST /api/question-submissions/:id/answer
export const submitTeacherAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  let newlyCreatedQuestionId: mongoose.Types.ObjectId | null = null;

  try {
    const submissionId = req.params.id;

    if (!mongoose.isValidObjectId(submissionId)) {
      res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
      return;
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    const teacherId = authenticatedRequest.user?.userId;

    if (!teacherId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const validation = teacherAnswerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid answer data.",
        errors: validation.error.issues,
      });
      return;
    }

    // Verify teacher account and assigned subject.
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      isActive: true,
    }).select("assignedSubjects");

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Active teacher account not found.",
      });
      return;
    }

    const submission = await QuestionSubmission.findById(submissionId);

    if (!submission) {
      res.status(404).json({
        success: false,
        message: "Question submission not found.",
      });
      return;
    }

    const isAssigned = teacher.assignedSubjects.some(
      (subjectId: mongoose.Types.ObjectId) =>
        subjectId.toString() === submission.subject.toString(),
    );

    if (!isAssigned) {
      res.status(403).json({
        success: false,
        message: "You are not assigned to this submission's subject.",
      });
      return;
    }

    // Question requires a chapter.
    const canEditRejectedAnswer =
      submission.status === "rejected" && Boolean(submission.draftQuestion);

    if (
      !["pending", "in_review"].includes(submission.status) &&
      !canEditRejectedAnswer
    ) {
      res.status(400).json({
        success: false,
        message: "This submission is no longer available for answering.",
      });
      return;
    }

    // Validate chapter and subject metadata.
    const chapter = await Chapter.findOne({
      _id: submission.chapter,
      subject: submission.subject,
      board: submission.board,
      courseLevel: submission.courseLevel,
      isActive: true,
    });

    if (!chapter) {
      res.status(400).json({
        success: false,
        message: "The submission's chapter is invalid or inactive.",
      });
      return;
    }

    const { answerText, explanation } = validation.data;

    // EDIT EXISTING TEACHER ANSWER
    if (submission.draftQuestion) {
      const question = await Question.findOne({
        _id: submission.draftQuestion,
        status: "draft",
        createdBy: teacherId,
        subject: submission.subject,
        chapter: submission.chapter,
        board: submission.board,
        courseLevel: submission.courseLevel,
      });

      if (!question) {
        res.status(409).json({
          success: false,
          message:
            "The linked draft question cannot be edited by this teacher.",
        });
        return;
      }

      const answer = await Answer.findOne({
        question: question._id,
      });

      if (!answer) {
        res.status(404).json({
          success: false,
          message: "The draft answer could not be found.",
        });
        return;
      }

      if (answer.answeredBy.toString() !== teacherId || answer.isVerified) {
        res.status(403).json({
          success: false,
          message:
            "You cannot edit this answer. It may belong to another teacher or already be verified.",
        });
        return;
      }

      answer.answerText = answerText;
      answer.explanation = explanation;

      // Send the revised answer back for admin verification.
      submission.status = "in_review";

      await answer.save();
      await submission.save();

      res.status(200).json({
        success: true,
        message: "Your answer was updated successfully.",
        data: {
          submissionId: submission._id,
          questionId: question._id,
          answer,
          status: submission.status,
        },
      });
      return;
    }

    // Generate semantic embedding.
    const embedding = await generateDocumentEmbedding(submission.questionText);

    // CREATE DRAFT QUESTION
    const question = await Question.create({
      questionText: submission.questionText,
      subject: submission.subject,
      chapter: submission.chapter,
      board: submission.board,
      courseLevel: submission.courseLevel,
      questionType: "SHORT",
      difficulty: "medium",
      marks: 1,
      status: "draft",
      createdBy: teacherId,
      embedding,
    });

    newlyCreatedQuestionId = question._id;

    // CREATE UNVERIFIED ANSWER
    const answer = await Answer.create({
      question: question._id,
      answerText,
      explanation,
      answeredBy: teacherId,
      isVerified: false,
    });

    // Link draft question to original submission.
    submission.draftQuestion = question._id;
    submission.status = "in_review";

    await submission.save();

    res.status(201).json({
      success: true,
      message:
        "Answer submitted successfully. It is waiting for admin verification.",
      data: {
        submissionId: submission._id,
        question,
        answer,
        status: submission.status,
      },
    });
  } catch (error) {
    // Remove a newly created draft question if the operation failed
    // before the submission could be linked successfully.
    if (newlyCreatedQuestionId) {
      try {
        const linkedSubmission = await QuestionSubmission.findOne({
          draftQuestion: newlyCreatedQuestionId,
        });

        if (!linkedSubmission) {
          await Answer.deleteOne({
            question: newlyCreatedQuestionId,
          });

          await Question.deleteOne({
            _id: newlyCreatedQuestionId,
            status: "draft",
          });
        }
      } catch (cleanupError) {
        console.error("Teacher answer cleanup failed:", cleanupError);
      }
    }

    console.error("Teacher answer submission error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit teacher answer.",
    });
  }
};

// ADMIN: Assign or update chapter for a student submission
// PATCH /api/question-submissions/:id/chapter
export const assignSubmissionChapter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
      return;
    }

    const validation = assignChapterSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter assignment data.",
        errors: validation.error.issues,
      });
      return;
    }

    const submission = await QuestionSubmission.findById(id);

    if (!submission) {
      res.status(404).json({
        success: false,
        message: "Question submission not found.",
      });
      return;
    }

    if (submission.draftQuestion) {
      res.status(409).json({
        success: false,
        message:
          "Chapter cannot be changed after a teacher has created a draft question.",
      });
      return;
    }

    if (!["pending", "in_review"].includes(submission.status)) {
      res.status(400).json({
        success: false,
        message:
          "Chapter can only be assigned to pending or in-review submissions.",
      });
      return;
    }

    const chapter = await Chapter.findOne({
      _id: validation.data.chapter,
      subject: submission.subject,
      board: submission.board,
      courseLevel: submission.courseLevel,
      isActive: true,
    });

    if (!chapter) {
      res.status(400).json({
        success: false,
        message:
          "Selected chapter does not belong to this submission's subject, board, and course level, or is inactive.",
      });
      return;
    }

    // Check whether the chapter assignment is new or changed.
    const chapterChanged =
      !submission.chapter ||
      submission.chapter.toString() !== chapter._id.toString();

    submission.chapter = chapter._id;

    await submission.save();

    // Notify active teachers assigned to this subject.
    if (chapterChanged) {
      try {
        const teachers = await User.find({
          role: "teacher",
          isActive: true,
          assignedSubjects: submission.subject,
        }).select("_id");

        if (teachers.length > 0) {
          const authenticatedRequest = req as AuthenticatedRequest;
          const adminId = authenticatedRequest.user?.userId;

          const notifications = teachers.map((teacher) => ({
            recipient: teacher._id,
            ...(adminId ? { sender: adminId } : {}),
            title: "New Question Assigned",
            message:
              "A new student question has been assigned to your subject. Please review and submit your answer.",
            type: "QUESTION_ASSIGNED" as const,
            link: "/teacher/questions",
          }));

          await Notification.insertMany(notifications);
        }
      } catch (notificationError) {
        // Notification failure should not undo chapter assignment.
        console.error(
          "Teacher notification creation failed:",
          notificationError,
        );
      }
    }

    const updatedSubmission = await QuestionSubmission.findById(submission._id)
      .populate("student", "name email")
      .populate("subject", "name slug")
      .populate("chapter", "title chapterNumber")
      .populate("draftQuestion", "questionText status");

    res.status(200).json({
      success: true,
      message: "Submission chapter assigned successfully.",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Assign submission chapter error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign submission chapter.",
    });
  }
};

// ADMIN: Verify teacher answer and publish its question
// PATCH /api/question-submissions/:id/verify
export const verifyTeacherAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();
  let teacherIdToNotify: string | null = null;

  try {
    const submissionId = req.params.id;

    if (!mongoose.isValidObjectId(submissionId)) {
      res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
      return;
    }

    let result:
      | {
          submissionId: string;
          questionId: string;
          answerId: string;
          status: string;
        }
      | undefined;

    await session.withTransaction(async () => {
      const submission =
        await QuestionSubmission.findById(submissionId).session(session);

      if (!submission) {
        throw new Error("SUBMISSION_NOT_FOUND");
      }

      if (submission.status !== "in_review") {
        throw new Error("SUBMISSION_NOT_IN_REVIEW");
      }

      if (!submission.draftQuestion) {
        throw new Error("DRAFT_QUESTION_NOT_FOUND");
      }

      const question = await Question.findOne({
        _id: submission.draftQuestion,
        status: "draft",
        subject: submission.subject,
        chapter: submission.chapter,
        board: submission.board,
        courseLevel: submission.courseLevel,
      }).session(session);

      if (!question) {
        throw new Error("INVALID_DRAFT_QUESTION");
      }

      const answer = await Answer.findOne({
        question: question._id,
      }).session(session);

      if (!answer) {
        throw new Error("ANSWER_NOT_FOUND");
      }

      if (answer.isVerified) {
        throw new Error("ANSWER_ALREADY_VERIFIED");
      }

      // Store the teacher ID for notification after transaction succeeds.
      teacherIdToNotify = answer.answeredBy.toString();

      // Publish question.
      question.status = "published";
      question.publishedAt = new Date();

      // Verify answer.
      answer.isVerified = true;

      // Update original student submission.
      submission.status = "answered";
      submission.publishedQuestion = question._id;

      await question.save({ session });
      await answer.save({ session });
      await submission.save({ session });

      result = {
        submissionId: submission._id.toString(),
        questionId: question._id.toString(),
        answerId: answer._id.toString(),
        status: submission.status,
      };
    });

    // Notify the teacher after successful verification.
    if (teacherIdToNotify) {
      try {
        const authenticatedRequest = req as AuthenticatedRequest;
        const adminId = authenticatedRequest.user?.userId;

        await Notification.create({
          recipient: teacherIdToNotify,
          ...(adminId ? { sender: adminId } : {}),
          title: "Your Answer Has Been Verified",
          message:
            "Congratulations! Your submitted answer has been verified by the admin and published for students.",
          type: "ANSWER_VERIFIED",
          link: "/teacher/my-answers",
        });
      } catch (notificationError) {
        // Notification failure should not undo successful verification.
        console.error(
          "Teacher answer verification notification failed:",
          notificationError,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Teacher answer verified and question published successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Verify teacher answer error:", error);

    const errorMessages: Record<string, { status: number; message: string }> = {
      SUBMISSION_NOT_FOUND: {
        status: 404,
        message: "Question submission not found.",
      },
      SUBMISSION_NOT_IN_REVIEW: {
        status: 400,
        message: "Only submissions in review can be verified.",
      },
      DRAFT_QUESTION_NOT_FOUND: {
        status: 404,
        message: "No draft question is linked to this submission.",
      },
      INVALID_DRAFT_QUESTION: {
        status: 400,
        message: "Draft question does not match the submission details.",
      },
      ANSWER_NOT_FOUND: {
        status: 404,
        message: "Teacher answer not found.",
      },
      ANSWER_ALREADY_VERIFIED: {
        status: 409,
        message: "This answer has already been verified.",
      },
    };

    const errorCode = error instanceof Error ? error.message : "";

    const knownError = errorMessages[errorCode];

    res.status(knownError?.status ?? 500).json({
      success: false,
      message: knownError?.message ?? "Failed to verify teacher answer.",
    });
  } finally {
    await session.endSession();
  }
};

// TEACHER: View submissions from assigned subjects
// GET /api/question-submissions/teacher
export const getTeacherSubmissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;
    const teacherId = authenticatedRequest.user?.userId;

    if (!teacherId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
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
        message: "Active teacher account not found.",
      });
      return;
    }

    const assignedSubjects = teacher.assignedSubjects;

    if (!assignedSubjects || assignedSubjects.length === 0) {
      res.status(200).json({
        success: true,
        message: "No subjects are assigned to this teacher.",
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        data: [],
      });
      return;
    }

    const allowedStatuses = ["pending", "in_review", "answered", "rejected"];

    const status = req.query.status ? String(req.query.status) : undefined;

    if (status && !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid submission status.",
      });
      return;
    }

    const filter: Record<string, unknown> = {
      subject: { $in: assignedSubjects },
    };

    if (status) {
      filter.status = status;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      QuestionSubmission.find(filter)
        .populate("student", "name email")
        .populate("subject", "name slug")
        .populate("chapter", "title chapterNumber")
        .populate("publishedQuestion", "questionText status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      QuestionSubmission.countDocuments(filter),
    ]);

    // Collect draft question IDs.
    const questionIds = submissions
      .map((submission) => submission.draftQuestion)
      .filter((id) => id != null);

    // Retrieve answers belonging to the logged-in teacher.
    const answers = await Answer.find({
      answeredBy: teacherId,
      question: { $in: questionIds },
    }).select(
      "question answerText explanation answeredBy isVerified createdAt updatedAt",
    );

    // Create answer lookup map.
    const answerMap = new Map(
      answers.map((answer) => [answer.question.toString(), answer]),
    );

    // Attach answer and admin feedback to each submission.
    const data = submissions.map((submission) => {
      const submissionObject = submission.toObject();

      const draftQuestionId = submission.draftQuestion?.toString();

      return {
        ...submissionObject,
        answer: draftQuestionId
          ? (answerMap.get(draftQuestionId) ?? null)
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "Assigned subject submissions retrieved successfully.",
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("Get teacher submissions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher submissions.",
    });
  }
};

// TEACHER: View answers submitted by the logged-in teacher
// GET /api/question-submissions/teacher/my-answers
export const getMyTeacherAnswers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;
    const teacherId = authenticatedRequest.user?.userId;

    if (!teacherId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
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
        message: "Active teacher account not found.",
      });
      return;
    }

    if (!teacher.assignedSubjects?.length) {
      res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {
      subject: { $in: teacher.assignedSubjects },
      draftQuestion: { $exists: true, $ne: null },
    };

    const [submissions, total] = await Promise.all([
      QuestionSubmission.find(filter)
        .populate("student", "name email")
        .populate("subject", "name slug")
        .populate("chapter", "title chapterNumber")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      QuestionSubmission.countDocuments(filter),
    ]);

    const questionIds = submissions
      .map((submission) => submission.draftQuestion)
      .filter((id) => id != null);

    const answers = await Answer.find({
      answeredBy: teacherId,
      question: { $in: questionIds },
    }).select(
      "question answerText explanation answeredBy isVerified createdAt updatedAt",
    );

    const answerMap = new Map(
      answers.map((answer) => [answer.question.toString(), answer]),
    );

    const data = submissions
      .map((submission) => {
        const submissionObject = submission.toObject();
        const draftQuestionId = submission.draftQuestion?.toString();

        return {
          ...submissionObject,
          answer: draftQuestionId
            ? (answerMap.get(draftQuestionId) ?? null)
            : null,
        };
      })
      .filter((submission) => submission.answer !== null);

    res.status(200).json({
      success: true,
      message: "Teacher answers retrieved successfully.",
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("Get teacher answers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher answers.",
    });
  }
};
