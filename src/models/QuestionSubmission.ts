import { Schema, model, models } from "mongoose";

const questionSubmissionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    board: {
      type: String,
      enum: ["RBSE", "CBSE"],
      required: false,
    },
    courseLevel: {
      type: String,
      enum: ["11", "12", "BCom", "CA_FOUNDATION"],
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "answered", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    publishedQuestion: {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
    draftQuestion: {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  },
  { timestamps: true },
);

questionSubmissionSchema.index({ student: 1, status: 1 });

export default models.QuestionSubmission ||
  model("QuestionSubmission", questionSubmissionSchema);
