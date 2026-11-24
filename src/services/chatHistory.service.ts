import mongoose from "mongoose";

import ChatConversation from "../models/ChatConversation.js";

interface ChatHistoryInput {
  studentId: string;
}

interface ConversationDetailInput {
  studentId: string;
  conversationId: string;
}

// Generate conversation title
const generateConversationTitle = (
  messages: any[],
  subjectName?: string,
  customTitle?: string,
): string => {
  // Priority 1: Student's custom title
  if (customTitle?.trim()) {
    return customTitle.trim();
  }

  // Priority 2: First student question
  const firstStudentMessage = messages.find(
    (message) => message.role === "student",
  );

  if (!firstStudentMessage?.content) {
    // Priority 3: Subject name
    return subjectName || "New conversation";
  }

  const question = firstStudentMessage.content.trim();

  if (question.length > 60) {
    return `${question.substring(0, 57)}...`;
  }

  return question;
};

// Get all conversations belonging to a student
export const getStudentConversations = async (input: ChatHistoryInput) => {
  const { studentId } = input;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid student ID.");
  }

  const conversations = await ChatConversation.find({
    student: studentId,
    isActive: true,
  })
    .populate("subject", "name slug")
    .select("subject customTitle messages createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  return conversations.map((conversation: any) => {
    const messages = conversation.messages || [];
    const lastMessage = messages[messages.length - 1];

    return {
      conversationId: conversation._id.toString(),

      title: generateConversationTitle(
        messages,
        conversation.subject?.name,
        conversation.customTitle,
      ),

      customTitle: conversation.customTitle || "",

      subject: conversation.subject,

      lastMessage: lastMessage
        ? {
            role: lastMessage.role,
            content: lastMessage.content,
            answerSource: lastMessage.answerSource,
            createdAt: lastMessage.createdAt,
          }
        : null,

      totalMessages: messages.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  });
};

// Get complete details of one conversation
export const getConversationDetails = async (
  input: ConversationDetailInput,
) => {
  const { studentId, conversationId } = input;

  if (
    !mongoose.Types.ObjectId.isValid(studentId) ||
    !mongoose.Types.ObjectId.isValid(conversationId)
  ) {
    throw new Error("Invalid student or conversation ID.");
  }

  const conversation = await ChatConversation.findOne({
    _id: conversationId,
    student: studentId,
  })
    .populate("subject", "name slug")
    .lean();

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const messages = conversation.messages || [];

  return {
    conversationId: conversation._id.toString(),

    title: generateConversationTitle(
      messages,
      (conversation.subject as any)?.name,
      conversation.customTitle,
    ),

    customTitle: conversation.customTitle || "",

    subject: conversation.subject,
    messages: conversation.messages,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};
