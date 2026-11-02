import { useLanguage } from "@/contexts/LanguageContext";

type Plan = "pro" | "academic" | "clinic";

// Monthly AI allowance shown on landings. Values mirror get_included_credits_for_tier (monthly base).
const ALLOWANCE: Record<Plan, string> = { pro: "30", academic: "20", clinic: "80 · 150 · 250" };

const COPY = {
  pt: {
    title: "IA inclusa no plano",
    allowance: (p: Plan) => p === "clinic" ? `Créditos de IA por mês, compartilhados pela equipe (Small · Medium · Large): ${ALLOWANCE[p]}` : `Créditos de IA por mês: ${ALLOWANCE[p]}`,
    fits: (p: Plan) => p === "academic" ? "Cabe cerca de 30 avaliações completas com IA ou 400 perguntas ao assistente clínico." : p === "clinic" ? "No plano Small, cerca de 130 avaliações completas com IA por mês para a equipe." : "Cabe cerca de 50 avaliações completas com IA, ou 30 avaliações e mais de 200 perguntas ao assistente clínico.",
    free: "Prontuário, agenda, exercícios do catálogo, controle de carga e relatórios em PDF não consomem créditos.",
    packs: "Se precisar de mais, você escolhe um pacote avulso. Nunca há cobrança automática.",
  },
  en: {
    title: "AI included in the plan",
    allowance: (p: Plan) => p === "clinic" ? `AI credits per month, shared by the team (Small · Medium · Large): ${ALLOWANCE[p]}` : `AI credits per month: ${ALLOWANCE[p]}`,
    fits: (p: Plan) => p === "academic" ? "Fits about 30 full AI assessments or 400 clinical assistant questions." : p === "clinic" ? "On Small, about 130 full AI assessments per month for the team." : "Fits about 50 full AI assessments, or 30 assessments plus 200+ clinical assistant questions.",
    free: "Records, schedule, catalog exercises, load monitoring and PDF reports never use credits.",
    packs: "Need more? Pick a one-off pack. There is never an automatic charge.",
  },
  es: {
    title: "IA incluida en el plan",
    allowance: (p: Plan) => p === "clinic" ? `Créditos de IA por mes, compartidos por el equipo (Small · Medium · Large): ${ALLOWANCE[p]}` : `Créditos de IA por mes: ${ALLOWANCE[p]}`,
    fits: (p: Plan) => p === "academic" ? "Alcanza para unas 30 evaluaciones completas con IA o 400 preguntas al asistente clínico." : p === "clinic" ? "En Small, unas 130 evaluaciones completas con IA por mes para el equipo." : "Alcanza para unas 50 evaluaciones completas con IA, o 30 evaluaciones y más de 200 preguntas al asistente clínico.",
    free: "Historia clínica, agenda, ejercicios del catálogo, control de carga e informes PDF no consumen créditos.",
    packs: "Si necesitas más, eliges un paquete adicional. Nunca hay cobro automático.",
  },
};

export default function CreditsSufficiency({ plan, className = "" }: { plan: Plan; className?: string }) {
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY)] ?? COPY.pt;
  return (
    <div className={`max-w-2xl mx-auto rounded-xl border border-border bg-muted/30 p-4 text-left ${className}`} data-credits-sufficiency>
      <p className="text-sm font-semibold text-foreground">{c.title}</p>
      <p className="mt-1 text-xs text-foreground">{c.allowance(plan)}</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground leading-relaxed list-disc pl-4">
        <li>{c.fits(plan)}</li>
        <li>{c.free}</li>
        <li>{c.packs}</li>
      </ul>
    </div>
  );
}
