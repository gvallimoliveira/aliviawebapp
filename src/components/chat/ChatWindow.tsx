import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send, AlertTriangle, Minimize2, Video as VideoIcon, MessageSquareHeart } from "lucide-react";
import ChatBubble from "./ChatBubble";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import { useVideoCallContext } from "@/contexts/VideoCallContext";
import PreCallScreen from "./PreCallScreen";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

interface ChatWindowProps {
  conversationId: string;
  otherName: string;
  onBack: () => void;
  onMinimize?: () => void;
}

const ChatWindow = ({ conversationId, otherName, onBack, onMinimize }: ChatWindowProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { activeClinic } = useClinic();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Video call from unified context
  const vc = useVideoCallContext();
  const [showPreCall, setShowPreCall] = useState(false);

  useEffect(() => {
    if (!conversationId || !user) return;

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });

    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_user_id", user.id)
      .is("read_at", null)
      .then(() => {});

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
          const newMsg = payload.new;
          if (newMsg.sender_user_id !== user.id) {
            const readNow = new Date().toISOString();
            setMessages((prev) => [...prev, { ...newMsg, read_at: readNow }]);
            supabase
              .from("messages")
              .update({ read_at: readNow })
              .eq("id", newMsg.id)
              .then(() => {});
          } else {
            setMessages((prev) => [...prev, newMsg]);
          }
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Typing indicator via Presence
  useEffect(() => {
    if (!conversationId || !user) return;

    const presenceChannel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherUsers = Object.keys(state).filter((k) => k !== user.id);
        const isTyping = otherUsers.some((uid) => {
          const presences = state[uid] as any[];
          return presences?.some((p: any) => p.typing);
        });
        setOtherTyping(isTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ typing: false });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, user]);

  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!user) return;
      const channel = supabase.channel(`typing-${conversationId}`);
      channel.track({ typing: isTyping });
    },
    [conversationId, user]
  );

  const handleTextChange = (value: string) => {
    setText(value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    setSending(true);
    broadcastTyping(false);
    const content = text.trim().slice(0, 2000);
    setText("");

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      content,
    });

    // Push notification is sent server-side by the messages trigger, so it
    // reaches the recipient even if this device goes offline right after send.



    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const callerName = user?.user_metadata?.full_name || "Usuário";

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-2xl overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{otherName}</h3>
          {otherTyping && (
            <p className="text-[10px] text-primary animate-pulse">
              {t("chat.typing") || "digitando..."}
            </p>
          )}
        </div>
        {ENABLE_VIDEO_CALL && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary"
            onClick={() => setShowPreCall(true)}
            disabled={vc.state !== "idle"}
            title={t("chat.video_call")}
          >
            <VideoIcon className="h-4 w-4" />
          </Button>
        )}
        {activeClinic?.clinic_id && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary"
            onClick={() => {
              const link = `${getPublicOrigin()}/feedback/clinic/${activeClinic.clinic_id}`;
              const msg = `📋 Pesquisa de satisfação: ${link}`;
              setText(msg);
            }}
            title={t("chat.send_feedback") || "Enviar pesquisa de feedback"}
          >
            <MessageSquareHeart className="h-4 w-4" />
          </Button>
        )}
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
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
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
          onChange={(e) => handleTextChange(e.target.value)}
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

      {/* Pre-call permission screen */}
      {ENABLE_VIDEO_CALL && (
        <PreCallScreen
          open={showPreCall}
          otherName={otherName}
          onStartCall={(preparedStream) => {
            setShowPreCall(false);
            void vc.startCall(conversationId, callerName, otherName, preparedStream);
          }}
          onCancel={() => setShowPreCall(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
