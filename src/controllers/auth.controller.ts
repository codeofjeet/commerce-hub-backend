import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import mongoose from "mongoose";
import User from "../models/User.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

// Registration validation
const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),

    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((email) => email.toLowerCase()),

    password: z.string().min(8).max(72),

    mobileNumber: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),

    city: z
      .string()
      .trim()
      .min(2, "City must contain at least 2 characters")
      .max(100),

    dateOfBirth: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date of birth must be in YYYY-MM-DD format",
      )
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          date < new Date()
        );
      }, "Please enter a valid date of birth in the past")
      .transform((value) => new Date(`${value}T00:00:00.000Z`)),

    board: z.enum(["RBSE", "CBSE"]).optional(),

    classLevel: z.enum(["11", "12", "BCom", "CA_FOUNDATION"]).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.classLevel === "11" || data.classLevel === "12") && !data.board) {
      ctx.addIssue({
        code: "custom",
        path: ["board"],
        message: "Board is required for Class 11 and Class 12",
      });
    }
  });

// Login validation
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),

  password: z.string().min(1).max(72),
});

// Generate JWT token
const createToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ userId, role }, secret, {
    expiresIn: "1d",
  });
};

// Student Registration
export const registerStudent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Please provide valid registration details",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });

    return;
  }

  try {
    const {
      name,
      email,
      password,
      mobileNumber,
      city,
      dateOfBirth,
      board,
      classLevel,
    } = parsed.data;

    // Check duplicate email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });

      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create student
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      city,
      dateOfBirth,
      board,
      classLevel,
      role: "student",
    });

    // Generate token
    const token = createToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        city: user.city,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        board: user.board,
        classLevel: user.classLevel,
      },
    });
  } catch (error: unknown) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: "Registration data failed validation",
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
        message: "An account with this email already exists",
      });

      return;
    }

    console.error("Student registration failed:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed due to a server error",
    });
  }
};

// User Login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email and password",
    });

    return;
  }

  try {
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

      return;
    }

    const token = createToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        city: user.city,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        board: user.board,
        classLevel: user.classLevel,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: "Login failed due to a server error",
    });
  }
};

// Get Current Logged-in User
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const user = await User.findById(req.user.userId);

    if (!user || !user.isActive) {
      res.status(404).json({
        success: false,
        message: "User account not found or inactive",
      });

      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        city: user.city,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        board: user.board,
        classLevel: user.classLevel,
      },
    });
  } catch (error) {
    console.error("Profile lookup failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};
