import { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import Chapter from "../models/Chapter.js";
import Subject from "../models/Subject.js";

const chapterSchema = z.object({
  title: z.string().trim().min(2).max(150),
  chapterNumber: z.coerce.number().int().min(1),
  subject: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid subject ID"),
  board: z.enum(["CBSE", "RBSE"]),
  courseLevel: z.enum(["11", "12", "BCom", "CA_FOUNDATION"]),
});

const createChapterSchema = chapterSchema;

const updateChapterSchema = chapterSchema.partial();

export const getChapters = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { isActive: true };

    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    if (req.query.board) {
      if (!["CBSE", "RBSE"].includes(String(req.query.board))) {
        res.status(400).json({
          success: false,
          message: "Invalid board. Use CBSE or RBSE.",
        });
        return;
      }
      filter.board = req.query.board;
    }

    if (req.query.courseLevel) {
      if (
        !["11", "12", "BCom", "CA_FOUNDATION"].includes(
          String(req.query.courseLevel),
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid course level.",
        });
        return;
      }
      filter.courseLevel = req.query.courseLevel;
    }

    const chapters = await Chapter.find(filter)
      .populate("subject", "name slug")
      .sort({ chapterNumber: 1 });

    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    console.error("Get chapters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve chapters.",
    });
  }
};

export const getChapterById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter ID.",
      });
      return;
    }

    const chapter = await Chapter.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("subject", "name slug");

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: "Chapter not found.",
      });
      return;
    }

    res.status(200).json({ success: true, data: chapter });
  } catch (error) {
    console.error("Get chapter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve chapter.",
    });
  }
};

export const createChapter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = createChapterSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter data.",
        errors: validation.error.issues,
      });
      return;
    }

    const { title, chapterNumber, subject, board, courseLevel } =
      validation.data;

    const subjectExists = await Subject.findOne({
      _id: subject,
      isActive: true,
      boards: board,
      courseLevels: courseLevel,
    });

    if (!subjectExists) {
      res.status(400).json({
        success: false,
        message:
          "The selected active subject does not support this board and course level.",
      });
      return;
    }

    const duplicate = await Chapter.findOne({
      subject,
      board,
      courseLevel,
      chapterNumber,
      isActive: true,
    });

    if (duplicate) {
      res.status(409).json({
        success: false,
        message:
          "An active chapter with this number already exists for this subject, board, and course level.",
      });
      return;
    }

    const chapter = await Chapter.create({
      title,
      chapterNumber,
      subject,
      board,
      courseLevel,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Chapter created successfully.",
      data: chapter,
    });
  } catch (error) {
    console.error("Create chapter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chapter.",
    });
  }
};

export const updateChapter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter ID.",
      });
      return;
    }

    const validation = updateChapterSchema.safeParse(req.body);

    if (!validation.success || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide valid chapter fields to update.",
        errors: validation.success ? undefined : validation.error.issues,
      });
      return;
    }

    const existing = await Chapter.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Chapter not found.",
      });
      return;
    }

    const updatedData = {
      title: validation.data.title ?? existing.title,
      chapterNumber: validation.data.chapterNumber ?? existing.chapterNumber,
      subject: validation.data.subject ?? String(existing.subject),
      board: validation.data.board ?? existing.board,
      courseLevel: validation.data.courseLevel ?? existing.courseLevel,
    };

    const subjectExists = await Subject.findOne({
      _id: updatedData.subject,
      isActive: true,
      boards: updatedData.board,
      courseLevels: updatedData.courseLevel,
    });

    if (!subjectExists) {
      res.status(400).json({
        success: false,
        message:
          "The selected active subject does not support this board and course level.",
      });
      return;
    }

    const duplicate = await Chapter.findOne({
      _id: { $ne: existing._id },
      subject: updatedData.subject,
      board: updatedData.board,
      courseLevel: updatedData.courseLevel,
      chapterNumber: updatedData.chapterNumber,
      isActive: true,
    });

    if (duplicate) {
      res.status(409).json({
        success: false,
        message: "Another active chapter already uses this chapter number.",
      });
      return;
    }

    Object.assign(existing, updatedData);
    await existing.save();

    res.status(200).json({
      success: true,
      message: "Chapter updated successfully.",
      data: existing,
    });
  } catch (error) {
    console.error("Update chapter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update chapter.",
    });
  }
};

export const deactivateChapter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({
        success: false,
        message: "Invalid chapter ID.",
      });
      return;
    }

    const chapter = await Chapter.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true, runValidators: true },
    );

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: "Active chapter not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Chapter deactivated successfully.",
      data: chapter,
    });
  } catch (error) {
    console.error("Deactivate chapter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate chapter.",
    });
  }
};
