import React from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { ToolDropdown } from "./tool-dropdown";
import { Button } from "@/components/ui/button";
import { MessageType, ToolMessageType } from "@/types";

interface MessageListProps {
  messages: MessageType[];
  toolMessages?: Record<string, ToolMessageType>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  toolMessages = {},
}) => {
  return (
    <>
      {messages.map((message) => {
        const relevantToolMessages = Object.values(toolMessages).filter(
          (toolMsg) =>
            toolMsg.type === "tool_call" || toolMsg.type === "tool_result"
        );

        return (
          <div key={message.id}>
            <div
              className={`flex group relative ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="relative max-w-[100%]">
                {message.role === "assistant" ? (
                  <div className="space-y-1">
                    {relevantToolMessages.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {relevantToolMessages.map((toolMsg) => (
                          <ToolDropdown
                            key={toolMsg.id}
                            content={toolMsg.content}
                            title={
                              toolMsg.type === "tool_call"
                                ? `Using ${toolMsg.name}`
                                : `Result from ${toolMsg.name}`
                            }
                          />
                        ))}
                      </div>
                    )}
                    <MDEditor.Markdown
                      source={message.content}
                      style={{
                        background: "transparent",
                        fontSize: "1rem",
                        lineHeight: "1.625rem",
                        whiteSpace: "pre-wrap",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.content && (
                      <p
                        className={cn(
                          "text-sm p-4 rounded-full leading-relaxed whitespace-pre-wrap",
                          message.role == "user" &&
                            "bg-primary/60 text-primary-foreground"
                        )}
                      >
                        {message.content}
                      </p>
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-center group gap-4 ml-2 mt-1.5",
                    message.role == "user" && "justify-end ml-0 mr-2"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      toast.success("Text copied to clipboard.");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
