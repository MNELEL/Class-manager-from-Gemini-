import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY not set");
}

const ai = new GoogleGenAI({ apiKey });

export async function generateEmbedding(text: string): Promise<number[]> {
  const result: any = await ai.models.embedContent({
    model: "text-embedding-004", // Use the supported embedding model
    contents: text,
  });
  
  const embeddingObj = result.embedding || result.embeddings;
  const values = embeddingObj?.values || (Array.isArray(embeddingObj) ? embeddingObj[0]?.values : embeddingObj?.values);
  
  if (!values) {
    throw new Error("Failed to generate embedding");
  }
  
  return values;
}
