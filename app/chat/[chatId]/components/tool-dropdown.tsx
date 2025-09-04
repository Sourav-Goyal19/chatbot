import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ToolDropdownProps {
  content: string;
  title?: string;
}

export const ToolDropdown = ({
  content,
  title = "Thinking...",
}: ToolDropdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-muted/50 rounded-lg border border-border mt-2 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-border bg-muted/30">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
};
