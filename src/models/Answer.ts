import { Schema, model, models } from "mongoose";

const answerSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      unique: true,
    },
    answerText: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    answeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default models.Answer || model("Answer", answerSchema);
