import {
  generateQuestionEmbedding,
  generateDocumentEmbedding,
} from "../services/embedding.service.js";

const testEmbedding = async () => {
  try {
    console.log("Testing multilingual embedding service...");

    const question = "What is accounting?";

    console.log("\n1. Testing query embedding...");

    const queryEmbedding = await generateQuestionEmbedding(question);

    console.log("Query embedding length:", queryEmbedding.length);
    console.log("First five values:", queryEmbedding.slice(0, 5));

    console.log("\n2. Testing document embedding...");

    const documentEmbedding = await generateDocumentEmbedding(question);

    console.log("Document embedding length:", documentEmbedding.length);

    console.log("First five values:", documentEmbedding.slice(0, 5));

    console.log("\nEmbedding service test completed successfully!");
  } catch (error) {
    console.error("Embedding test failed:", error);
    process.exitCode = 1;
  }
};

void testEmbedding();
