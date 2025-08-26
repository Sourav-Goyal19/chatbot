import React from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";
import type { MessageType } from "@/types";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";

interface MessageListProps {
  messages: MessageType[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <>
      {messages.map((message) => {
        return (
          <div key={message.id}>
            <div
              className={`flex gap-4 group relative ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="relative max-w-[100%]">
                <div className="p-4 rounded-2xl">
                  {message.role === "assistant" ? (
                    <MDEditor.Markdown
                      source={message.content}
                      style={{
                        background: "transparent",
                        fontSize: "0.875rem",
                        lineHeight: "1.625rem",
                        whiteSpace: "pre-wrap",
                        color: "var(--foreground)",
                      }}
                    />
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
                </div>
                <div
                  className={cn(
                    "flex items-center group gap-4 ml-3 mt-1",
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
