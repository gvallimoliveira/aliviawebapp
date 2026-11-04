import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Info, Sparkles, ChevronDown, Building2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PatientCareProvider } from "@/hooks/usePatientCare";

const COPY = {
  pt: {
    official: "Nova avaliação para minha equipe",
    choose: "Para quem enviar a avaliação?",
    pillTitle: "Autoavaliação Aliv.iA independente",
    pillLead: "Reavaliações do seu tratamento atual devem ser feitas pelo botão de nova avaliação para sua equipe, que envia as respostas direto para quem cuida de você.",
    pillBody: "Se quiser avaliar outra queixa por conta própria, a autoavaliação do Aliv.iA gera um relatório e uma proposta de tratamento sobre o seu quadro.",
    pillWarn: "Ela não é vinculada ao seu fisioterapeuta ou clínica e eles não recebem acesso automático a ela.",
    basic: "Autoavaliação básica",
    premium: "Autoavaliação premium",
  },
  en: {
    official: "New assessment for my care team",
    choose: "Who should receive the assessment?",
    pillTitle: "Independent Aliv.iA self-assessment",
    pillLead: "Reassessments for your current treatment should use the new assessment button for your care team, which sends answers straight to them.",
    pillBody: "To assess another complaint on your own, the Aliv.iA self-assessment provides a report and a treatment proposal for your condition.",
    pillWarn: "It is not linked to your physiotherapist or clinic, and they do not get automatic access to it.",
    basic: "Basic self-assessment",
    premium: "Premium self-assessment",
  },
  es: {
    official: "Nueva evaluación para mi equipo",
    choose: "¿A quién enviar la evaluación?",
    pillTitle: "Autoevaluación Aliv.iA independiente",
    pillLead: "Las reevaluaciones de tu tratamiento actual deben hacerse con el botón de nueva evaluación para tu equipo, que envía las respuestas directamente.",
    pillBody: "Si quieres evaluar otra molestia por tu cuenta, la autoevaluación de Aliv.iA genera un informe y una propuesta de tratamiento sobre tu cuadro.",
    pillWarn: "No queda vinculada a tu fisioterapeuta o clínica y no reciben acceso automático a ella.",
    basic: "Autoevaluación básica",
    premium: "Autoevaluación premium",
  },
} as const;

const pathFor = (p: PatientCareProvider) =>
  p.kind === "clinic" ? `/assessment/clinic/${p.provider_id}` : `/assessment/professional/${p.provider_id}`;

/** Quick access to the official assessment link of the linked clinic/professional. */
export const OfficialAssessmentButton = ({ providers }: { providers: PatientCareProvider[] }) => {
  const { language } = useLanguage();
  const c = COPY[language] ?? COPY.pt;
  const navigate = useNavigate();
  if (!providers.length) return null;
  const label = <><ClipboardList className="h-4 w-4" />{c.official}</>;
  if (providers.length === 1) {
    return <Button type="button" size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => navigate(pathFor(providers[0]))}>{label}</Button>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-2 w-full sm:w-auto">{label}<ChevronDown className="h-3 w-3" /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-2 py-1 text-xs text-muted-foreground">{c.choose}</p>
        {providers.map((p) => (
          <button key={`${p.kind}:${p.provider_id}`} type="button" onClick={() => navigate(pathFor(p))}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
            {p.kind === "clinic" ? <Building2 className="h-4 w-4 text-primary" /> : <Stethoscope className="h-4 w-4 text-primary" />}
            <span className="min-w-0 truncate">{p.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

/** Discreet, explicit pill for independent (unlinked) Aliv.iA self-assessment. */
export const IndependentSelfAssessmentPill = () => {
  const { language } = useLanguage();
  const c = COPY[language] ?? COPY.pt;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-muted/30">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1">{c.pillTitle}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 text-sm text-muted-foreground">
          <p>{c.pillLead}</p>
          <p>{c.pillBody}</p>
          <p className="font-medium text-foreground">{c.pillWarn}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => navigate("/assessment/basic")}><ClipboardList className="h-4 w-4" />{c.basic}</Button>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => navigate("/assessment/premium")}><Sparkles className="h-4 w-4" />{c.premium}</Button>
          </div>
        </div>
      )}
    </div>
  );
};
