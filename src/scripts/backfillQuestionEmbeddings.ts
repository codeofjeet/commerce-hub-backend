import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Question from "../models/Question.js";
import { generateDocumentEmbedding } from "../services/embedding.service.js";

const BATCH_SIZE = 10;

const backfillQuestionEmbeddings = async (): Promise<void> => {
  let processed = 0;
  let failed = 0;

  try {
    console.log("Starting question embedding backfill...");

    await connectDB();

    const total = await Question.countDocuments({
      $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    });

    console.log(`Questions requiring embeddings: ${total}`);

    while (true) {
      const questions = await Question.find({
        $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
      })
        .select("_id questionText")
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();

      if (questions.length === 0) {
        break;
      }

      for (const question of questions) {
        try {
          const embedding = await generateDocumentEmbedding(
            question.questionText,
          );

          await Question.updateOne(
            {
              _id: question._id,
              $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } },
              ],
            },
            {
              $set: { embedding },
            },
          );

          processed++;

          console.log(
            `Processed ${processed}/${total}: ${question.questionText.substring(0, 60)}`,
          );
        } catch (error) {
          failed++;

          console.error(`Failed question ${question._id}:`, error);
        }
      }
    }

    console.log("\nEmbedding backfill completed.");
    console.log("Successfully processed:", processed);
    console.log("Failed:", failed);
  } catch (error) {
    console.error("Embedding backfill error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

void backfillQuestionEmbeddings();
