import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send, AlertTriangle, Minimize2, Video as VideoIcon } from "lucide-react";
import ChatBubble from "./ChatBubble";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import { useVideoCall } from "@/hooks/useVideoCall";
import VideoCallOverlay from "./VideoCallOverlay";

interface ChatWindowProps {
  conversationId: string;
  otherName: string;
  onBack: () => void;
  onMinimize?: () => void;
}

const ChatWindow = ({ conversationId, otherName, onBack, onMinimize }: ChatWindowProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Fetch existing messages
    (supabase.from("messages" as any) as any)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        setMessages(data || []);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });

    // Mark unread messages as read
    (supabase.from("messages" as any) as any)
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_user_id", user.id)
      .is("read_at", null)
      .then(() => {});

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          // Auto-mark as read if from other user
          if (payload.new.sender_user_id !== user.id) {
            (supabase.from("messages" as any) as any)
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    // Rate limit: 1 msg/second
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    setSending(true);
    const content = text.trim().slice(0, 2000);
    setText("");

    await (supabase.from("messages" as any) as any).insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      content,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-2xl overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-foreground truncate flex-1">{otherName}</h3>
        {onMinimize && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onMinimize} title={t("chat.minimize")}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {t("chat.no_messages")}
          </div>
        ) : (
          messages.map((msg: any) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              timestamp={msg.created_at}
              isMine={msg.sender_user_id === user?.id}
              readAt={msg.read_at}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-1.5 bg-muted/40 border-t border-border">
        <p className="text-[10px] text-muted-foreground flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
          {t("chat.disclaimer")}
        </p>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          className="min-h-[40px] max-h-[120px] resize-none rounded-xl text-sm"
          rows={1}
        />
        <Button
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default ChatWindow;
