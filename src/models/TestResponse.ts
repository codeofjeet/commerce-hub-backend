import { Schema, model, models } from "mongoose";

const testResponseSchema = new Schema(
  {
    attempt: {
      type: Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
      index: true,
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

    selectedOptionIndex: {
      type: Number,
      default: null,
      min: 0,
    },

    responseText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10000,
    },

    isCorrect: {
      type: Boolean,
      default: null,
    },

    evaluationStatus: {
      type: String,
      enum: ["auto_evaluated", "pending_review", "reviewed"],
      default: "pending_review",
    },

    marksAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

testResponseSchema.index({ attempt: 1, question: 1 }, { unique: true });

testResponseSchema.index({
  student: 1,
  evaluationStatus: 1,
});

export default models.TestResponse || model("TestResponse", testResponseSchema);
