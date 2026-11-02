import { useLanguage } from "@/contexts/LanguageContext";

type Plan = "pro" | "academic" | "clinic";

// Monthly AI allowance shown on landings. Values mirror get_included_credits_for_tier (monthly base).
const ALLOWANCE: Record<Plan, string> = { pro: "30", academic: "20", clinic: "80 · 150 · 250" };
const ANNUAL_ALLOWANCE: Record<Plan, string> = { pro: "33", academic: "22", clinic: ALLOWANCE.clinic };

const COPY = {
  pt: {
    title: "Créditos de IA inclusos no plano",
    allowance: (p: Plan, annual: boolean) => p === "clinic" ? `Créditos de IA por mês, compartilhados pela equipe: Essencial (Small) 80 · Profissional (Medium) 150 · Enterprise (Large) 250.` : `${annual ? ANNUAL_ALLOWANCE[p] : ALLOWANCE[p]} créditos de IA por mês no plano ${annual ? "anual" : "mensal"}.`,
    fits: (p: Plan) => p === "academic" ? "Cabe cerca de 30 avaliações completas com IA ou 400 perguntas ao assistente clínico." : p === "clinic" ? "No plano Small, cerca de 130 avaliações completas com IA por mês para a equipe." : "Cabe cerca de 50 avaliações completas com IA, ou 30 avaliações e mais de 200 perguntas ao assistente clínico.",
    free: "Prontuário, agenda, exercícios do catálogo, controle de carga e relatórios em PDF não consomem créditos.",
    packs: "Se precisar de mais, você escolhe um pacote avulso. Nunca há cobrança automática.",
    estimate: "Exemplos estimados e alternativos, não cumulativos. O consumo varia conforme os recursos de IA utilizados.",
  },
  en: {
    title: "AI credits included in the plan",
    allowance: (p: Plan, annual: boolean) => p === "clinic" ? "Monthly AI credits shared by the team: Essential (Small) 80 · Professional (Medium) 150 · Enterprise (Large) 250." : `${annual ? ANNUAL_ALLOWANCE[p] : ALLOWANCE[p]} AI credits per month on the ${annual ? "annual" : "monthly"} plan.`,
    fits: (p: Plan) => p === "academic" ? "Fits about 30 full AI assessments or 400 clinical assistant questions." : p === "clinic" ? "On Small, about 130 full AI assessments per month for the team." : "Fits about 50 full AI assessments, or 30 assessments plus 200+ clinical assistant questions.",
    free: "Records, schedule, catalog exercises, load monitoring and PDF reports never use credits.",
    packs: "Need more? Pick a one-off pack. There is never an automatic charge.",
    estimate: "Estimated alternative examples, not cumulative. Consumption varies with the AI tools used.",
  },
  es: {
    title: "Créditos de IA incluidos en el plan",
    allowance: (p: Plan, annual: boolean) => p === "clinic" ? "Créditos de IA mensuales compartidos por el equipo: Esencial (Small) 80 · Profesional (Medium) 150 · Enterprise (Large) 250." : `${annual ? ANNUAL_ALLOWANCE[p] : ALLOWANCE[p]} créditos de IA por mes en el plan ${annual ? "anual" : "mensual"}.`,
    fits: (p: Plan) => p === "academic" ? "Alcanza para unas 30 evaluaciones completas con IA o 400 preguntas al asistente clínico." : p === "clinic" ? "En Small, unas 130 evaluaciones completas con IA por mes para el equipo." : "Alcanza para unas 50 evaluaciones completas con IA, o 30 evaluaciones y más de 200 preguntas al asistente clínico.",
    free: "Historia clínica, agenda, ejercicios del catálogo, control de carga e informes PDF no consumen créditos.",
    packs: "Si necesitas más, eliges un paquete adicional. Nunca hay cobro automático.",
    estimate: "Ejemplos estimados y alternativos, no acumulativos. El consumo varía según las herramientas de IA utilizadas.",
  },
};

export default function CreditsSufficiency({ plan, annual = false, className = "" }: { plan: Plan; annual?: boolean; className?: string }) {
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY)] ?? COPY.pt;
  return (
    <div className={`max-w-2xl mx-auto border-y border-border py-5 text-left ${className}`} data-credits-sufficiency>
      <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
      <p className="mt-2 text-sm font-medium text-primary leading-relaxed">{c.allowance(plan, annual)}</p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
        <li>{c.fits(plan)}</li>
        <li>{c.free}</li>
        <li>{c.packs}</li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{c.estimate}</p>
    </div>
  );
}
