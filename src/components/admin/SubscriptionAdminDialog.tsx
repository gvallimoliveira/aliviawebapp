import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import GuidedCancellationPanel from "./GuidedCancellationPanel";

interface Props {
  professional: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: (patch: Record<string, any>) => void;
}

type Snapshot = {
  stripe_customer_id: string | null;
  subscriptions: any[];
  active_subscriptions: any[];
  duplicate_active: boolean;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const money = (amount?: number | null, currency?: string) =>
  amount == null ? "—" : `${(currency || "brl").toUpperCase()} ${(amount / 100).toFixed(2)}`;

const SubscriptionAdminDialog = ({ professional, open, onOpenChange, onUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reason, setReason] = useState("");
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selfActions, setSelfActions] = useState<any[]>([]);

  const call = async (action: string, subscription_id?: string) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-subscription", {
      body: { action, professional_id: professional.id, reason: reason || undefined, subscription_id },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
    return data as any;
  };

  const inspect = async () => {
    setLoading(true);
    try {
      const data = await call("inspect");
      setSnapshot(data);
      setSelectedSub(data?.active_subscriptions?.[0]?.id ?? null);
      const { data: acts } = await supabase
        .from("subscription_admin_actions")
        .select("action, reason, created_at, new_status")
        .eq("professional_id", professional.id)
        .like("action", "self_%")
        .order("created_at", { ascending: false })
        .limit(5);
      setSelfActions(acts || []);
    } catch (e: any) {
      toast({ title: "Erro ao consultar Stripe", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  // Load on first open
  if (open && !snapshot && !loading) {
    void inspect();
  }

  const run = async (action: string, label: string) => {
    if (!reason.trim()) {
      toast({ title: "Informe o motivo", description: "O motivo fica registrado na auditoria.", variant: "destructive" });
      return;
    }
    setActing(action);
    try {
      const data = await call(action, selectedSub || undefined);
      toast({ title: label, description: "Ação registrada na auditoria." });
      onUpdated?.(data?.updates || {});
      await inspect();
    } catch (e: any) {
      toast({ title: "Falha na ação", description: e.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const activeCount = snapshot?.active_subscriptions?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSnapshot(null); setReason(""); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Gerenciar acesso e assinatura
          </DialogTitle>
          <DialogDescription>
            {professional.full_name} · {professional.email || "sem e-mail"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stripe state */}
            <div className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Assinaturas no Stripe</p>
                <div className="flex items-center gap-2">
                  <Badge variant={activeCount > 1 ? "destructive" : "secondary"}>
                    {activeCount} ativa{activeCount === 1 ? "" : "s"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={inspect} title="Atualizar">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {activeCount > 1 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Cobrança duplicada detectada — cancele apenas a assinatura excedente.
                </p>
              )}
              {activeCount === 1 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Apenas uma assinatura ativa: a próxima cobrança será única.
                </p>
              )}

              <div className="space-y-1.5">
                {(snapshot?.subscriptions || []).map((s) => {
                  const isActive = s.status === "active" || s.status === "trialing";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!isActive}
                      onClick={() => setSelectedSub(s.id)}
                      className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${
                        selectedSub === s.id ? "ring-2 ring-primary/40 border-primary/40" : ""
                      } ${isActive ? "bg-background hover:bg-muted/50" : "bg-muted/40 opacity-70 cursor-default"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate">{s.id}</span>
                        <Badge variant={isActive ? "default" : "outline"} className="text-[10px]">
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {money(s.amount, s.currency)} · criada em {fmt(s.created)} · renova em {fmt(s.current_period_end)}
                        {s.cancel_at_period_end ? " · cancelamento agendado" : ""}
                      </p>
                    </button>
                  );
                })}
                {(!snapshot?.subscriptions || snapshot.subscriptions.length === 0) && (
                  <p className="text-xs text-muted-foreground">Nenhuma assinatura encontrada no Stripe.</p>
                )}
              </div>
            </div>

            {selfActions.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-sm font-semibold">Ações feitas pelo próprio usuário</p>
                {selfActions.map((a, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {a.action === "self_cancel_at_period_end"
                      ? "Cancelamento solicitado"
                      : a.action === "self_resume"
                        ? "Cancelamento desfeito"
                        : a.action === "self_switch_to_annual"
                          ? "Mudou para o plano anual"
                          : a.action}{" "}
                    em {fmt(a.created_at)}
                    {a.reason ? ` · “${a.reason}”` : ""}
                  </p>
                ))}
              </div>
            )}



            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Motivo (obrigatório, fica na auditoria)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: reembolso solicitado em 7 dias (CDC) — cancelar assinatura e rebaixar para básico."
                rows={2}
              />
            </div>

            <GuidedCancellationPanel
              professionalId={professional.id}
              subscriptionId={selectedSub}
              reason={reason}
              onDone={(u) => { onUpdated?.(u); void inspect(); }}
            />

            {/* Actions */}
            <div className="grid gap-2">
              <Button
                variant="outline"
                disabled={!!acting || activeCount === 0}
                onClick={() => run("cancel_at_period_end", "Cancelamento agendado")}
              >
                {acting === "cancel_at_period_end" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cancelar ao fim do período (mantém acesso até a data)
              </Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={!!acting || activeCount === 0}
                onClick={() => run("cancel_now", "Assinatura cancelada")}
              >
                {acting === "cancel_now" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cancelar agora {activeCount > 1 ? "(somente a selecionada)" : "e encerrar acesso"}
              </Button>
              <Button
                variant="destructive"
                disabled={!!acting}
                onClick={() => run("downgrade_basic", "Conta rebaixada para básica")}
              >
                {acting === "downgrade_basic" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Rebaixar para Básico (apenas no app, não mexe no Stripe)
              </Button>
              <Button
                variant="secondary"
                disabled={!!acting}
                onClick={() => run("reactivate_access", "Acesso PRO reativado")}
              >
                {acting === "reactivate_access" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reativar acesso PRO (correção manual)
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Reembolso é feito no Stripe e <strong>não</strong> rebaixa a conta sozinho — isso protege casos de cobrança
              duplicada. Para encerrar de fato o acesso, use “Cancelar agora” e, se necessário, “Rebaixar para Básico”.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionAdminDialog;
