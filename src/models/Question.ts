import { Schema, model, models } from "mongoose";

const questionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
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

    questionType: {
      type: String,
      enum: ["MCQ", "SHORT", "LONG", "NUMERICAL"],
      default: "SHORT",
    },

    options: [
      {
        type: String,
      },
    ],

    correctOptionIndex: {
      type: Number,
      min: 0,
      default: null,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    marks: {
      type: Number,
      min: 0,
      default: 1,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedAt: {
      type: Date,
    },

    // Multilingual semantic search embedding
    embedding: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (value: number[] | undefined) =>
          value === undefined || value.length === 384,
        message: "Question embedding must contain exactly 384 dimensions.",
      },
    },
  },
  { timestamps: true },
);

// Existing compound index
questionSchema.index({
  subject: 1,
  chapter: 1,
  board: 1,
  courseLevel: 1,
  status: 1,
});

// Existing text index
questionSchema.index({ questionText: "text" });

export default models.Question || model("Question", questionSchema);
