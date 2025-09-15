import LLMS from "@/lib/llms";
import Parsers from "@/lib/parsers";
import { v4 as uuidV4 } from "uuid";
import { RunnableLambda } from "@langchain/core/runnables";
import { queryPrompt, toolSuggestionPrompt } from "@/lib/prompts";
import { calculatorTool, searchTool, vectorSearchTool } from "./tools";
import { START, StateGraph, END, Annotation } from "@langchain/langgraph";
import {
  AIMessage,
  BaseMessage,
  ToolMessage,
  HumanMessage,
} from "@langchain/core/messages";

const BotGraphStateSchema = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currMessages, newMessages) => currMessages.concat(newMessages),
    default: () => [],
  }),
});

type BotGraphState = typeof BotGraphStateSchema.State;

const toolsList = [calculatorTool, searchTool, vectorSearchTool];

const llmWithTools = LLMS.moonshotai.bindTools(toolsList);

const toolsByName = {
  [calculatorTool.name]: calculatorTool,
  [searchTool.name]: searchTool,
  [vectorSearchTool.name]: vectorSearchTool,
};

const toolsWithDescription = toolsList.map((tl) => ({
  name: tl.name,
  description: tl.description,
}));

const queryChain = queryPrompt.pipe(llmWithTools);

async function toolSuggestionNode(state: BotGraphState) {
  const messages = state.messages;
  const toolSuggestionChain = toolSuggestionPrompt
    .pipe(LLMS.gptoss)
    .pipe(Parsers.json);

  const result = await toolSuggestionChain.invoke({
    history: messages,
    tools: toolsWithDescription,
  });

  // console.log(result);

  // const lastMessage = messages[messages.length - 1].content;

  let content = "";
  if (result.suggested_tools.length > 0) {
    content = `
        Suggested Tools: ${result.suggested_tools}
        Description: ${result.description}
        `;
  } else {
    content = "No Suggestion for any tool";
  }

  // const updatedMessages = [
  //   ...messages.slice(0, -1),
  //   new HumanMessage({ content: lastMessage + "\n\n" + content }),
  // ] as BaseMessage[];

  state.messages = [
    new ToolMessage({
      content,
      tool_call_id: "suggestor tool",
      name: "suggestor",
    }),
  ];

  return state;
}

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
      if (tl.name in toolsByName) {
        try {
          // @ts-ignore
          const toolResponse: ToolMessage = await toolsByName[tl.name].invoke(
            tl
          );
          // console.log(toolResponse);
          toolResults.push(toolResponse);
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
  .addNode(
    "toolSuggestionNode",
    RunnableLambda.from(toolSuggestionNode).withConfig({
      tags: ["nostream"],
    })
  )
  .addNode("chatNode", chatNode)
  .addNode("toolNode", toolNode)
  .addEdge(START, "toolSuggestionNode")
  .addEdge("toolSuggestionNode", "chatNode")
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
