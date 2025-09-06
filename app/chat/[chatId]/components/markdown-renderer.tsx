import React from "react";
import { cn } from "@/lib/utils";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const CodeBlock = ({ children, className, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  if (className && className.includes("language-")) {
    return (
      <div className="relative group my-4">
        <div className="flex items-center justify-between bg-primary px-4 py-2 rounded-t-[var(--radius-md)] border border-sidebar-border border-b-0">
          <span className="text-xs text-sidebar-foreground font-mono uppercase tracking-[var(--tracking-wide)] font-medium">
            {language}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 transition-opacity hover:bg-primary/10"
            onClick={copyToClipboard}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <pre
          className={cn(
            "overflow-x-auto p-4 bg-sidebar-accent border border-sidebar-border rounded-b-[var(--radius-md)] rounded-t-none",
            "text-sm font-[var(--font-mono)] leading-relaxed shadow-[var(--shadow-sm)]"
          )}
        >
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className={cn(
        "relative rounded-[var(--radius-sm)] bg-accent px-[0.3rem] py-[0.2rem]",
        "font-[var(--font-mono)] text-sm font-semibold text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
}) => {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold tracking-[var(--tracking-tighter)] text-foreground mb-6 mt-8 first:mt-0 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold tracking-[var(--tracking-tight)] text-foreground mb-4 mt-6 first:mt-0 border-b border-border pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold tracking-[var(--tracking-tight)] text-foreground mb-3 mt-5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold tracking-[var(--tracking-normal)] text-foreground mb-2 mt-4 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-semibold tracking-[var(--tracking-normal)] text-foreground mb-2 mt-3 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold tracking-[var(--tracking-wide)] text-foreground mb-2 mt-3 first:mt-0">
              {children}
            </h6>
          ),

          p: ({ children }) => (
            <p className="text-foreground leading-7 mb-4 [&:not(:first-child)]:mt-4 tracking-[var(--tracking-normal)]">
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc [&>li]:mt-2 text-foreground space-y-[var(--spacing)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal [&>li]:mt-2 text-foreground space-y-[var(--spacing)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-7 tracking-[var(--tracking-normal)]">
              {children}
            </li>
          ),

          code: CodeBlock,
          pre: ({ children }) => children,

          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-primary/30 pl-6 italic text-muted-foreground bg-muted/30 py-4 rounded-r-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
              {children}
            </blockquote>
          ),

          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full border-collapse border border-border rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold text-foreground tracking-[var(--tracking-wide)] font-[var(--font-sans)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2 text-foreground font-[var(--font-sans)] tracking-[var(--tracking-normal)]">
              {children}
            </td>
          ),

          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors font-medium tracking-[var(--tracking-normal)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          hr: () => <hr className="my-8 border-0 h-px bg-border" />,

          strong: ({ children }) => (
            <strong className="font-semibold text-foreground font-[var(--font-sans)]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground font-[var(--font-serif)]">
              {children}
            </em>
          ),

          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-[var(--radius-lg)] border border-border my-4 shadow-[var(--shadow-md)]"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
