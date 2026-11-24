import { Schema, model, models } from "mongoose";

const practiceAttemptSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },

    board: {
      type: String,
      enum: ["RBSE", "CBSE"],
      required: true,
    },

    courseLevel: {
      type: String,
      enum: ["11", "12", "BCom", "CA_FOUNDATION"],
      required: true,
    },

    // Store the questions selected for this practice session.
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
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
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

practiceAttemptSchema.index({
  student: 1,
  chapter: 1,
  status: 1,
});

export default models.PracticeAttempt ||
  model("PracticeAttempt", practiceAttemptSchema);
