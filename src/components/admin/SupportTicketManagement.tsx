import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Loader2, Clock, Reply, CheckCircle2, RotateCcw, Archive } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  user_email: string | null;
  user_name: string | null;
}

const statusIcon = { open: Clock, replied: Reply, closed: CheckCircle2 };
const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  replied: "secondary",
  closed: "outline",
};

export default function SupportTicketManagement({ language }: { language: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const t = (key: string) => {
    const map: Record<string, Record<string, string>> = {
      title: { pt: "Solicitações de Suporte", en: "Support Requests", es: "Solicitudes de Soporte" },
      desc: { pt: "Gerencie as mensagens enviadas pelos usuários", en: "Manage messages sent by users", es: "Gestiona los mensajes enviados por los usuarios" },
      no_tickets: { pt: "Nenhuma solicitação pendente.", en: "No pending requests.", es: "No hay solicitudes pendientes." },
      reply_placeholder: { pt: "Escreva sua resposta...", en: "Write your reply...", es: "Escribe tu respuesta..." },
      reply: { pt: "Responder", en: "Reply", es: "Responder" },
      close: { pt: "Fechar", en: "Close", es: "Cerrar" },
      reopen: { pt: "Reabrir", en: "Reopen", es: "Reabrir" },
      replied_success: { pt: "Resposta enviada!", en: "Reply sent!", es: "¡Respuesta enviada!" },
      status_updated: { pt: "Status atualizado.", en: "Status updated.", es: "Estado actualizado." },
      open: { pt: "Aberto", en: "Open", es: "Abierto" },
      replied: { pt: "Respondido", en: "Replied", es: "Respondido" },
      closed: { pt: "Fechado", en: "Closed", es: "Cerrado" },
      archive: { pt: "Arquivar", en: "Archive", es: "Archivar" },
      archived: { pt: "Arquivado", en: "Archived", es: "Archivado" },
      show_archived: { pt: "Mostrar arquivados", en: "Show archived", es: "Mostrar archivados" },
      archive_confirm: { pt: "Arquivar este ticket? O registro será preservado como backup.", en: "Archive this ticket? The record will be preserved as backup.", es: "¿Archivar este ticket? El registro se preservará como respaldo." },
      archive_success: { pt: "Ticket arquivado com sucesso.", en: "Ticket archived successfully.", es: "Ticket archivado exitosamente." },
    };
    const lang = language === "pt" ? "pt" : language === "es" ? "es" : "en";
    return map[key]?.[lang] || key;
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_support_tickets_admin", {
      _include_archived: showArchived,
    });
    if (error) {
      console.error("[support-tickets] fetch error", error);
    }
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [showArchived]);

  const handleReply = async (ticketId: string) => {
    const reply = replyTexts[ticketId]?.trim();
    if (!reply) return;
    setSubmitting(ticketId);
    const { error } = await (supabase.from("support_tickets" as any) as any)
      .update({ admin_reply: reply, status: "replied" })
      .eq("id", ticketId);
    if (!error) {
      toast({ description: t("replied_success") });
      setReplyTexts((prev) => ({ ...prev, [ticketId]: "" }));
      fetchTickets();
    }
    setSubmitting(null);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setSubmitting(ticketId);
    await (supabase.from("support_tickets" as any) as any)
      .update({ status: newStatus })
      .eq("id", ticketId);
    toast({ description: t("status_updated") });
    fetchTickets();
    setSubmitting(null);
  };

  const handleArchive = async (ticketId: string) => {
    if (!confirm(t("archive_confirm"))) return;
    setSubmitting(ticketId);
    const { error } = await supabase.functions.invoke("manage-vip-users", {
      body: { action: "archive_ticket", id: ticketId },
    });
    if (!error) {
      toast({ description: t("archive_success") });
      fetchTickets();
    }
    setSubmitting(null);
  };

  if (loading) {
    return (
      <Card className="mt-8">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription>
              {tickets.length} {t("desc").toLowerCase().includes("manage") ? "ticket(s)" : "solicitação(ões)"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("show_archived")}</span>
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{t("no_tickets")}</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const isArchived = !!ticket.archived_at;
              const StatusIcon = statusIcon[ticket.status as keyof typeof statusIcon] || Clock;
              return (
                <div
                  key={ticket.id}
                  className={`border rounded-lg p-4 space-y-3 transition-opacity ${isArchived ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm">{ticket.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-1 break-words">{ticket.message}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-xs">
                        <span className="font-medium text-foreground/80">
                          {ticket.user_name || "—"}
                        </span>
                        {ticket.user_email && (
                          <a
                            href={`mailto:${ticket.user_email}?subject=Re: ${encodeURIComponent(ticket.subject)}`}
                            className="text-primary hover:underline break-all"
                          >
                            {ticket.user_email}
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isArchived && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Archive className="h-3 w-3" />
                          {t("archived")}
                        </Badge>
                      )}
                      <Badge variant={statusVariant[ticket.status] || "default"} className="gap-1 text-xs">
                        <StatusIcon className="h-3 w-3" />
                        {t(ticket.status)}
                      </Badge>
                    </div>
                  </div>

                  {ticket.admin_reply && (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <p className="text-xs font-medium text-primary mb-1">{t("reply")}</p>
                      <p className="text-sm text-foreground">{ticket.admin_reply}</p>
                    </div>
                  )}

                  {!isArchived && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Textarea
                        value={replyTexts[ticket.id] || ""}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                        }
                        placeholder={t("reply_placeholder")}
                        rows={2}
                        className="flex-1 text-sm"
                      />
                      <div className="flex sm:flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReply(ticket.id)}
                          disabled={!replyTexts[ticket.id]?.trim() || submitting === ticket.id}
                          className="gap-1"
                        >
                          {submitting === ticket.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Reply className="h-3 w-3" />
                          )}
                          {t("reply")}
                        </Button>
                        {ticket.status !== "closed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(ticket.id, "closed")}
                            disabled={submitting === ticket.id}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t("close")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(ticket.id, "open")}
                            disabled={submitting === ticket.id}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t("reopen")}
                          </Button>
                        )}
                        {(ticket.status === "closed" || ticket.status === "replied") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleArchive(ticket.id)}
                            disabled={submitting === ticket.id}
                            className="gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Archive className="h-3 w-3" />
                            {t("archive")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
