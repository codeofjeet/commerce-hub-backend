import { Schema, model, models } from "mongoose";

const studentResponseSchema = new Schema(
  {
    attempt: {
      type: Schema.Types.ObjectId,
      ref: "PracticeAttempt",
      required: true,
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // Used for written answers.
    responseText: {
      type: String,
      default: "",
      trim: true,
    },

    // Used for MCQ answers. This is a zero-based option index.
    selectedOptionIndex: {
      type: Number,
      default: null,
      min: 0,
    },

    // Null means the answer has not yet been evaluated.
    isCorrect: {
      type: Boolean,
      default: null,
    },

    evaluationStatus: {
      type: String,
      enum: ["auto_evaluated", "pending_review", "reviewed"],
      default: "pending_review",
    },

    feedback: {
      type: String,
      default: "",
    },

    marksAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

studentResponseSchema.index({ attempt: 1, question: 1 }, { unique: true });

studentResponseSchema.index({ student: 1, submittedAt: -1 });

export default models.StudentResponse ||
  model("StudentResponse", studentResponseSchema);
