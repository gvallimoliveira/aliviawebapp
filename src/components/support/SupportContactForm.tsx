import { useState, useEffect } from "react";
import { Send, Loader2, MessageSquare, Clock, CheckCircle2, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const statusIcon = {
  open: Clock,
  replied: Reply,
  closed: CheckCircle2,
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  replied: "secondary",
  closed: "outline",
};

export default function SupportContactForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data } = await (supabase.from("support_tickets" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setTickets((data as Ticket[]) || []);
    setLoadingTickets(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleSend = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await (supabase.from("support_tickets" as any) as any).insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;

      // Admins are notified server-side (DB trigger + cron sweep on notify-admin).


      toast({ description: t("support.contact.success") });
      setSubject("");
      setMessage("");
      fetchTickets();
    } catch {
      toast({ description: t("support.contact.error"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-16 max-w-2xl mx-auto space-y-8">
      {/* Contact form */}
      <Card className="border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto rounded-2xl bg-primary/10 p-3 w-fit mb-2">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("support.contact.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("support.contact.desc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("support.contact.subject")}
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("support.contact.subject_placeholder")}
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("support.contact.message")}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("support.contact.message_placeholder")}
              rows={4}
              maxLength={2000}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="w-full gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? t("support.contact.sending") : t("support.contact.send")}
          </Button>
        </CardContent>
      </Card>

      {/* Previous tickets */}
      {!loadingTickets && tickets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("support.contact.my_tickets")}
          </h3>
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const StatusIcon = statusIcon[ticket.status as keyof typeof statusIcon] || Clock;
              return (
                <Card key={ticket.id} className="border-border/60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-foreground text-sm">{ticket.subject}</h4>
                      <Badge variant={statusVariant[ticket.status] || "default"} className="gap-1 text-xs shrink-0">
                        <StatusIcon className="h-3 w-3" />
                        {t(`support.contact.status.${ticket.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ticket.message}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                    {ticket.admin_reply && (
                      <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
                        <p className="text-xs font-medium text-primary mb-1">
                          {t("support.contact.admin_reply")}
                        </p>
                        <p className="text-sm text-foreground">{ticket.admin_reply}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
