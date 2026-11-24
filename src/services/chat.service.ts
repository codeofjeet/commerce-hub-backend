import mongoose from "mongoose";

import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Chapter from "../models/Chapter.js";
import QuestionSubmission from "../models/QuestionSubmission.js";
import ChatConversation from "../models/ChatConversation.js";

import { searchVerifiedAnswer } from "./questionSearch.service.js";
import { generateAIAnswer } from "./aiAnswer.service.js";

interface SendMessageInput {
  studentId: string;
  subjectId: string;
  chapterId?: string;
  questionText: string;
  conversationId?: string;
}

interface ChatServiceResult {
  conversationId: string;
  source: "verified_database" | "ai_generated" | "no_answer";
  answer: string;
  matchedQuestion?: string;
  submissionId?: string;
  aiModel?: string;
}

export const sendChatMessage = async (
  input: SendMessageInput,
): Promise<ChatServiceResult> => {
  const { studentId, subjectId, chapterId, questionText, conversationId } =
    input;

  // 1. Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(studentId) ||
    !mongoose.Types.ObjectId.isValid(subjectId)
  ) {
    throw new Error("Invalid student or subject ID.");
  }

  if (chapterId && !mongoose.Types.ObjectId.isValid(chapterId)) {
    throw new Error("Invalid chapter ID.");
  }

  if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversation ID.");
  }

  const cleanedQuestion = questionText.trim();

  if (!cleanedQuestion) {
    throw new Error("Please enter your question.");
  }

  if (cleanedQuestion.length > 2000) {
    throw new Error("Question cannot exceed 2000 characters.");
  }

  // 2. Find student
  const student = await User.findById(studentId);

  if (!student || student.role !== "student") {
    throw new Error("Valid student account not found.");
  }

  // 3. Get student's academic details
  const courseLevel = student.classLevel;

  if (!courseLevel) {
    throw new Error("Your class or course is not configured.");
  }

  const board = student.board;

  if ((courseLevel === "11" || courseLevel === "12") && !board) {
    throw new Error("Please update your board in your profile.");
  }

  // 4. Verify selected subject
  const subject = await Subject.findById(subjectId);

  if (!subject || !subject.isActive) {
    throw new Error("Selected subject is not available.");
  }

  if (!subject.courseLevels.includes(courseLevel)) {
    throw new Error("This subject is not available for your course.");
  }

  if (board && !subject.boards.includes(board)) {
    throw new Error("This subject is not available for your board.");
  }

  // 5. Validate selected chapter, if provided
  if (chapterId) {
    const chapterFilter: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(chapterId),
      subject: new mongoose.Types.ObjectId(subjectId),
      courseLevel,
      isActive: true,
    };

    if (board) {
      chapterFilter.board = board;
    }

    const chapter = await Chapter.findOne(chapterFilter);

    if (!chapter) {
      throw new Error(
        "Selected chapter is not available for this subject, board, or course.",
      );
    }
  }

  // 6. Find or create conversation
  let conversation;

  if (conversationId) {
    conversation = await ChatConversation.findOne({
      _id: conversationId,
      student: studentId,
      subject: subjectId,
      isActive: true,
    });

    if (!conversation) {
      throw new Error("Conversation not found.");
    }
  } else {
    conversation = new ChatConversation({
      student: studentId,
      subject: subjectId,
      messages: [],
      isActive: true,
    });
  }

  // 7. Save student message in conversation
  conversation.messages.push({
    role: "student",
    content: cleanedQuestion,
    answerSource: "system",
  } as never);

  // 8. Search verified database answer
  const searchResult = await searchVerifiedAnswer({
    questionText: cleanedQuestion,
    subjectId,
    chapterId,
    board,
    courseLevel,
  });

  let answerText = "";
  let source: "verified_database" | "ai_generated" | "no_answer";
  let submissionId: string | undefined;
  let matchedQuestion: string | undefined;
  let aiModel: string | undefined;

  if (searchResult.found && searchResult.answer) {
    // Verified database answer has priority
    source = "verified_database";

    answerText = searchResult.answer.answerText;

    if (searchResult.answer.explanation) {
      answerText += "\n\nExplanation:\n" + searchResult.answer.explanation;
    }

    matchedQuestion = searchResult.question?.questionText;
  } else {
    // 9. Save unanswered question for teacher/admin review
    const submission = await QuestionSubmission.create({
      questionText: cleanedQuestion,
      student: studentId,
      board: board || undefined,
      courseLevel,
      subject: subjectId,
      chapter: chapterId ? new mongoose.Types.ObjectId(chapterId) : undefined,
      status: "pending",
    });
    submissionId = submission._id.toString();

    // 10. Generate AI answer
    try {
      const aiResult = await generateAIAnswer({
        questionText: cleanedQuestion,
        subjectName: subject.name,
        courseLevel,
        board,
      });

      answerText = aiResult.answer;
      source = "ai_generated";
      aiModel = aiResult.model;
    } catch (error) {
      // AI failure should not prevent question submission
      console.error("AI answer generation failed:", error);

      source = "no_answer";

      answerText =
        "I couldn't generate an answer right now. " +
        "Your question has been submitted successfully " +
        "for teacher/admin review. Please try again later.";
    }
  }

  // 11. Save assistant response
  conversation.messages.push({
    role: "assistant",
    content: answerText,
    answerSource: source,
    questionSubmission: submissionId
      ? new mongoose.Types.ObjectId(submissionId)
      : null,
  } as never);

  await conversation.save();

  // 12. Return response
  return {
    conversationId: conversation._id.toString(),
    source,
    answer: answerText,
    matchedQuestion,
    submissionId,
    aiModel,
  };
};
