import { z } from "zod";
import LLMS from "@/lib/llms";
import { v4 as uuidV4 } from "uuid";
import { queryPrompt } from "@/lib/prompts";
import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { START, StateGraph, END, Annotation } from "@langchain/langgraph";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";

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
  tavily_search: searchTool,
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
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    const toolResults: ToolMessage[] = [];

    for (const tl of lastMessage.tool_calls) {
      if (tl.name in toolsObj) {
        try {
          // @ts-ignore
          const toolResponse: ToolMessage = await toolsObj[tl.name].invoke(
            tl.args
          );
          toolResults.push(
            new ToolMessage({
              content: JSON.stringify(toolResponse),
              tool_call_id: tl.id || uuidV4(),
              name: tl.name,
            })
          );
        } catch (error) {
          toolResults.push(
            new ToolMessage({
              content: `Error executing tool ${tl.name}: ${error}`,
              tool_call_id: tl.id || uuidV4(),
              name: tl.name,
            })
          );
        }
      }
    }

    state.messages = [...toolResults];
  }

  return state;
}

async function shouldUseTool(state: BotGraphState) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "toolNode";
  } else {
    return END;
  }
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
