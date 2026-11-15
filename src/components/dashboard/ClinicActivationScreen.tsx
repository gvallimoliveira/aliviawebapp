import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { startClinicCheckout, type ClinicPlan, type ClinicTier } from "@/lib/clinicCheckout";
import { useToast } from "@/hooks/use-toast";
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from "@/constants/clinicPricing";
import { activateClinicTrial, normalizeAndValidateCnpj, INVALID_CNPJ_MESSAGE } from "@/lib/clinicTrialEntry";

const TIERS = [
  { id: "small" as ClinicTier, name: "Essencial", members: "Até 3 clínicos + 1 secretária", data: CLINIC_SMALL },
  { id: "medium" as ClinicTier, name: "Profissional", members: "Até 8 clínicos + 1 secretária", data: CLINIC_MEDIUM },
  { id: "large" as ClinicTier, name: "Enterprise", members: "Equipe ilimitada", data: CLINIC_LARGE },
];

/** Shown to signed-in clinic sign-ups who have no clinic yet (checkout paused/cancelled). */
const ClinicActivationScreen = ({ initialTier, initialPlan, initialTrialOpen }: { initialTier?: ClinicTier; initialPlan?: ClinicPlan; initialTrialOpen?: boolean }) => {
  const [plan, setPlan] = useState<ClinicPlan>(initialPlan ?? "annual");
  const [loading, setLoading] = useState<ClinicTier | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [trialOpen, setTrialOpen] = useState(!!initialTrialOpen);
  const [phone, setPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [trialLoading, setTrialLoading] = useState(false);

  const startTrial = async () => {
    const digits = normalizeAndValidateCnpj(cnpj);
    if (!phone.trim()) { toast({ title: "Informe seu WhatsApp", variant: "destructive" }); return; }
    if (!digits) { toast({ title: INVALID_CNPJ_MESSAGE, variant: "destructive" }); return; }
    setTrialLoading(true);
    try {
      const data = await activateClinicTrial({ tier: initialTier ?? "medium", plan, email: user?.email ?? "", phone: phone.trim(), cnpj: digits });
      if (data.requires_login || data.requires_signup || !data.clinic_id) throw new Error("Entre novamente na sua conta e tente de novo.");
      try { sessionStorage.removeItem("clinicActivationSkipped"); } catch {}
      window.location.replace("/dashboard?tab=clinic");
    } catch (e: any) {
      let msg = e?.message || "Tente novamente.";
      try { const body = await e?.context?.json?.(); if (body?.message) msg = body.message; } catch {}
      toast({ title: "Não foi possível ativar o teste", description: msg, variant: "destructive" });
      setTrialLoading(false);
    }
  };

  const skip = () => {
    try { sessionStorage.setItem("clinicActivationSkipped", "1"); } catch {}
    window.location.replace("/dashboard?context=personal");
  };

  const subscribe = async (tier: ClinicTier) => {
    setLoading(tier);
    const ok = await startClinicCheckout({ tier, plan });
    if (!ok) {
      setLoading(null);
      toast({ title: "Não foi possível abrir o pagamento", description: "Tente novamente em instantes.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao Aliv.iA Clínica!</h1>
          <p className="text-muted-foreground">
            Sua conta foi criada. Falta só ativar sua clínica para liberar agenda, prontuários e convidar a equipe.
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {(["monthly", "annual"] as ClinicPlan[]).map((p) => (
            <Button key={p} type="button" variant={plan === p ? "default" : "outline"} onClick={() => setPlan(p)} className="rounded-xl">
              {p === "monthly" ? "Mensal" : "Anual"}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card key={t.id} className={`rounded-2xl ${t.id === (initialTier ?? "medium") ? "border-primary" : ""}`}>
              <CardContent className="space-y-3 p-5">
                <div className="font-semibold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.members}</div>
                <div className="text-2xl font-bold text-foreground">
                  R$ {plan === "annual" ? t.data.annual.price : t.data.monthly.price}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                </div>
                <Button type="button" className="w-full rounded-xl gap-2" disabled={!!loading} onClick={() => void subscribe(t.id)}>
                  {loading === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Concluir assinatura
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Prefere testar antes?</p>
          {trialOpen ? (
            <div className="mx-auto max-w-sm space-y-2 text-left">
              <Input value={user?.email ?? ""} disabled />
              <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              <Input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} inputMode="numeric" />
              <Button type="button" className="w-full rounded-xl gap-2" disabled={trialLoading} onClick={() => void startTrial()}>
                {trialLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ativar 15 dias grátis
              </Button>
              <p className="text-center text-xs text-muted-foreground">Sem cartão de crédito. Sem assinatura em até 7 dias após o fim do teste, os dados da clínica são excluídos.</p>
            </div>
          ) : (
            <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={() => setTrialOpen(true)}>
              <Sparkles className="h-4 w-4" /> Começar 15 dias grátis
            </Button>
          )}
          <div>
            <Button type="button" variant="link" className="text-muted-foreground" onClick={skip}>Fazer isso depois e ir para o painel</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicActivationScreen;
