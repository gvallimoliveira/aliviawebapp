/**
 * Passos B2 (premium) e B3 (básica) do roteiro "Mecanismo de dor".
 *
 * Versão leiga da triagem de mecanismo de dor, usada nos fluxos de
 * autoavaliação do paciente. Mesma base de dados do B1 (`MechanismAnswers`),
 * com linguagem simples, sem CSI e sem itens que exigem exame físico.
 * Classificação 100% determinística (`classifyMechanism`), nenhuma IA.
 *
 * - `variant="basic"`: 4 itens (fluxo gratuito, maior volume).
 * - `variant="premium"`: 6 itens (inclui fadiga e hipersensibilidade).
 */
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  classifyMechanism,
  getMechanismLabel,
  getMechanismLay,
  getMechanismTokenClass,
  type MechanismResult,
  type TriState,
} from "@/lib/painMechanism";
import { suggestDistribution } from "@/lib/painExtent";
import { ENABLE_PAIN_MECHANISM } from "@/lib/featureFlags";
import { toStoredMechanism } from "@/lib/painMechanism";
import {
  createEmptyMechanismAnswers,
  sanitizeMechanismAnswers,
  PAIN_TYPE_TO_DESCRIPTOR,
  type MechanismAnswers,
} from "./PainMechanismScreening";

type Lang = "pt" | "en" | "es";

export type LiteItemKey =
  | "proportionateToStimulus"
  | "spontaneousPain"
  | "neuroSensation"
  | "nonRestorativeSleep"
  | "persistentFatigue"
  | "multisensoryHypersensitivity";

/** Respostas da versão leiga: base do B1 + registro de quais itens foram respondidos. */
export interface LiteMechanismAnswers extends MechanismAnswers {
  answered: LiteItemKey[];
}

export const createEmptyLiteAnswers = (): LiteMechanismAnswers => ({
  ...createEmptyMechanismAnswers(),
  answered: [],
});

export const sanitizeLiteAnswers = (raw: unknown): LiteMechanismAnswers => {
  const base = sanitizeMechanismAnswers(raw);
  const answered = Array.isArray((raw as any)?.answered)
    ? ((raw as any).answered as unknown[]).map(String).filter((k): k is LiteItemKey =>
        ALL_ITEMS.includes(k as LiteItemKey),
      )
    : [];
  return { ...base, answered };
};

const ITEM_COPY: Record<LiteItemKey, Record<Lang, string>> = {
  proportionateToStimulus: {
    pt: "Sua dor aumenta e diminui conforme o que você faz (posição, esforço, movimento)?",
    en: "Does your pain increase and decrease with what you do (position, effort, movement)?",
    es: "¿Su dolor aumenta y disminuye según lo que hace (posición, esfuerzo, movimiento)?",
  },
  spontaneousPain: {
    pt: "A dor às vezes aparece sozinha, sem um motivo claro?",
    en: "Does the pain sometimes appear on its own, with no clear trigger?",
    es: "¿El dolor a veces aparece solo, sin un motivo claro?",
  },
  neuroSensation: {
    pt: "Você sente queimação, formigamento, choque ou adormecimento na região?",
    en: "Do you feel burning, tingling, electric shocks or numbness in the area?",
    es: "¿Siente ardor, hormigueo, descargas o adormecimiento en la zona?",
  },
  nonRestorativeSleep: {
    pt: "Você dorme mal ou acorda sem se sentir descansado(a)?",
    en: "Do you sleep poorly or wake up without feeling rested?",
    es: "¿Duerme mal o se despierta sin sentirse descansado(a)?",
  },
  persistentFatigue: {
    pt: "Você se sente cansado(a) na maior parte dos dias?",
    en: "Do you feel tired most days?",
    es: "¿Se siente cansado(a) la mayoría de los días?",
  },
  multisensoryHypersensitivity: {
    pt: "Luz forte, barulho, cheiros ou um toque leve incomodam mais do que antes?",
    en: "Do bright light, noise, smells or light touch bother you more than before?",
    es: "¿La luz fuerte, el ruido, los olores o un toque leve le molestan más que antes?",
  },
};

const ANSWER_COPY = {
  yes: { pt: "Sim", en: "Yes", es: "Sí" },
  no: { pt: "Não", en: "No", es: "No" },
  unknown: { pt: "Não sei", en: "Not sure", es: "No sé" },
};

const BASIC_ITEMS: LiteItemKey[] = [
  "proportionateToStimulus",
  "spontaneousPain",
  "neuroSensation",
  "nonRestorativeSleep",
];

const PREMIUM_ITEMS: LiteItemKey[] = [
  ...BASIC_ITEMS,
  "persistentFatigue",
  "multisensoryHypersensitivity",
];

const ALL_ITEMS: LiteItemKey[] = PREMIUM_ITEMS;

/** Descritores neuropáticos aplicados quando o paciente confirma a sensação. */
const LITE_NEURO_DESCRIPTORS = ["tingling", "burning"];

export const liteItemsFor = (variant: "basic" | "premium") =>
  variant === "premium" ? PREMIUM_ITEMS : BASIC_ITEMS;

/** Todos os itens visíveis respondidos ("não sei" conta como resposta). */
export const isLiteScreeningComplete = (
  value: LiteMechanismAnswers,
  variant: "basic" | "premium",
): boolean => liteItemsFor(variant).every((key) => value.answered.includes(key));

export const hasLiteAnswers = (value: LiteMechanismAnswers): boolean =>
  value.answered.length > 0 || value.criteria.length > 0;

/** Traduz os tipos de dor da anamnese em descritores do modelo. */
export const painTypesToDescriptors = (painTypes: string[]): string[] =>
  painTypes
    .map((pt) => PAIN_TYPE_TO_DESCRIPTOR[pt.split(".").pop() || ""] || pt.split(".").pop() || "")
    .filter(Boolean);

export const classifyLite = (
  value: LiteMechanismAnswers,
  painRegions: string[],
  painTypes: string[],
  durationWeeks: number | null = null,
): MechanismResult => {
  const suggested = suggestDistribution(painRegions);
  return classifyMechanism({
    descriptors: Array.from(
      new Set([...value.descriptors, ...painTypesToDescriptors(painTypes)]),
    ),
    distribution: suggested === "unknown" ? value.distribution : suggested,
    criteria: value.criteria,
    subtype: value.subtype,
    proportionateToStimulus: value.proportionateToStimulus,
    spontaneousPain: value.spontaneousPain,
    multisensoryHypersensitivity: value.multisensoryHypersensitivity,
    nonRestorativeSleep: value.nonRestorativeSleep,
    persistentFatigue: value.persistentFatigue,
    objectiveNeuroSigns: null,
    durationWeeks,
    csiScore: null,
    regionCount: painRegions.length,
  });
};

interface PainMechanismLiteProps {
  value: LiteMechanismAnswers;
  onChange: (next: LiteMechanismAnswers) => void;
  painRegions: string[];
  /** Tipos de dor já marcados na etapa anterior (evita repetir a pergunta). */
  painTypes?: string[];
  variant: "basic" | "premium";
  language: string;
  durationWeeks?: number | null;
}

const PainMechanismLite = ({
  value,
  onChange,
  painRegions,
  painTypes = [],
  variant,
  language,
  durationWeeks = null,
}: PainMechanismLiteProps) => {
  const lang: Lang = language === "pt" ? "pt" : language === "es" ? "es" : "en";
  const items = liteItemsFor(variant);

  const distribution = useMemo(() => {
    const suggested = suggestDistribution(painRegions);
    return suggested === "unknown" ? value.distribution : suggested;
  }, [painRegions, value.distribution]);

  const neuroAnswer: TriState = value.answered.includes("neuroSensation")
    ? value.descriptors.some((d) => LITE_NEURO_DESCRIPTORS.includes(d))
      ? true
      : false
    : null;

  const setItem = (key: LiteItemKey, answer: TriState) => {
    const answered = Array.from(new Set([...value.answered, key]));
    if (key === "neuroSensation") {
      const others = value.descriptors.filter((d) => !LITE_NEURO_DESCRIPTORS.includes(d));
      onChange({
        ...value,
        answered,
        distribution,
        descriptors: answer === true ? [...others, ...LITE_NEURO_DESCRIPTORS] : others,
      });
      return;
    }
    onChange({ ...value, answered, distribution, [key]: answer } as LiteMechanismAnswers);
  };

  const isSelected = (key: LiteItemKey, opt: TriState) => {
    if (!value.answered.includes(key)) return false;
    const current: TriState = key === "neuroSensation" ? neuroAnswer : (value as any)[key];
    return current === opt;
  };

  const result = useMemo(
    () => classifyLite(value, painRegions, painTypes, durationWeeks),
    [value, painRegions, painTypes, durationWeeks],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">
          {lang === "pt"
            ? "Como sua dor se comporta"
            : lang === "es"
              ? "Cómo se comporta su dolor"
              : "How your pain behaves"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {lang === "pt"
            ? "Essas respostas ajudam a entender o tipo de dor, não só onde ela dói."
            : lang === "es"
              ? "Estas respuestas ayudan a entender el tipo de dolor, no solo dónde duele."
              : "These answers help us understand the type of pain, not just where it hurts."}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((key) => (
          <Card key={key} className="rounded-xl border-border/60">
            <CardContent className="py-3 px-4 space-y-2">
              <p className="text-sm text-foreground leading-snug">{ITEM_COPY[key][lang]}</p>
              <div className="grid grid-cols-3 gap-2">
                {([true, false, null] as TriState[]).map((opt) => (
                  <Button
                    key={String(opt)}
                    type="button"
                    size="sm"
                    variant={isSelected(key, opt) ? "default" : "outline"}
                    className="rounded-xl text-xs"
                    onClick={() => setItem(key, opt)}
                  >
                    {opt === true
                      ? ANSWER_COPY.yes[lang]
                      : opt === false
                        ? ANSWER_COPY.no[lang]
                        : ANSWER_COPY.unknown[lang]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {value.answered.length >= Math.min(3, items.length) &&
        result.mechanism !== "unknown" && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {lang === "pt"
                  ? "Padrão predominante"
                  : lang === "es"
                    ? "Patrón predominante"
                    : "Predominant pattern"}
              </span>
              <Badge variant="outline" className={getMechanismTokenClass(result.mechanism)}>
                {getMechanismLabel(result.mechanism, lang)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {getMechanismLay(result.mechanism, lang)}
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              {lang === "pt"
                ? "Impressão automática de triagem — não substitui avaliação profissional."
                : lang === "es"
                  ? "Impresión automática de triaje — no sustituye la evaluación profesional."
                  : "Automatic screening impression — not a substitute for professional assessment."}
            </p>
          </div>
        )}
    </div>
  );
};

export default PainMechanismLite;

/**
 * Payload pronto para `assessments` (B2/B3). Vazio quando não houve triagem ou
 * quando a flag está desligada — nunca sobrescreve dados existentes com null.
 */
export const buildMechanismPayload = (data: {
  assessmentPurpose?: "symptomatic" | "prevention";
  painMechanism?: unknown;
  painRegions?: string[];
  painTypes?: string[];
}): Record<string, unknown> => {
  if (data.assessmentPurpose === "prevention") return { pain_mechanism: null };
  if (!ENABLE_PAIN_MECHANISM) return {};
  const lite = sanitizeLiteAnswers(data.painMechanism);
  if (!hasLiteAnswers(lite)) return {};
  return {
    pain_mechanism: toStoredMechanism(
      classifyLite(lite, data.painRegions ?? [], data.painTypes ?? []),
      "rules",
      null,
      lite.criteria,
    ),
  };
};
