/**
 * Passo B1 do roteiro "Mecanismo de dor + mapa corporal".
 *
 * Triagem de mecanismo de dor (nociceptivo / neuropático / nociplástico) usada
 * apenas no fluxo manual PRO, atrás da flag `ENABLE_PAIN_MECHANISM`.
 * A classificação é 100% determinística (função pura `classifyMechanism`) —
 * nenhuma IA envolvida neste passo.
 */
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  classifyMechanism,
  getMechanismLabel,
  getMechanismTechnical,
  getMechanismTokenClass,
  NEUROPATHIC_DESCRIPTORS,
  NOCICEPTIVE_DESCRIPTORS,
  type MechanismDistribution,
  type MechanismResult,
  type TriState,
} from "@/lib/painMechanism";

export interface MechanismAnswers {
  descriptors: string[];
  distribution: MechanismDistribution;
  proportionateToStimulus: TriState;
  spontaneousPain: TriState;
  multisensoryHypersensitivity: TriState;
  nonRestorativeSleep: TriState;
  persistentFatigue: TriState;
  objectiveNeuroSigns: TriState;
  csiScore: number | null;
}

export const createEmptyMechanismAnswers = (): MechanismAnswers => ({
  descriptors: [],
  distribution: "unknown",
  proportionateToStimulus: null,
  spontaneousPain: null,
  multisensoryHypersensitivity: null,
  nonRestorativeSleep: null,
  persistentFatigue: null,
  objectiveNeuroSigns: null,
  csiScore: null,
});

export const sanitizeMechanismAnswers = (raw: unknown): MechanismAnswers => {
  const base = createEmptyMechanismAnswers();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const tri = (v: unknown): TriState => (v === true ? true : v === false ? false : null);
  return {
    descriptors: Array.isArray(o.descriptors) ? o.descriptors.map(String) : [],
    distribution: (
      ["localized", "dermatomal", "regional", "widespread", "multisite", "unknown"] as string[]
    ).includes(String(o.distribution))
      ? (o.distribution as MechanismDistribution)
      : "unknown",
    proportionateToStimulus: tri(o.proportionateToStimulus),
    spontaneousPain: tri(o.spontaneousPain),
    multisensoryHypersensitivity: tri(o.multisensoryHypersensitivity),
    nonRestorativeSleep: tri(o.nonRestorativeSleep),
    persistentFatigue: tri(o.persistentFatigue),
    objectiveNeuroSigns: tri(o.objectiveNeuroSigns),
    csiScore: typeof o.csiScore === "number" ? o.csiScore : null,
  };
};

/** true quando o profissional respondeu algo — evita gravar triagem vazia. */
export const hasMechanismAnswers = (a: MechanismAnswers): boolean =>
  a.descriptors.length > 0 ||
  a.distribution !== "unknown" ||
  a.csiScore !== null ||
  [
    a.proportionateToStimulus,
    a.spontaneousPain,
    a.multisensoryHypersensitivity,
    a.nonRestorativeSleep,
    a.persistentFatigue,
    a.objectiveNeuroSigns,
  ].some((v) => v !== null);

const DESCRIPTOR_COPY: Record<string, { pt: string; en: string }> = {
  aching: { pt: "Dói / dolorida", en: "Aching" },
  throbbing: { pt: "Pulsátil", en: "Throbbing" },
  sore: { pt: "Sensível ao toque", en: "Sore" },
  stiff: { pt: "Rigidez", en: "Stiffness" },
  mechanical: { pt: "Piora com carga/movimento", en: "Load/movement related" },
  local: { pt: "Bem localizada", en: "Well localized" },
  burning: { pt: "Queimação", en: "Burning" },
  electric: { pt: "Elétrica", en: "Electric" },
  shock: { pt: "Choque", en: "Shock" },
  tingling: { pt: "Formigamento", en: "Tingling" },
  numbness: { pt: "Adormecimento", en: "Numbness" },
  pins_needles: { pt: "Alfinetadas", en: "Pins and needles" },
  stabbing: { pt: "Facada", en: "Stabbing" },
};

const DISTRIBUTION_COPY: Record<MechanismDistribution, { pt: string; en: string }> = {
  unknown: { pt: "Não avaliada", en: "Not assessed" },
  localized: { pt: "Localizada (1 região)", en: "Localized (1 region)" },
  dermatomal: { pt: "Dermatomal / trajeto de nervo", en: "Dermatomal / nerve path" },
  regional: { pt: "Regional (2-4 regiões contíguas)", en: "Regional (2-4 contiguous)" },
  widespread: { pt: "Difusa (acima e abaixo da cintura)", en: "Widespread" },
  multisite: { pt: "Multissítio (≥ 5 regiões)", en: "Multisite (≥ 5 regions)" },
};

const QUESTIONS: {
  key: keyof MechanismAnswers;
  pt: string;
  en: string;
  hint?: { pt: string; en: string };
}[] = [
  {
    key: "proportionateToStimulus",
    pt: "A dor é proporcional ao estímulo (padrão mecânico claro: piora com carga, alivia com repouso)?",
    en: "Is pain proportionate to the stimulus (clear mechanical pattern)?",
  },
  {
    key: "objectiveNeuroSigns",
    pt: "Há sinais neurológicos objetivos (reflexo, força ou sensibilidade alterados)?",
    en: "Objective neurological signs (reflex, strength or sensation)?",
  },
  {
    key: "spontaneousPain",
    pt: "Há dor espontânea, sem gatilho identificável?",
    en: "Spontaneous pain with no identifiable trigger?",
  },
  {
    key: "multisensoryHypersensitivity",
    pt: "Há hipersensibilidade multissensorial (luz, som, cheiro, toque, frio)?",
    en: "Multisensory hypersensitivity (light, sound, smell, touch, cold)?",
  },
  {
    key: "nonRestorativeSleep",
    pt: "O sono é não restaurador (acorda cansado na maioria dos dias)?",
    en: "Non-restorative sleep (wakes up tired most days)?",
  },
  {
    key: "persistentFatigue",
    pt: "Há fadiga persistente associada ao quadro?",
    en: "Persistent fatigue associated with the condition?",
  },
];

interface Props {
  value: MechanismAnswers;
  onChange: (next: MechanismAnswers) => void;
  /** Regiões marcadas no mapa (para sugerir a distribuição). */
  regionCount?: number;
  /** Duração em semanas, quando conhecida. */
  durationWeeks?: number | null;
  /** Distribuição sugerida pelo mapa corporal (A2). */
  suggestedDistribution?: MechanismDistribution;
  isPt?: boolean;
  disabled?: boolean;
}

const PainMechanismScreening = ({
  value,
  onChange,
  regionCount = 0,
  durationWeeks = null,
  suggestedDistribution,
  isPt = true,
  disabled = false,
}: Props) => {
  const set = <K extends keyof MechanismAnswers>(key: K, v: MechanismAnswers[K]) =>
    onChange({ ...value, [key]: v });

  const toggleDescriptor = (d: string) =>
    onChange({
      ...value,
      descriptors: value.descriptors.includes(d)
        ? value.descriptors.filter((x) => x !== d)
        : [...value.descriptors, d],
    });

  const result: MechanismResult = useMemo(
    () =>
      classifyMechanism({
        descriptors: value.descriptors,
        distribution: value.distribution,
        proportionateToStimulus: value.proportionateToStimulus,
        spontaneousPain: value.spontaneousPain,
        multisensoryHypersensitivity: value.multisensoryHypersensitivity,
        nonRestorativeSleep: value.nonRestorativeSleep,
        persistentFatigue: value.persistentFatigue,
        objectiveNeuroSigns: value.objectiveNeuroSigns,
        durationWeeks,
        csiScore: value.csiScore,
        regionCount,
      }),
    [value, durationWeeks, regionCount],
  );

  const lang = isPt ? "pt" : "en";
  const triLabel = (v: TriState) =>
    v === true ? (isPt ? "Sim" : "Yes") : v === false ? (isPt ? "Não" : "No") : isPt ? "Não sei" : "Unsure";

  const TriGroup = ({ k }: { k: keyof MechanismAnswers }) => {
    const current = value[k] as TriState;
    const options: TriState[] = [true, false, null];
    return (
      <div className="flex gap-1.5 shrink-0">
        {options.map((opt) => (
          <Button
            key={String(opt)}
            type="button"
            size="sm"
            variant={current === opt ? "default" : "outline"}
            className="h-8 px-2.5 text-[11px]"
            disabled={disabled}
            onClick={() => set(k, opt as MechanismAnswers[typeof k])}
          >
            {triLabel(opt)}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div>
        <Label className="text-xs font-semibold">
          {isPt ? "Triagem do mecanismo de dor" : "Pain mechanism screening"}
        </Label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isPt
            ? "Opcional. Classificação determinística (Kosek 2021 / Finnerup 2016) — não usa IA. Deixe em branco o que não se aplica."
            : "Optional. Deterministic classification (Kosek 2021 / Finnerup 2016) — no AI involved."}
        </p>
      </div>

      {/* Descritores */}
      <div className="space-y-1.5">
        <Label className="text-[11px]">
          {isPt ? "Como o paciente descreve a dor?" : "How does the patient describe the pain?"}
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {[...NOCICEPTIVE_DESCRIPTORS, ...NEUROPATHIC_DESCRIPTORS].map((d) => {
            const active = value.descriptors.includes(d);
            return (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-7 px-2 text-[11px]"
                disabled={disabled}
                onClick={() => toggleDescriptor(d)}
              >
                {DESCRIPTOR_COPY[d]?.[lang] ?? d}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Distribuição */}
      <div className="space-y-1.5">
        <Label className="text-[11px]">{isPt ? "Distribuição da dor" : "Pain distribution"}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={value.distribution}
            onValueChange={(v) => set("distribution", v as MechanismDistribution)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 w-full text-xs sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DISTRIBUTION_COPY) as MechanismDistribution[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {DISTRIBUTION_COPY[k][lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestedDistribution &&
            suggestedDistribution !== "unknown" &&
            suggestedDistribution !== value.distribution && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={disabled}
                onClick={() => set("distribution", suggestedDistribution)}
              >
                {isPt ? "Usar sugestão do mapa: " : "Use map suggestion: "}
                {DISTRIBUTION_COPY[suggestedDistribution][lang]}
              </Button>
            )}
        </div>
      </div>

      {/* Perguntas tri-state */}
      <div className="space-y-2">
        {QUESTIONS.map((q) => (
          <div
            key={String(q.key)}
            className="flex flex-col gap-2 rounded-md border bg-background p-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-[11px] leading-snug">{q[lang]}</span>
            <TriGroup k={q.key} />
          </div>
        ))}
      </div>

      {/* CSI opcional */}
      <div className="space-y-1.5">
        <Label className="text-[11px]">
          {isPt
            ? "Escore CSI (Central Sensitization Inventory, 0-100) — opcional"
            : "CSI score (Central Sensitization Inventory, 0-100) — optional"}
        </Label>
        <Input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          className="h-9 w-32 text-xs"
          value={value.csiScore ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return set("csiScore", null);
            const n = Math.max(0, Math.min(100, Number(raw)));
            set("csiScore", Number.isFinite(n) ? n : null);
          }}
        />
      </div>

      {/* Resultado determinístico */}
      <div className="rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {isPt ? "Mecanismo predominante:" : "Predominant mechanism:"}
          </span>
          <Badge variant="outline" className={getMechanismTokenClass(result.mechanism)}>
            {getMechanismLabel(result.mechanism, lang)}
          </Badge>
          {result.secondary && (
            <Badge variant="outline" className="text-[10px]">
              {isPt ? "secundário: " : "secondary: "}
              {getMechanismLabel(result.secondary, lang)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {isPt ? "confiança " : "confidence "}
            {result.confidence === "high"
              ? isPt
                ? "alta"
                : "high"
              : result.confidence === "moderate"
                ? isPt
                  ? "moderada"
                  : "moderate"
                : isPt
                  ? "baixa"
                  : "low"}
          </Badge>
          {result.centralSensitizationLikely && (
            <Badge variant="outline" className="text-[10px]">
              {isPt ? "sensibilização central provável" : "central sensitization likely"}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {getMechanismTechnical(result.mechanism, lang)}
        </p>
      </div>
    </div>
  );
};

export default PainMechanismScreening;
