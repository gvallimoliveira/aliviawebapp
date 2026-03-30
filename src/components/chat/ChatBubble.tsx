import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  content: string;
  timestamp: string;
  isMine: boolean;
  readAt?: string | null;
}

const ChatBubble = ({ content, timestamp, isMine, readAt }: ChatBubbleProps) => {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <div className={cn("flex items-center justify-end gap-1 mt-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
          <span className="text-[10px]">{time}</span>
          {isMine && (
            readAt ? (
              <CheckCheck className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
