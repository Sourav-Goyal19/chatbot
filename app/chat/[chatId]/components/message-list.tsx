import React from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";
import { ToolDropdown } from "./tool-dropdown";
import { Button } from "@/components/ui/button";
import { MessageType, ToolMessageType } from "@/types";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageListProps {
  messages: MessageType[];
  messageTools?: Record<string, ToolMessageType[]>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  messageTools = {},
}) => {
  return (
    <>
      {messages.map((message) => {
        const messageToolMessages = messageTools[message.id] || [];
        return (
          <div key={message.id} className="mb-8">
            <div
              className={`flex group relative ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="relative w-full">
                {message.role === "assistant" ? (
                  <div className="space-y-1">
                    {message.role === "assistant" &&
                      messageToolMessages.length > 0 && (
                        <div className="mt-2 space-y-2 mb-4">
                          {messageToolMessages.map((toolMsg) => (
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

                    <div
                      className={cn(
                        "bg-card border border-border p-6 shadow-[var(--shadow-sm)]",
                        "rounded-[var(--radius-xl)] font-[var(--font-sans)]"
                      )}
                    >
                      <MarkdownRenderer
                        content={message.content}
                        className="text-card-foreground markdown-content"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.content && (
                      <div
                        className={cn(
                          "text-base p-4 px-6 leading-relaxed whitespace-pre-wrap max-w-[90%] justify-self-end",
                          "font-[var(--font-mono)] tracking-[var(--tracking-normal)]",
                          "rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)]",
                          message.role == "user" &&
                            "bg-primary/60 text-primary-foreground"
                        )}
                      >
                        <MarkdownRenderer
                          content={message.content}
                          className="text-current [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        />
                      </div>
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
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0",
                      "hover:bg-sidebar-accent rounded-[var(--radius-sm)]"
                    )}
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
