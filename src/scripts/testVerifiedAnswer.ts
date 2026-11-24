import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";

import { searchVerifiedAnswer } from "../services/questionSearch.service.js";

const TEST_QUESTION_1 = "Temporary verification ranking concept test question";

const TEST_QUESTION_2 =
  "Temporary verification ranking concept alternate question";

const EXPECTED_ANSWER =
  "This is the verified answer from the second temporary question.";

const testVerifiedRanking = async (): Promise<void> => {
  const temporaryQuestionIds: mongoose.Types.ObjectId[] = [];

  try {
    await connectDB();

    // Get valid subject and chapter references.
    const existingQuestion = await Question.findOne({
      questionText: "What is accounting?",
      status: "published",
    }).select("subject chapter board courseLevel createdBy");

    if (!existingQuestion) {
      throw new Error("Existing accounting question not found.");
    }

    // Create the first temporary question.
    const firstQuestion = await Question.create({
      questionText: TEST_QUESTION_1,
      subject: existingQuestion.subject,
      chapter: existingQuestion.chapter,
      board: existingQuestion.board,
      courseLevel: existingQuestion.courseLevel,
      questionType: "SHORT",
      status: "published",
      createdBy: existingQuestion.createdBy,
    });

    temporaryQuestionIds.push(firstQuestion._id);

    // Create the second temporary question.
    const secondQuestion = await Question.create({
      questionText: TEST_QUESTION_2,
      subject: existingQuestion.subject,
      chapter: existingQuestion.chapter,
      board: existingQuestion.board,
      courseLevel: existingQuestion.courseLevel,
      questionType: "SHORT",
      status: "published",
      createdBy: existingQuestion.createdBy,
    });

    temporaryQuestionIds.push(secondQuestion._id);

    // First question: unverified answer.
    await Answer.create({
      question: firstQuestion._id,
      answerText: "This answer must not be returned.",
      explanation: "Temporary unverified answer.",
      answeredBy: existingQuestion.createdBy,
      isVerified: false,
    });

    // Second question: verified answer.
    await Answer.create({
      question: secondQuestion._id,
      answerText: EXPECTED_ANSWER,
      explanation: "Temporary verified answer.",
      answeredBy: existingQuestion.createdBy,
      isVerified: true,
    });

    console.log("\nTwo temporary questions created.");
    console.log("First answer: Unverified");
    console.log("Second answer: Verified");

    // Search using the first question.
    // Exact matching finds the unverified question first.
    // The search should continue and find the verified alternative.
    const result = await searchVerifiedAnswer({
      questionText: TEST_QUESTION_1,
      subjectId: existingQuestion.subject.toString(),
      board: existingQuestion.board,
      courseLevel: existingQuestion.courseLevel,
    });

    console.log("\nRanking verification result:");
    console.log("Found:", result.found);
    console.log("Source:", result.source);
    console.log("Matched question:", result.question?.questionText);
    console.log("Returned answer:", result.answer?.answerText);

    if (
      !result.found ||
      result.answer?.answerText !== EXPECTED_ANSWER ||
      result.question?.questionText !== TEST_QUESTION_2
    ) {
      throw new Error(
        "FAILED: Search did not select the expected verified alternative.",
      );
    }

    console.log(
      "\nPASS: Search skipped the unverified answer and returned the verified alternative.",
    );
  } catch (error) {
    console.error("\nRanking verification test failed:", error);
    process.exitCode = 1;
  } finally {
    // Remove only the temporary test records.
    if (temporaryQuestionIds.length > 0) {
      try {
        await Answer.deleteMany({
          question: { $in: temporaryQuestionIds },
        });

        await Question.deleteMany({
          _id: { $in: temporaryQuestionIds },
        });

        console.log("\nTemporary test records deleted.");
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
        process.exitCode = 1;
      }
    }

    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

void testVerifiedRanking();
