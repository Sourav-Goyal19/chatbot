import { CohereEmbeddings } from "@langchain/cohere";

export const embeddings = new CohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY!,
  model: "embed-english-v3.0",
});
