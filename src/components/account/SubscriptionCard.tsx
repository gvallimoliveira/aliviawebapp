import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Loader2, ExternalLink, CalendarClock, ArrowUpCircle, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Sub = {
  id: string;
  status: string;
  label: string;
  kind: string;
  interval: string | null;
  can_switch_to_annual: boolean;
  amount: number | null;
  currency: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

const money = (cents: number | null, currency: string) =>
  cents == null ? "—" : `${(currency || "brl").toUpperCase()} ${(cents / 100).toFixed(2)}`;

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const statusLabel = (s: Sub) => {
  if (s.cancel_at_period_end) return { text: "Cancelamento agendado", variant: "destructive" as const };
  if (s.status === "active" || s.status === "trialing") return { text: "Ativa", variant: "default" as const };
  if (s.status === "past_due" || s.status === "unpaid") return { text: "Pagamento pendente", variant: "destructive" as const };
  return { text: s.status, variant: "secondary" as const };
};

/** Conta VIP usada para revisar layout/fluxo sem ter assinatura real. */
const DEMO_EMAIL = "gvallim.fisio@gmail.com";

const makeDemoSub = (): Sub => {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return {
    id: "sub_demo_vip",
    status: "active",
    label: "Profissional PRO — Mensal",
    kind: "pro",
    interval: "month",
    can_switch_to_annual: true,
    amount: 8990,
    currency: "brl",
    cancel_at_period_end: false,
    current_period_end: end.toISOString(),
  };
};

const SubscriptionCard = () => {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ action: "cancel_at_period_end" | "switch_to_annual"; sub: Sub } | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    let isDemoAccount = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      isDemoAccount = user?.email?.trim().toLowerCase() === DEMO_EMAIL;

      const { data, error } = await supabase.functions.invoke("manage-my-subscription", {
        body: { action: "inspect" },
      });
      if (error) throw error;
      const real = ((data as any)?.subscriptions || []) as Sub[];
      if (real.length === 0 && isDemoAccount) {
        setDemo(true);
        setSubs([makeDemoSub()]);
      } else {
        setDemo(false);
        setSubs(real);
      }
    } catch (e) {
      console.error("subscription inspect failed", e);
      // Conta VIP de simulação continua exibindo o card completo mesmo se a
      // consulta ao Stripe falhar (sem customer/assinatura real).
      if (isDemoAccount) {
        setDemo(true);
        setSubs([makeDemoSub()]);
      } else {
        setSubs([]);
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    void load();
  }, []);


  const run = async (action: string, sub: Sub, withReason?: string) => {
    setActing(`${action}:${sub.id}`);
    try {
      if (demo) {
        // Simulação: nada é enviado ao Stripe, só o estado local muda.
        await new Promise((r) => setTimeout(r, 600));
        setSubs((prev) =>
          (prev || []).map((s) =>
            s.id !== sub.id
              ? s
              : action === "cancel_at_period_end"
                ? { ...s, cancel_at_period_end: true }
                : action === "resume"
                  ? { ...s, cancel_at_period_end: false }
                  : {
                      ...s,
                      label: "Profissional PRO — Anual",
                      interval: "year",
                      amount: 89900,
                      can_switch_to_annual: false,
                    },

          ),
        );
        toast({
          title: "Simulação concluída",
          description: "Nenhuma cobrança ou alteração real foi feita — este é o modo de teste da conta VIP.",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("manage-my-subscription", {
        body: { action, subscription_id: sub.id, reason: withReason || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title:
          action === "cancel_at_period_end"
            ? "Cancelamento agendado"
            : action === "resume"
              ? "Assinatura reativada"
              : "Plano alterado para anual",
        description: "Você receberá a confirmação por e-mail. Nada muda no seu acesso já pago.",
      });
      await load();
    } catch (e: any) {
      toast({ title: "Não foi possível concluir", description: e.message, variant: "destructive" });
    } finally {
      setActing(null);
      setConfirm(null);
      setReason("");
    }
  };

  const openPortal = async () => {
    if (demo) {
      toast({
        title: "Simulação",
        description: "Aqui o usuário real abriria o portal de pagamento e faturas.",
      });
      return;
    }
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal de pagamento.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <CreditCard className="h-4 w-4" />
          Minha assinatura
          {demo && <Badge variant="secondary" className="text-[10px]">Modo simulação</Badge>}
        </CardTitle>
        <CardDescription>
          Veja o plano, a próxima cobrança e cancele ou mude de plano quando quiser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {demo && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            Conta VIP: esta é uma assinatura mensal fictícia (R$ 0,00, renovação automática) só para você conferir
            layout e fluxo. Cancelar, reativar ou mudar para anual aqui <strong>não</strong> altera nada no Stripe.
          </div>
        )}

        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !subs || subs.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-sm text-foreground font-medium">Nenhuma assinatura ativa vinculada a este e-mail.</p>
            <p className="text-xs text-muted-foreground">
              Se você tem acesso de cortesia (parceiro, acadêmico ou plano concedido), não há cobrança recorrente para
              gerenciar aqui.
            </p>
          </div>
        ) : (
          subs.map((s) => {
            const st = statusLabel(s);
            return (
              <div key={s.id} className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(s.amount, s.currency)} · {s.interval === "year" ? "anual" : "mensal"}
                    </p>
                  </div>
                  <Badge variant={st.variant} className="shrink-0">{st.text}</Badge>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {s.cancel_at_period_end
                    ? `Acesso garantido até ${fmt(s.current_period_end)} — depois não haverá nova cobrança.`
                    : `Próxima cobrança em ${fmt(s.current_period_end)}.`}
                </p>

                <div className="grid gap-2">
                  {s.cancel_at_period_end ? (
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={!!acting}
                      onClick={() => run("resume", s)}
                    >
                      {acting === `resume:${s.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Reativar minha assinatura
                    </Button>
                  ) : (
                    <>
                      {s.can_switch_to_annual && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                          disabled={!!acting}
                          onClick={() => setConfirm({ action: "switch_to_annual", sub: s })}
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                          Mudar para o plano anual (economia)
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={!!acting}
                        onClick={() => setConfirm({ action: "cancel_at_period_end", sub: s })}
                      >
                        Cancelar assinatura
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="gap-2" disabled={portalLoading} onClick={openPortal}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Gerenciar pagamento e faturas
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          O cancelamento é sempre agendado para o fim do período já pago — você mantém o acesso até a data indicada e
          pode reativar antes disso sem perder nada.
        </p>
      </CardContent>

      <AlertDialog open={!!confirm} onOpenChange={(v) => { if (!v) { setConfirm(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "cancel_at_period_end" ? "Cancelar sua assinatura?" : "Mudar para o plano anual?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "cancel_at_period_end"
                ? `Seu acesso continua até ${fmt(confirm?.sub.current_period_end)} e nenhuma nova cobrança será feita. Você pode reativar antes dessa data.`
                : "A troca é feita agora, com ajuste proporcional do valor já pago no plano mensal. A próxima renovação passa a ser anual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.action === "cancel_at_period_end" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Quer nos contar o motivo? (opcional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: vou pausar os atendimentos por alguns meses."
                rows={2}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirm) void run(confirm.action, confirm.sub, reason);
              }}
            >
              {confirm?.action === "cancel_at_period_end" ? "Confirmar cancelamento" : "Confirmar mudança"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SubscriptionCard;
