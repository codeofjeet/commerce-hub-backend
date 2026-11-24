import { Schema, model, models } from "mongoose";

const testAttemptSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    test: {
      type: Schema.Types.ObjectId,
      ref: "TimedTest",
      required: true,
    },

    // Keep a snapshot of the questions selected for this attempt.
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
    ],

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    marksObtained: {
      type: Number,
      default: 0,
      min: 0,
    },

    answeredQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    incorrectAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "evaluated", "expired"],
      default: "in_progress",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

testAttemptSchema.index({ student: 1, test: 1, createdAt: -1 });
testAttemptSchema.index({ status: 1, expiresAt: 1 });

export default models.TestAttempt || model("TestAttempt", testAttemptSchema);
