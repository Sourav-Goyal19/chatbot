import { twMerge } from "tailwind-merge";
import { VersionGroupType } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToHistoryMessages(
  versionGroups: VersionGroupType[]
): BaseMessage[] {
  const messages: BaseMessage[] = versionGroups
    .reverse()
    .flatMap((group) => {
      const adjustedIndex =
        group.index % 2 === 0 ? group.index : group.index - 1;
      return group.messages.slice(adjustedIndex, adjustedIndex + 2);
    })
    .map((msg) => {
      if (msg.role == "assistant") {
        return new AIMessage({ content: msg.content });
      } else {
        return new HumanMessage({ content: msg.content });
      }
    });

  return messages;
}
