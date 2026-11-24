import { pipeline, env } from "@huggingface/transformers";

env.allowRemoteModels = true;
env.allowLocalModels = true;

const MODEL_NAME = "Xenova/multilingual-e5-small";
const EMBEDDING_DIMENSIONS = 384;

type FeatureExtractor = (
  text: string,
  options?: {
    pooling?: "mean";
    normalize?: boolean;
  },
) => Promise<{
  data: Float32Array;
}>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

const getExtractor = async (): Promise<FeatureExtractor> => {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME, {
      device: "cpu",
      dtype: "fp32",
    }) as unknown as Promise<FeatureExtractor>;
  }

  try {
    return await extractorPromise;
  } catch (error) {
    extractorPromise = null;
    throw error;
  }
};

const generateEmbedding = async (
  text: string,
  prefix: "query: " | "passage: ",
): Promise<number[]> => {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("Text cannot be empty for embedding generation.");
  }

  const extractor = await getExtractor();

  const output = await extractor(`${prefix}${cleanedText}`, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}.`,
    );
  }

  return embedding;
};

export const generateQuestionEmbedding = async (
  questionText: string,
): Promise<number[]> => {
  return generateEmbedding(questionText, "query: ");
};

export const generateDocumentEmbedding = async (
  questionText: string,
): Promise<number[]> => {
  return generateEmbedding(questionText, "passage: ");
};
