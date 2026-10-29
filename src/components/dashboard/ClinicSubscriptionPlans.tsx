import { useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from "@/constants/clinicPricing";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "sonner";

const plans = [
  { key: "small", name: "Essencial", desc: "Para consultórios pequenos", members: "Até 3 clínicos + 1 secretária", data: CLINIC_SMALL },
  { key: "medium", name: "Profissional", desc: "Para clínicas em crescimento", members: "Até 8 clínicos + 1 secretária", data: CLINIC_MEDIUM },
  { key: "large", name: "Enterprise", desc: "Para grandes clínicas", members: "Equipe ilimitada", data: CLINIC_LARGE },
] as const;

export default function ClinicSubscriptionPlans() {
  const { activeClinic, isClinicOwner, refetch } = useClinic();
  const [billing, setBilling] = useState("annual");
  const [pending, setPending] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (!activeClinic || !isClinicOwner) return null;

  const subscribe = async (tier: string) => {
    if (pending) return;
    setPending(tier);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-clinic-subscription", {
        body: { tier, plan: billing, clinic_id: activeClinic.clinic_id, clinic_name: activeClinic.clinic_name, source: "dashboard" },
      });
      if (error) throw new Error("Não foi possível abrir o pagamento. Tente novamente.");
      if (data?.error) throw new Error(data.error);
      if (data?.already_active) {
        await refetch();
        toast.success("Sua assinatura já está ativa.");
        return;
      }
      if (!data?.url) throw new Error("O pagamento não foi aberto. Tente novamente.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Link de pagamento inválido.");
      window.location.assign(url.href);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section id="clinic-subscription-plans" aria-label="Planos de assinatura da clínica" className="space-y-5 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ToggleGroup type="single" value={billing} onValueChange={(value) => { if (value) setBilling(value); }} disabled={pending !== null} variant="outline" aria-label="Período de cobrança">
          <ToggleGroupItem value="monthly">Mensal</ToggleGroupItem>
          <ToggleGroupItem value="annual">Anual</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const price = billing === "annual" ? plan.data.annual : plan.data.monthly;
          const saving = Math.round((1 - plan.data.annual.total / (plan.data.monthly.price * 12)) * 100);
          return (
            <article key={plan.key} className={`flex flex-col rounded-lg border p-5 bg-background ${plan.key === "medium" ? "border-primary" : "border-border"}`}>
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground min-h-10">{plan.desc}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">R$ {price.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <p className="text-xs text-muted-foreground mt-1 min-h-5">{billing === "annual" ? `R$ ${plan.data.annual.total.toLocaleString("pt-BR")}/ano, cobrados de uma vez` : "Cobrança mensal"}</p>
              {billing === "annual" && <Badge variant="secondary" className="w-fit mt-2">Economize {saving}% no anual</Badge>}
              <Badge variant="outline" className="w-fit my-4 whitespace-normal">{plan.members}</Badge>
              <ul className="space-y-2 flex-1 mb-5">
                {["Pré-avaliações por link", "Importação de agenda por foto", "Chat + videochamada", "Relatórios com IA", "NPS e analytics", "White-label completo"].map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-foreground"><Check className="w-4 h-4 shrink-0 text-primary mt-0.5" />{feature}</li>
                ))}
              </ul>
              <Button onClick={() => subscribe(plan.key)} disabled={pending !== null} className="w-full gap-2" variant={plan.key === "medium" ? "default" : "outline"}>
                {pending === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {pending === plan.key ? "Abrindo pagamento…" : `Assinar ${plan.name}`}
              </Button>
            </article>
          );
        })}
      </div>
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <p className="text-xs text-muted-foreground text-center">Pagamento seguro pelo Stripe. Sua clínica, equipe e prontuários são preservados.</p>
    </section>
  );
}