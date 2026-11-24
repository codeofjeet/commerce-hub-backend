import { Schema, model, models } from "mongoose";

const timedTestSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    chapters: [
      {
        type: Schema.Types.ObjectId,
        ref: "Chapter",
      },
    ],

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

    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
    ],

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

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

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

timedTestSchema.index({
  subject: 1,
  board: 1,
  courseLevel: 1,
  isActive: 1,
});

export default models.TimedTest || model("TimedTest", timedTestSchema);
