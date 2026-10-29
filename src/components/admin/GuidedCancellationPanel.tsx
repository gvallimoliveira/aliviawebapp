import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props { professionalId: string; subscriptionId: string | null; reason: string; onDone: (updates: Record<string, any>) => void }

const brl = (c: number, cur = "brl") => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: cur.toUpperCase() });
const date = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const META = {
  full: { label: "Reembolso total (arrependimento — até 7 dias)", action: "Reembolsar 100% e cancelar agora", variant: "destructive" as const },
  annual_partial: { label: "Reembolso parcial do plano anual", action: "Reembolsar saldo e cancelar agora", variant: "default" as const },
  monthly_period_end: { label: "Plano mensal — cancelar ao fim do período", action: "Cancelar renovação (acesso até o fim do período)", variant: "secondary" as const },
};

const GuidedCancellationPanel = ({ professionalId, subscriptionId, reason, onDone }: Props) => {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const call = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-subscription", {
      body: { action, professional_id: professionalId, subscription_id: subscriptionId || undefined, reason: reason || undefined, ...extra },
    });
    if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
    if (error) throw new Error(error.message);
    return data as any;
  };

  const diagnose = async () => {
    setLoading(true);
    try { setD((await call("guided_diagnose")).diagnosis); }
    catch (e: any) { setD(null); toast({ title: "Diagnóstico indisponível", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (subscriptionId) void diagnose(); /* eslint-disable-next-line */ }, [subscriptionId]);

  const execute = async () => {
    setConfirm(false);
    if (!reason.trim()) { toast({ title: "Informe o motivo", variant: "destructive" }); return; }
    setActing(true);
    try {
      const r = await call("guided_execute", { expected_kind: d.kind, expected_refund_cents: d.refundCents });
      toast({ title: "Cancelamento concluído", description: d.refundCents > 0 ? `Reembolso de ${brl(d.refundCents, d.currency)} enviado ao Stripe.` : "Renovação cancelada." });
      onDone(r.updates || {});
      await diagnose();
    } catch (e: any) { toast({ title: "Falha", description: e.message, variant: "destructive" }); }
    finally { setActing(false); }
  };

  if (!subscriptionId) return null;
  const m = d ? META[d.kind as keyof typeof META] : null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Cancelamento guiado</p>
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : d && m ? (
        <>
          <Badge variant={m.variant}>{m.label}</Badge>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Plano {d.interval === "year" ? "anual" : "mensal"} · pago em {date(d.started_at)} ({d.daysSinceStart} dias) · valor pago {brl(d.paid_cents, d.currency)}</p>
            {d.kind === "full" && <p>Dentro do prazo de arrependimento (CDC art. 49, 7 dias corridos): devolução integral e acesso encerrado.</p>}
            {d.kind === "annual_partial" && (d.needsMonthlyPrice
              ? <p className="text-destructive">Preço mensal equivalente não encontrado no Stripe — cálculo bloqueado.</p>
              : <>
                <p>Meses utilizados: {d.usedMonths} × {brl(d.monthly_price_cents, d.currency)} (mensal) = {brl(d.deductionCents, d.currency)}</p>
                <p className="font-semibold text-foreground">Saldo a reembolsar: {brl(d.refundCents, d.currency)}{d.refundCents === 0 ? " (sem saldo positivo)" : ""}</p>
              </>)}
            {d.kind === "monthly_period_end" && <p>Sem reembolso. Não renova; acesso mantido até {date(d.period_end)}.{d.cancel_at_period_end ? " (já agendado)" : ""}</p>}
          </div>
          <Button size="sm" variant={m.variant} disabled={acting || d.needsMonthlyPrice || (d.kind === "monthly_period_end" && d.cancel_at_period_end)} onClick={() => setConfirm(true)}>
            {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{m.action}
          </Button>
        </>
      ) : <Button size="sm" variant="outline" onClick={diagnose}>Diagnosticar</Button>}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {m?.label.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              {d?.refundCents > 0 ? `Será reembolsado ${brl(d.refundCents, d.currency)} no Stripe. ` : ""}
              {d?.kind === "monthly_period_end" ? "A assinatura não renovará." : "A assinatura será cancelada imediatamente."} Ação registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={execute}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuidedCancellationPanel;
