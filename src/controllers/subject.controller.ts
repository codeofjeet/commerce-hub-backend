import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Subject from "../models/Subject.js";

const subjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  boards: z
    .array(z.enum(["RBSE", "CBSE"]))
    .min(1)
    .optional(),
  courseLevels: z
    .array(z.enum(["11", "12", "BCom", "CA_FOUNDATION"]))
    .min(1)
    .optional(),
  description: z.string().max(1000).optional(),
});

const updateSubjectSchema = subjectSchema.partial();

export const getSubjects = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { isActive: true };

    if (req.query.board) {
      if (!["RBSE", "CBSE"].includes(String(req.query.board))) {
        res.status(400).json({
          success: false,
          message: "Invalid board",
        });
        return;
      }
      filter.boards = req.query.board;
    }

    if (req.query.courseLevel) {
      if (
        !["11", "12", "BCom", "CA_FOUNDATION"].includes(
          String(req.query.courseLevel),
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid course level",
        });
        return;
      }
      filter.courseLevels = req.query.courseLevel;
    }

    const subjects = await Subject.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve subjects",
    });
  }
};

export const getSubjectById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
      return;
    }

    const subject = await Subject.findOne({
      _id: id,
      isActive: true,
    });

    if (!subject) {
      res.status(404).json({
        success: false,
        message: "Subject not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve subject",
    });
  }
};

export const createSubject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = subjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid subject data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const subject = await Subject.create(parsed.data);

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error: unknown) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: "Subject validation failed",
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "A subject with this slug already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create subject",
    });
  }
};

export const updateSubject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = String(req.params.id);

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid subject ID",
    });
    return;
  }

  const parsed = updateSubjectSchema.safeParse(req.body);

  if (!parsed.success || Object.keys(req.body ?? {}).length === 0) {
    res.status(400).json({
      success: false,
      message: "Provide valid subject fields to update",
      errors: parsed.success
        ? []
        : parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
    });
    return;
  }

  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: parsed.data },
      { new: true, runValidators: true },
    );

    if (!subject) {
      res.status(404).json({
        success: false,
        message: "Subject not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "A subject with this slug already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update subject",
    });
  }
};

export const deactivateSubject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = String(req.params.id);

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid subject ID",
    });
    return;
  }

  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!subject) {
      res.status(404).json({
        success: false,
        message: "Active subject not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subject deactivated successfully",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to deactivate subject",
    });
  }
};
