import LLMS from "@/lib/llms";
import Parsers from "@/lib/parsers";
import { queryPrompt } from "@/lib/prompts";
import { START, StateGraph, END, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

const queryChain = queryPrompt.pipe(LLMS.google).pipe(Parsers.string);

const BotGraphStateSchema = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currMessages, newMessages) => currMessages.concat(newMessages),
    default: () => [],
  }),
});

type BotGraphState = typeof BotGraphStateSchema.State;

async function chatNode(state: BotGraphState) {
  // console.log("Reached to chat node");
  const messages = state.messages;
  const queryChainRes = await queryChain.invoke({
    history: messages,
  });
  state.messages = [new AIMessage({ content: queryChainRes })];

  return state;
}

const graph = new StateGraph(BotGraphStateSchema)
  .addNode("chatNode", chatNode)
  .addEdge(START, "chatNode")
  .addEdge("chatNode", END);

export const chatbot = graph.compile();

export const getResponse = async (messages: BaseMessage[], query: string) => {
  const initialState = {
    messages: [...messages, new HumanMessage({ content: query })],
  };
  const res = await chatbot.invoke(initialState);
  // console.log(res);
  return res.messages[res.messages.length - 1].content;
};
