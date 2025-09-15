import { z } from "zod";
import { retriever } from "@/lib/pinecone";
import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { RunnableConfig } from "@langchain/core/runnables";

const calculatorTool = tool(
  (input) => {
    const typedInput = input as { a: number; b: number; operator: string };

    if (typedInput.operator == "+") {
      return typedInput.a + typedInput.b;
    } else if (typedInput.operator == "-") {
      return typedInput.a - typedInput.b;
    } else if (typedInput.operator == "/") {
      return typedInput.a / typedInput.b;
    } else {
      return typedInput.a * typedInput.b;
    }
  },
  {
    name: "calculator",
    schema: z.object({
      a: z.number().describe("First operand"),
      b: z.number().describe("Second operand"),
      operator: z.string().max(1).describe("operator"),
    }),
    description:
      "Performs multiplication, addition, division, and subtraction between two any operands.",
  }
);

const searchTool = new TavilySearch({
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

const vectorToolSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

const vectorSearchTool = tool(
  async (input, config: RunnableConfig) => {
    const typedInput = input as { query: string };

    const conversationId = config?.configurable?.thread_id;

    if (!conversationId) {
      throw new Error("Missing conversationId for vector search");
    }

    const documents = await retriever.invoke(typedInput.query, {
      metadata: {
        conversationId,
      },
    });
    return documents.map((doc) => doc.pageContent);
  },
  {
    name: "history_vector_search",
    description:
      "Searches similar vectors from the current conversation's vector DB entries. Returns the top 3 relevant results. Takes the query in parameters.",
    schema: vectorToolSchema,
  }
);

export { calculatorTool, searchTool, vectorSearchTool };
