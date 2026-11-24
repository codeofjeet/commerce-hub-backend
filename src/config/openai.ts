import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY is missing. Please configure it in backend .env",
  );
}

const openai = new OpenAI({
  apiKey,
});

export default openai;
