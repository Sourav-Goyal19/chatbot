import { ArrowUp } from "lucide-react";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  isLoading: boolean;
  form: UseFormReturn<{ query: string }>;
  onSubmit: (values: { query: string }) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  form,
  onSubmit,
  isLoading,
}) => {
  const textareaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current?.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [form.watch("query")]);

  const handleSubmit = async (values: { query: string }) => {
    onSubmit(values);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <div className="bg-background p-4">
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-3xl mx-auto"
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center bg-card py-2 px-6 rounded-full transition-colors group focus-within:outline-2 focus-within:ring-2 focus-within:ring-ring focus-within:outline-ring/50">
            <div
              className="flex-1 items-center justify-center"
              ref={textareaRef}
            >
              <Textarea
                {...form.register("query")}
                placeholder="Ask anything"
                className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent dark:bg-transparent rounded-none dark:rounded-none shadow-none dark:shadow-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-0 py-2"
                onKeyDown={handleKeyDown}
                id="querybox"
                rows={1}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !form.watch("query")?.trim()}
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
