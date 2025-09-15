import { z } from "zod";
import LLMS from "@/lib/llms";
import { generateText } from "ai";
import client from "@/lib/prismadb";
import Parsers from "@/lib/parsers";
import { memories } from "@/lib/mem0";
import { google } from "@ai-sdk/google";
import { chatbot } from "./query-graph";
import { vectorStore } from "@/lib/pinecone";
import { summaryPrompt } from "@/lib/prompts";
import { currentUser } from "@clerk/nextjs/server";
import { Document } from "@langchain/core/documents";
import { convertToHistoryMessages } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import {
  AIMessage,
  BaseMessage,
  ToolMessage,
  HumanMessage,
  AIMessageChunk,
} from "@langchain/core/messages";

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  isFirstQuery: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const body = await req.json();
    const { conversationId } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 401 });
    }

    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { query, isFirstQuery } = parsed.data;

    const [relevantMemories, versionGroups, conversation] = await Promise.all([
      memories.search(query, { user_id: user.id }),
      client.versionGroup.findMany({
        where: { conversationId },
        include: {
          messages: { orderBy: { updatedAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      client.conversation.findUnique({
        where: {
          id: conversationId,
        },
        select: {
          historySummary: true,
        },
      }),
    ]);

    const memoriesStr = relevantMemories
      .map((entry) => `- ${entry.memory}`)
      .join("\n");

    const vg = await client.versionGroup.create({
      data: {
        conversation: { connect: { id: conversationId } },
        messages: {
          createMany: {
            data: [
              {
                content: query,
                role: "user",
                sender: user.id,
                conversationId,
              },
              {
                content: "",
                role: "assistant",
                sender: "assistant",
                conversationId,
              },
            ],
          },
        },
      },
      include: { messages: true },
    });

    let history = convertToHistoryMessages(versionGroups);

    if (history.length > 15) {
      history = history.slice(-15);
    }

    history.unshift(
      new AIMessage(`
        Here is the whole summary of our previous conversation:
        ${conversation?.historySummary}
        `)
    );

    if (memoriesStr) {
      history.unshift(new AIMessage(`Relevant past memories:\n${memoriesStr}`));
    }

    const initialState = {
      messages: [...history, new HumanMessage({ content: query })],
    };

    const config = {
      configurable: {
        thread_id: conversationId,
      },
      streamMode: "messages" as const,
    };

    const stream = await chatbot.stream(initialState, config);

    const encoder = new TextEncoder();

    let currentMessageId = vg.messages[1].id;

    const webstream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "vg",
                data: vg,
              }) + "\n"
            )
          );

          let fullText = "";
          let text = "";

          for await (const chunk of stream) {
            const messageChunk = chunk[0];
            text = messageChunk.content as string;

            if (
              messageChunk instanceof AIMessageChunk &&
              messageChunk.tool_calls &&
              messageChunk.tool_calls.length > 0
            ) {
              messageChunk.tool_calls.forEach((toolCall) => {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: "tool",
                      role: "tool",
                      id: toolCall.id,
                      messageId: currentMessageId,
                      name: toolCall.name,
                      args: toolCall.args,
                      data: `Calling tool: ${
                        toolCall.name
                      }\nArguments: ${JSON.stringify(toolCall.args, null, 2)}`,
                    }) + "\n"
                  )
                );
              });
            } else if (messageChunk instanceof ToolMessage) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "tool_result",
                    role: "tool",
                    id: messageChunk.tool_call_id,
                    messageId: currentMessageId,
                    data: `Tool result: ${messageChunk.content}`,
                  }) + "\n"
                )
              );
            } else if (text && fullText !== text) {
              fullText += text;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "stream",
                    data: text,
                    role: "ai",
                    messageId: currentMessageId,
                  }) + "\n"
                )
              );
            }
          }

          const aiMessage = await client.message.update({
            where: {
              id: vg.messages[1].id,
            },
            data: {
              content: fullText,
            },
          });

          await client.versionGroup.update({
            where: {
              id: vg.id,
            },
            data: {
              versions: {
                push: [vg.messages[0].id, aiMessage.id],
              },
              conversation: {
                update: {
                  updatedAt: new Date(),
                },
              },
            },
          });

          storeIntoVectorDB(conversationId, query, fullText);

          if (isFirstQuery) {
            generateConversationName(query, fullText, conversationId);
          }

          if (history.length >= 15) {
            generateSummary(
              conversationId,
              conversation?.historySummary,
              history
            );
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(webstream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("QUERY[POST]:", error);
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}

async function generateSummary(
  conversationId: string,
  lastSummary: string = "",
  history: BaseMessage[]
) {
  try {
    const summaryChain = summaryPrompt.pipe(LLMS.gptoss).pipe(Parsers.json);

    const res: any = await summaryChain.invoke({
      conversation: history,
      summary: lastSummary,
    });

    const summarySchema = z.object({
      summary: z.string().min(1),
    });

    const parsed = summarySchema.safeParse(res);

    if (!parsed.success) {
      return;
    }

    await client.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        historySummary: parsed.data.summary.trim(),
      },
    });
  } catch (error) {
    console.error("generateSummary:", error);
  }
}

async function generateConversationName(
  user: string,
  ai: string,
  conversationId: string
) {
  const res = await generateText({
    model: google("gemini-1.5-flash"),
    messages: [
      {
        role: "user",
        content: user,
      },
      {
        role: "assistant",
        content: ai,
      },
      {
        role: "user",
        content:
          "Generate a short and meaningful title (under 5 words) for this conversation based on the user's query and the assistant's response. The title should be relevant, clear, and reflect the core topic discussed.",
      },
    ],
  });

  await client.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      title: res.text.trim(),
    },
  });
}

async function storeIntoVectorDB(
  conversationId: string,
  userMsg: string,
  aiRes: string
) {
  try {
    const documents: Document[] = [
      {
        pageContent: userMsg,
        metadata: { conversationId },
      },
      {
        pageContent: aiRes,
        metadata: { conversationId },
      },
    ];

    await vectorStore.addDocuments(documents);
  } catch (error) {
    console.error("VECTORSTORE:", error);
  }
}
