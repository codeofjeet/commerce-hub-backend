import { Schema, model, models } from "mongoose";

const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    boards: [
      {
        type: String,
        enum: ["RBSE", "CBSE"],
      },
    ],
    courseLevels: [
      {
        type: String,
        enum: ["11", "12", "BCom", "CA_FOUNDATION"],
      },
    ],
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default models.Subject || model("Subject", subjectSchema);
