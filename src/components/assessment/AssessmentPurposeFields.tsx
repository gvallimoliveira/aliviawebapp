import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { isPreventiveAssessment, type PurposeData } from "@/lib/assessmentPurpose";

export const purposeCopy = {
  pt: { title: "Motivo da avaliação", pain: "Tenho dor ou sintomas", prevention: "Não sinto dor — busco prevenção ou acompanhamento", goals: "Objetivos do acompanhamento", details: "O que você gostaria de acompanhar ou melhorar?", map: "Histórico de lesão / regiões de atenção (opcional)", mapHint: "Marque, se desejar, regiões com lesões anteriores ou que deseja acompanhar. Elas não serão registradas como regiões dolorosas.", activity: "Nível de atividade física", saved: "Avaliação preventiva — sem dor atual" },
  en: { title: "Reason for assessment", pain: "I have pain or symptoms", prevention: "I have no pain — I seek prevention or follow-up", goals: "Follow-up goals", details: "What would you like to monitor or improve?", map: "Injury history / areas of attention (optional)", mapHint: "Optionally mark previous injury sites or areas to monitor. They will not be recorded as painful regions.", activity: "Physical activity level", saved: "Preventive assessment — no current pain" },
  es: { title: "Motivo de la evaluación", pain: "Tengo dolor o síntomas", prevention: "No siento dolor — busco prevención o seguimiento", goals: "Objetivos del seguimiento", details: "¿Qué te gustaría acompañar o mejorar?", map: "Lesiones previas / regiones de atención (opcional)", mapHint: "Marca, si deseas, regiones con lesiones previas o para seguimiento. No se registrarán como regiones dolorosas.", activity: "Nivel de actividad física", saved: "Evaluación preventiva — sin dolor actual" },
};

const goals = [
  { id: "prevention", pt: "Prevenção de lesões", en: "Injury prevention", es: "Prevención de lesiones" },
  { id: "posture", pt: "Postura", en: "Posture", es: "Postura" },
  { id: "health", pt: "Acompanhamento da saúde", en: "Health follow-up", es: "Seguimiento de la salud" },
  { id: "sport", pt: "Esporte / desempenho", en: "Sport / performance", es: "Deporte / rendimiento" },
  { id: "mobility", pt: "Mobilidade e flexibilidade", en: "Mobility and flexibility", es: "Movilidad y flexibilidad" },
  { id: "other", pt: "Outro objetivo", en: "Other goal", es: "Otro objetivo" },
];

export function preventionGoalLabels(ids: string[] = [], language: "pt" | "en" | "es" = "pt"): string {
  return ids.map(id => goals.find(g => g.id === id)?.[language] || id).join(", ");
}

export default function AssessmentPurposeFields({ value, onChange, disabled = false }: {
  value: PurposeData; onChange: (patch: PurposeData) => void; disabled?: boolean;
}) {
  const { language } = useLanguage();
  const copy = purposeCopy[language];
  const preventive = isPreventiveAssessment(value);
  return <div className="space-y-3">
    <Label>{copy.title}</Label>
    <div className="grid gap-2">
      <Button type="button" variant={!preventive ? "default" : "outline"} disabled={disabled} aria-pressed={!preventive} className="h-auto min-h-10 whitespace-normal text-left justify-start" onClick={() => onChange({ assessmentPurpose: "symptomatic" })}>{copy.pain}</Button>
      <Button type="button" variant={preventive ? "default" : "outline"} disabled={disabled} aria-pressed={preventive} className="h-auto min-h-10 whitespace-normal text-left justify-start" onClick={() => onChange({ assessmentPurpose: "prevention" })}>{copy.prevention}</Button>
    </div>
    {preventive && <>
      <Label>{copy.goals}</Label>
      <div className="flex flex-wrap gap-2">{goals.map(g => <Button key={g.id} type="button" size="sm" disabled={disabled} variant={value.preventionGoals?.includes(g.id) ? "default" : "outline"} aria-pressed={value.preventionGoals?.includes(g.id) ?? false} className="h-auto min-h-9 whitespace-normal" onClick={() => onChange({ preventionGoals: value.preventionGoals?.includes(g.id) ? value.preventionGoals.filter(id => id !== g.id) : [...(value.preventionGoals || []), g.id] })}>{g[language]}</Button>)}</div>
      <Label htmlFor="prevention-goal-details">{copy.details}</Label>
      <Textarea id="prevention-goal-details" disabled={disabled} value={value.preventionGoalDetails || ""} maxLength={2000} rows={3} onChange={e => onChange({ preventionGoalDetails: e.target.value })} />
    </>}
  </div>;
}