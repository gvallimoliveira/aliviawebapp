import { useState } from "react";
import { Building2, CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { startClinicCheckout, type ClinicPlan, type ClinicTier } from "@/lib/clinicCheckout";
import { useToast } from "@/hooks/use-toast";
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from "@/constants/clinicPricing";

const TIERS = [
  { id: "small" as ClinicTier, name: "Essencial", members: "Até 3 clínicos + 1 secretária", data: CLINIC_SMALL },
  { id: "medium" as ClinicTier, name: "Profissional", members: "Até 8 clínicos + 1 secretária", data: CLINIC_MEDIUM },
  { id: "large" as ClinicTier, name: "Enterprise", members: "Equipe ilimitada", data: CLINIC_LARGE },
];

/** Shown to signed-in clinic sign-ups who have no clinic yet (checkout paused/cancelled). */
const ClinicActivationScreen = ({ initialTier, initialPlan }: { initialTier?: ClinicTier; initialPlan?: ClinicPlan }) => {
  const [plan, setPlan] = useState<ClinicPlan>(initialPlan ?? "annual");
  const [loading, setLoading] = useState<ClinicTier | null>(null);
  const { toast } = useToast();

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

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Prefere testar antes?</p>
          <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={() => (window.location.href = "/clinica#pricing")}>
            <Sparkles className="h-4 w-4" /> Começar 15 dias grátis
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClinicActivationScreen;
