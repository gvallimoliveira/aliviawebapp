import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DsrAccountPanel from "@/components/admin/DsrAccountPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  Mail,
  Send,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

type Delivery = {
  channel: string;
  status: string;
  event_type: string;
  detail: string | null;
  created_at: string;
};

type AuditEvent = Record<string, unknown> & { event?: string; at?: string; actor?: string; note?: string };

type DsrRow = {
  id: string;
  user_id: string;
  protocol: string | null;
  request_type: string;
  status: string;
  details: string | null;
  created_at: string;
  updated_at: string;
  handled_at: string | null;
  notified_at: string | null;
  scheduled_purge_at: string | null;
  subject_name: string | null;
  subject_email: string | null;
  account_type: string | null;
  signup_provider: string | null;
  account_created_at: string | null;
  account_exists: boolean;
  audit: AuditEvent[] | null;
  alerts: Delivery[] | null;
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  patient: "Paciente (conta pessoal)",
  professional: "Profissional (PRO)",
  student: "Estudante (Acadêmico)",
  clinic_staff: "Equipe de clínica",
};

const PROVIDER_LABEL: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  apple: "Apple",
  azure: "Microsoft",
  phone: "Telefone (SMS)",
};

const AUDIT_LABEL: Record<string, string> = {
  opened: "Pedido aberto pelo titular",
  scheduled: "Exclusão agendada (janela de arrependimento)",
  cancelled_by_subject: "Exclusão cancelada pelo titular",
  subject_notified: "Titular notificado por e-mail",
  purged: "Dados excluídos",
  completed: "Pedido concluído",
  note: "Providência registrada",
};

const DEADLINE_DAYS = 15;


const TYPE_LABEL: Record<string, string> = {
  access: "Acesso aos dados",
  portability: "Portabilidade",
  correction: "Correção",
  deletion: "Exclusão",
  revocation: "Revogação de consentimento",
  anonymization: "Anonimização",
  info: "Informação sobre compartilhamento",
};

const NEXT_STEPS: Record<string, string[]> = {
  access: [
    "Confirmar identidade do titular (e-mail cadastrado).",
    "Gerar o relatório de dados na conta do titular (exportação .json) e confirmar finalidades do tratamento.",
    "Responder por e-mail listando categorias de dados, finalidade, base legal e retenção.",
  ],
  portability: [
    "Orientar o titular a usar Minha Conta → Privacidade → Exportar meus dados (.json) — autoatendimento.",
    "Se o titular pedir envio direto, anexar o export no e-mail de resposta.",
    "Registrar a entrega e encerrar o pedido.",
  ],
  correction: [
    "Identificar quais campos não são editáveis pelo próprio usuário (e-mail de login, dados clínicos).",
    "Corrigir no banco/prontuário mantendo rastro de auditoria.",
    "Confirmar a correção por e-mail ao titular.",
  ],
  deletion: [
    "Verificar retenção legal obrigatória (prontuário: guarda mínima exigida pelo conselho).",
    "Excluir/anonimizar o que não estiver sob retenção legal; cancelar assinatura ativa se houver.",
    "Explicar ao titular o que foi apagado e o que permanece retido, com a base legal.",
  ],
  revocation: [
    "Desativar comunicações baseadas em consentimento (marketing, follow-ups, lembretes).",
    "Manter apenas tratamentos com outra base legal (contrato, obrigação legal).",
    "Registrar a revogação em consent_records e confirmar ao titular.",
  ],
  anonymization: [
    "Avaliar viabilidade técnica de anonimizar mantendo histórico clínico agregado.",
    "Executar anonimização irreversível dos identificadores.",
    "Confirmar ao titular.",
  ],
  info: [
    "Listar operadores/subprocessadores que recebem dados (Stripe, Resend, provedores de IA/infra).",
    "Responder com finalidades e base legal de cada compartilhamento.",
  ],
};

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail }> = {
  email: { label: "E-mail", icon: Mail },
  telegram: { label: "Telegram", icon: Send },
  push: { label: "Push", icon: BellRing },
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function deadlineInfo(createdAt: string, status: string) {
  const due = new Date(new Date(createdAt).getTime() + DEADLINE_DAYS * 86400000);
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const done = status === "completed" || status === "rejected";
  return { due, daysLeft, done };
}

const AdminLgpdCenter = () => {
  const [rows, setRows] = useState<DsrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_dsr_admin");
    if (error) {
      toast({ title: "Erro ao carregar pedidos", description: error.message, variant: "destructive" });
    } else {
      setRows((data as unknown as DsrRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending" || r.status === "in_progress");
    const late = pending.filter((r) => deadlineInfo(r.created_at, r.status).daysLeft < 0);
    const soon = pending.filter((r) => {
      const d = deadlineInfo(r.created_at, r.status).daysLeft;
      return d >= 0 && d <= 5;
    });
    const undelivered = rows.filter(
      (r) => !(r.alerts || []).some((d) => d.status === "sent" || d.status === "ok"),
    );
    return { total: rows.length, pending: pending.length, late: late.length, soon: soon.length, undelivered: undelivered.length };
  }, [rows]);

  const updateStatus = async (row: DsrRow, status: string) => {
    setSavingId(row.id);
    const note = notes[row.id]?.trim();
    const payload: Record<string, unknown> = { status };
    if (status === "completed" || status === "rejected") {
      payload.handled_at = new Date().toISOString();
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) payload.handled_by = auth.user.id;
    }
    if (note) {
      payload.details = `${row.details ? row.details + "\n\n" : ""}[Admin ${fmt(new Date().toISOString())}] ${note}`;
    }
    const { error } = await supabase.from("data_subject_requests").update(payload).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((n) => ({ ...n, [row.id]: "" }));
    toast({ title: "Pedido atualizado" });
    load();
  };

  const resendAlert = async (row: DsrRow) => {
    setSavingId(row.id);
    const { error } = await supabase.functions.invoke("notify-admin", {
      body: { action: "sweep" },
    });
    setSavingId(null);
    if (error) {
      toast({ title: "Falha ao reenviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reenvio solicitado", description: `Pedido ${row.id.slice(0, 8)} reprocessado.` });
    load();
  };

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-primary/15 text-primary border-primary/30">Concluído</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Recusado</Badge>;
    if (status === "in_progress") return <Badge variant="secondary">Em andamento</Badge>;
    if (status === "scheduled") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Exclusão agendada</Badge>;
    if (status === "cancelled") return <Badge variant="outline">Cancelado pelo titular</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pedidos totais", value: stats.total, icon: ShieldCheck, tone: "text-primary" },
          { label: "Em aberto", value: stats.pending, icon: Clock, tone: "text-foreground" },
          { label: "Prazo vencendo (≤5d)", value: stats.soon, icon: AlertTriangle, tone: "text-amber-600" },
          { label: "Fora do prazo", value: stats.late, icon: AlertTriangle, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <s.icon className={`h-3.5 w-3.5 ${s.tone}`} />
                {s.label}
              </div>
              <p className={`text-2xl font-bold ${s.tone}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Central de Alertas LGPD
            </CardTitle>
            <CardDescription>
              Pedidos de titulares (acesso, portabilidade, correção, exclusão, revogação), entrega das
              notificações por canal, prazo legal de {DEADLINE_DAYS} dias e próximos passos.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum pedido de privacidade recebido até agora.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {rows.map((row) => {
                const { due, daysLeft, done } = deadlineInfo(row.created_at, row.status);
                const deliveries = row.alerts || [];
                const anySent = deliveries.some((d) => d.status === "sent" || d.status === "ok");
                return (
                  <AccordionItem key={row.id} value={row.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 flex-col items-start gap-1 pr-3 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {TYPE_LABEL[row.request_type] || row.request_type}
                          </span>
                          {statusBadge(row.status)}
                          {!done && daysLeft < 0 && (
                            <Badge variant="destructive">Fora do prazo ({Math.abs(daysLeft)}d)</Badge>
                          )}
                          {!done && daysLeft >= 0 && daysLeft <= 5 && (
                            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                              Faltam {daysLeft}d
                            </Badge>
                          )}
                          {!anySent && (
                            <Badge variant="outline" className="text-destructive border-destructive/40">
                              Alerta não entregue
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {row.subject_name || "—"} · {row.subject_email || "e-mail indisponível"} ·{" "}
                          {fmt(row.created_at)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-3 text-xs">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-muted-foreground mb-1">Recebido em</p>
                          <p className="font-medium">{fmt(row.created_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-muted-foreground mb-1">Prazo legal ({DEADLINE_DAYS} dias)</p>
                          <p className={`font-medium ${!done && daysLeft < 0 ? "text-destructive" : ""}`}>
                            {due.toLocaleDateString("pt-BR")}
                            {!done && ` · ${daysLeft < 0 ? "vencido" : `${daysLeft}d restantes`}`}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-muted-foreground mb-1">Tratado em</p>
                          <p className="font-medium">{fmt(row.handled_at)}</p>
                        </div>
                      </div>

                      <DsrAccountPanel
                        userId={row.user_id}
                        requestId={row.id}
                        requestType={row.request_type}
                        onPurged={load}
                      />



                      {row.details && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Descrição / histórico</p>
                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{row.details}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold mb-2">Entrega da notificação por canal</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(["email", "telegram", "push"] as const).map((ch) => {
                            const meta = CHANNEL_META[ch];
                            const last = deliveries.find((d) => d.channel === ch);
                            const ok = last && (last.status === "sent" || last.status === "ok");
                            return (
                              <div
                                key={ch}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                                  ok
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : last
                                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                                      : "border-border text-muted-foreground"
                                }`}
                              >
                                <meta.icon className="h-3.5 w-3.5" />
                                {meta.label}
                                {ok ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : last ? (
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                ) : (
                                  <span>sem registro</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {deliveries.length > 0 && (
                          <ul className="space-y-1">
                            {deliveries.map((d, i) => (
                              <li key={i} className="text-xs text-muted-foreground">
                                {fmt(d.created_at)} · {CHANNEL_META[d.channel]?.label || d.channel} ·{" "}
                                <span className={d.status === "sent" || d.status === "ok" ? "text-primary" : "text-destructive"}>
                                  {d.status}
                                </span>
                                {d.detail ? ` — ${d.detail}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold mb-2">Próximos passos</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                          {(NEXT_STEPS[row.request_type] || ["Analisar o pedido e responder ao titular em até 15 dias."]).map(
                            (s, i) => (
                              <li key={i}>{s}</li>
                            ),
                          )}
                        </ol>
                      </div>

                      <div className="space-y-2">
                        <Textarea
                          placeholder="Registrar providência tomada (opcional, fica no histórico do pedido)"
                          value={notes[row.id] || ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === row.id || row.status === "in_progress"}
                            onClick={() => updateStatus(row, "in_progress")}
                          >
                            Marcar em andamento
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingId === row.id || row.status === "completed"}
                            onClick={() => updateStatus(row, "completed")}
                          >
                            {savingId === row.id && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={savingId === row.id || row.status === "rejected"}
                            onClick={() => updateStatus(row, "rejected")}
                          >
                            Recusar (com justificativa)
                          </Button>
                          {row.subject_email && (
                            <Button size="sm" variant="ghost" asChild>
                              <a
                                href={`mailto:${row.subject_email}?subject=${encodeURIComponent(
                                  "Aliv.iA — seu pedido de privacidade (LGPD)",
                                )}`}
                              >
                                <Mail className="h-3.5 w-3.5 mr-1" /> Responder titular
                              </a>
                            </Button>
                          )}
                          {!anySent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={savingId === row.id}
                              onClick={() => resendAlert(row)}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reenviar alerta
                            </Button>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLgpdCenter;
