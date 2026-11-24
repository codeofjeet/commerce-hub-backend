import { Schema, model, models } from "mongoose";

const chatMessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["student", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    answerSource: {
      type: String,
      enum: ["verified_database", "ai_generated", "no_answer", "system"],
      default: "system",
    },

    questionSubmission: {
      type: Schema.Types.ObjectId,
      ref: "QuestionSubmission",
      default: null,
    },
  },
  { timestamps: true },
);

const chatConversationSchema = new Schema(
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

    // Student can give a custom conversation title
    customTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    messages: {
      type: [chatMessageSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

chatConversationSchema.index({
  student: 1,
  updatedAt: -1,
});

export default models.ChatConversation ||
  model("ChatConversation", chatConversationSchema);
