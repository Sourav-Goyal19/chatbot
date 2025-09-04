import { z } from "zod";
import LLMS from "@/lib/llms";
import { queryPrompt } from "@/lib/prompts";
import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { START, StateGraph, END, Annotation } from "@langchain/langgraph";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";

const BotGraphStateSchema = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currMessages, newMessages) => currMessages.concat(newMessages),
    default: () => [],
  }),
});

type BotGraphState = typeof BotGraphStateSchema.State;

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

const toolsList = [calculatorTool, searchTool];

const llmWithTools = LLMS.moonshotai.bindTools(toolsList);

const toolsObj = {
  calculator: calculatorTool,
};

const queryChain = queryPrompt.pipe(llmWithTools);

async function chatNode(state: BotGraphState) {
  // console.log("Reached to chat node");
  const messages = state.messages;
  const queryChainRes = await queryChain.invoke({
    history: messages,
  });
  // console.log(queryChainRes);
  state.messages = [queryChainRes];

  return state;
}

async function toolNode(state: BotGraphState) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  ((lastMessage as AIMessageChunk).tool_calls as ToolCall[]).forEach(
    async (tl) => {
      if (tl.name in toolsObj) {
        //@ts-ignore
        const toolResponse: ToolMessage = await toolsObj[tl.name].invoke(tl);
        // console.log(toolResponse);
        state.messages = [toolResponse];
      }
    }
  );

  return state;
}

async function shouldUseTool(state: BotGraphState) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  //@ts-ignore
  if (lastMessage.tool_calls.length > 0) {
    return "toolNode";
  } else return END;
}

const graph = new StateGraph(BotGraphStateSchema)
  .addNode("chatNode", chatNode)
  .addNode("toolNode", toolNode)
  .addEdge(START, "chatNode")
  .addConditionalEdges("chatNode", shouldUseTool)
  .addEdge("toolNode", "chatNode");

export const chatbot = graph.compile();

export const getResponse = async (messages: BaseMessage[], query: string) => {
  const initialState = {
    messages: [...messages, new HumanMessage({ content: query })],
  };
  const res = await chatbot.invoke(initialState);
  // console.log(res);
  return res.messages[res.messages.length - 1].content;
};
