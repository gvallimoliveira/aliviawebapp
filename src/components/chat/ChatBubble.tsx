import { cn } from "@/lib/utils";
import { Check, CheckCheck, Video, PhoneMissed, PhoneOff } from "lucide-react";

interface ChatBubbleProps {
  content: string;
  timestamp: string;
  isMine: boolean;
  readAt?: string | null;
}

const SYSTEM_PREFIX = "📹 ";
const isSystemMessage = (content: string) => content.startsWith(SYSTEM_PREFIX);

const ChatBubble = ({ content, timestamp, isMine, readAt }: ChatBubbleProps) => {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isSystemMessage(content)) {
    const text = content.slice(SYSTEM_PREFIX.length);
    const isEndedOk = text.includes("encerrada") || text.includes("ended") || text.includes("duração") || text.includes("duration");
    const isMissed = text.includes("não atendida") || text.includes("not answered") || text.includes("rejeitada") || text.includes("rejected");
    const Icon = isMissed ? PhoneMissed : isEndedOk ? PhoneOff : Video;

    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-4 py-1.5 max-w-[85%]">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", isMissed ? "text-destructive" : "text-primary")} />
          <span className="text-xs text-muted-foreground">{text}</span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0">{time}</span>
        </div>
      </div>
    );
  }

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
