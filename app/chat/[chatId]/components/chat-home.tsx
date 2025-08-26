"use client";

import { z } from "zod";
import { Bot } from "lucide-react";
import { toast } from "react-hot-toast";
import { ChatInput } from "./chat-input";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { MessageList } from "./message-list";
import { useQueryStore } from "@/zustand/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentMessages } from "../conversation-utils";
import type { VersionGroupType, MessageType } from "@/types";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface ChatHomePageProps {
  versionGroups: VersionGroupType[];
}

export const ChatHomePage: React.FC<ChatHomePageProps> = ({
  versionGroups: initialVersionGroups,
}) => {
  const params = useParams();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { query: firstQuery, clearQuery } = useQueryStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [versionGroups, setVersionGroups] =
    useState<VersionGroupType[]>(initialVersionGroups);

  const [currentVersionIndices, setCurrentVersionIndices] = useState<
    Record<string, number>
  >({});

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout>(null);
  const lastScrollTopRef = useRef(0);
  const isStreamingRef = useRef(false);

  const allMessages = getCurrentMessages(versionGroups, currentVersionIndices);

  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !isStreamingRef.current) return;

    const currentScrollTop = scrollContainerRef.current.scrollTop;

    if (currentScrollTop < lastScrollTopRef.current) {
      setShouldAutoScroll(false);
      setIsUserScrolling(true);

      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 150);
    }

    if (isNearBottom() && !shouldAutoScroll) {
      setShouldAutoScroll(true);
    }

    lastScrollTopRef.current = currentScrollTop;
  }, [isNearBottom, shouldAutoScroll]);

  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll && !isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldAutoScroll, isUserScrolling]);

  const resetAutoScroll = useCallback(() => {
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
  }, []);

  const formSchema = z.object({
    query: z.string().min(1, "Empty query is not allowed"),
  });

  type FormType = z.infer<typeof formSchema>;

  const form = useForm<FormType>({
    defaultValues: { query: "" },
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: FormType) => {
    if (!values.query.trim()) return;
    form.reset();
    setIsLoading(true);
    resetAutoScroll();
    isStreamingRef.current = true;

    try {
      const tempVersionGroup: VersionGroupType = {
        id: `temp-${Date.now()}`,
        createdAt: new Date(),
        conversationId: params.chatId as string,
        versions: [],
        index: 0,
        messages: [
          {
            id: `temp-user-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            conversationId: params.chatId as string,
            versionGroupId: `temp-${Date.now()}`,
            sender: "user",
            content: values.query,
            role: "user",
            files: [],
            streaming: false,
          },
        ],
      };

      setVersionGroups((prev) => [...prev, tempVersionGroup]);

      const res = await fetch(`/api/conversations/${params.chatId}/query`, {
        method: "POST",
        body: JSON.stringify({
          query: values.query,
          isFirstQuery: firstQuery ? true : false,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      form.reset();

      const tempAIMessage: MessageType = {
        id: `temp-ai-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversationId: params.chatId as string,
        versionGroupId: tempVersionGroup.id,
        sender: "assistant",
        content: "",
        role: "assistant",
        files: [],
        streaming: true,
      };

      setVersionGroups((prev) =>
        prev.map((group) =>
          group.id === tempVersionGroup.id
            ? { ...group, messages: [...group.messages, tempAIMessage] }
            : group
        )
      );
      setIsLoading(false);

      queryClient.invalidateQueries({ queryKey: ["conversations-all"] });

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;

        setVersionGroups((prev) =>
          prev.map((group) =>
            group.id === tempVersionGroup.id
              ? {
                  ...group,
                  messages: group.messages.map((msg) =>
                    msg.id === tempAIMessage.id
                      ? { ...msg, content: fullText, streaming: false }
                      : msg
                  ),
                }
              : group
          )
        );
      }

      isStreamingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["conversations-all"] });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred");
      form.setValue("query", values.query);
      setIsLoading(false);
      isStreamingRef.current = false;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  useEffect(() => {
    const callFirstQuery = async () => {
      form.setValue("query", firstQuery!);
      await onSubmit({ query: firstQuery! });
      clearQuery();
    };
    if (firstQuery) {
      callFirstQuery();
    }
  }, [firstQuery]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      document.getElementById("querybox")?.focus();
    };

    document.documentElement.addEventListener("keydown", handleKeydown);

    return () => {
      document.documentElement.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background w-full">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {allMessages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground">
                Start a conversation by typing a message below.
              </p>
            </div>
          ) : (
            <MessageList messages={allMessages} />
          )}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="max-w-[80%] p-4 bg-muted text-muted-foreground rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="flex gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm bg-muted-foreground/40"
                      style={{
                        animationDuration: "1.4s",
                        animationDelay: "0s",
                        animation: "bounce 1.4s infinite",
                      }}
                    ></div>
                    <div
                      className="w-3 h-3 rounded-full shadow-sm bg-muted-foreground/60"
                      style={{
                        animationDuration: "1.4s",
                        animationDelay: "0.2s",
                        animation: "bounce 1.4s infinite",
                      }}
                    ></div>
                    <div
                      className="w-3 h-3 rounded-full shadow-sm bg-muted-foreground/80"
                      style={{
                        animationDuration: "1.4s",
                        animationDelay: "0.4s",
                        animation: "bounce 1.4s infinite",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput form={form} onSubmit={onSubmit} isLoading={isLoading} />
    </div>
  );
};
