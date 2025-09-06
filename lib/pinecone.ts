import { embeddings } from "./embeddings";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

const pc = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX!;

const pcIndex = pc.Index(indexName, process.env.PINECONE_INDEX_HOST_URL!);

const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex: pcIndex,
  maxConcurrency: 5,
});

const retriever = vectorStore.asRetriever({
  k: 3,
  searchKwargs: {
    //@ts-ignore
    alpha: 0.8,
  },
  searchType: "mmr",
});

export { vectorStore, retriever };
