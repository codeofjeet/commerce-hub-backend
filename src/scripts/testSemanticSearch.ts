import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { searchVerifiedAnswer } from "../services/questionSearch.service.js";

const testQuestions = [
  // English
  "What is accounting?",
  "Define accounting.",
  "Explain the meaning of accounting.",

  // Hinglish
  "Accounting kya hai?",
  "Accounting ka matlab kya hota hai?",

  // Hindi
  "लेखांकन क्या है?",
  "लेखांकन का अर्थ बताइए।",
  "लेखांकन किसे कहते हैं?",
  "लेखा क्या है?",
  "बहीखाता क्या है?",

  // Other commerce terminology
  "अर्थशास्त्र क्या है?",
  "मांग क्या है?",
  "व्यवसाय क्या है?",
  "प्रबंधन क्या है?",

  // Unrelated questions
  "What is photosynthesis?",
  "What is the capital of India?",
];

const testSemanticSearch = async (): Promise<void> => {
  try {
    await connectDB();

    // Replace these with the subject ID and course details
    // belonging to your existing Accounting questions.
    const subjectId = "6ae376d04b5c92ee582d0605";
    const board = "CBSE";
    const courseLevel = "11";

    for (const questionText of testQuestions) {
      console.log("\n----------------------------------");
      console.log("Student question:", questionText);

      const result = await searchVerifiedAnswer({
        questionText,
        subjectId,
        board,
        courseLevel,
      });

      console.log("Found:", result.found);
      console.log("Source:", result.source);

      if (result.question) {
        console.log("Matched question:", result.question.questionText);
      }

      if (result.answer) {
        console.log("Verified answer:", result.answer.answerText);
      }
    }
  } catch (error) {
    console.error("Semantic search test failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected.");
  }
};

void testSemanticSearch();
