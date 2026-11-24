import { Schema, model, models } from "mongoose";

const chapterSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

chapterSchema.index({
  subject: 1,
  board: 1,
  courseLevel: 1,
  chapterNumber: 1,
});

export default models.Chapter || model("Chapter", chapterSchema);
