/**
 * Passos B2 (premium) e B3 (básica) do roteiro "Mecanismo de dor".
 *
 * Versão leiga da triagem de mecanismo de dor, usada nos fluxos de
 * autoavaliação do paciente. Mesma estrutura de dados do B1
 * (`MechanismAnswers`), mas com linguagem simples, sem CSI e sem itens que
 * exigem exame físico. Classificação segue 100% determinística.
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
  type TriState,
} from "@/lib/painMechanism";
import { suggestDistribution } from "@/lib/painExtent";
import type { MechanismAnswers } from "./PainMechanismScreening";

type Lang = "pt" | "en" | "es";

interface PainMechanismLiteProps {
  value: MechanismAnswers;
  onChange: (next: MechanismAnswers) => void;
  painRegions: string[];
  /** Tipos de dor já marcados na etapa anterior (correlação, evita repetir pergunta). */
  painTypes?: string[];
  variant: "basic" | "premium";
  language: string;
  durationWeeks?: number | null;
}

type ItemKey =
  | "proportionateToStimulus"
  | "spontaneousPain"
  | "neuroSensation"
  | "nonRestorativeSleep"
  | "persistentFatigue"
  | "multisensoryHypersensitivity";

const ITEM_COPY: Record<ItemKey, Record<Lang, string>> = {
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

const BASIC_ITEMS: ItemKey[] = [
  "proportionateToStimulus",
  "spontaneousPain",
  "neuroSensation",
  "nonRestorativeSleep",
];

const PREMIUM_ITEMS: ItemKey[] = [
  ...BASIC_ITEMS,
  "persistentFatigue",
  "multisensoryHypersensitivity",
];

/** Descritores neuropáticos adicionados quando o paciente confirma a sensação. */
const LITE_NEURO_DESCRIPTORS = ["tingling", "burning"];

export const liteItemsFor = (variant: "basic" | "premium") =>
  variant === "premium" ? PREMIUM_ITEMS : BASIC_ITEMS;

/** Todos os itens visíveis respondidos (inclui "não sei" como resposta válida)? */
export const isLiteScreeningComplete = (
  value: MechanismAnswers,
  variant: "basic" | "premium",
): boolean =>
  liteItemsFor(variant).every((key) => {
    if (key === "neuroSensation") return value.descriptors.length > 0 || value.__neuro === false;
    return value[key as keyof MechanismAnswers] !== undefined && (value as any)[`__answered_${key}`] !== undefined
      ? true
      : (value as any)[key] !== null || (value as any)[`__unknown_${key}`] === true;
  });

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

  const neuroAnswer: TriState = value.descriptors.some((d) =>
    LITE_NEURO_DESCRIPTORS.includes(d),
  )
    ? true
    : value.__neuroAnswered
      ? false
      : null;

  const setItem = (key: ItemKey, answer: TriState) => {
    if (key === "neuroSensation") {
      const others = value.descriptors.filter((d) => !LITE_NEURO_DESCRIPTORS.includes(d));
      onChange({
        ...value,
        distribution,
        descriptors: answer === true ? [...others, ...LITE_NEURO_DESCRIPTORS] : others,
        __neuroAnswered: answer !== null,
      });
      return;
    }
    onChange({ ...value, distribution, [key]: answer } as MechanismAnswers);
  };

  const result = useMemo(
    () =>
      classifyMechanism({
        descriptors: [
          ...value.descriptors,
          ...painTypes.map((p) => p.split(".").pop() || ""),
        ].filter(Boolean),
        distribution,
        proportionateToStimulus: value.proportionateToStimulus,
        spontaneousPain: value.spontaneousPain,
        multisensoryHypersensitivity: value.multisensoryHypersensitivity,
        nonRestorativeSleep: value.nonRestorativeSleep,
        persistentFatigue: value.persistentFatigue,
        objectiveNeuroSigns: null,
        durationWeeks,
        csiScore: null,
        regionCount: painRegions.length,
      }),
    [value, distribution, painTypes, durationWeeks, painRegions.length],
  );

  const answeredCount = items.filter((key) =>
    key === "neuroSensation" ? neuroAnswer !== null : (value as any)[key] !== null,
  ).length;

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
        {items.map((key) => {
          const current: TriState = key === "neuroSensation" ? neuroAnswer : (value as any)[key];
          return (
            <Card key={key} className="rounded-xl border-border/60">
              <CardContent className="py-3 px-4 space-y-2">
                <p className="text-sm text-foreground leading-snug">{ITEM_COPY[key][lang]}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([true, false, null] as TriState[]).map((opt) => {
                    const label =
                      opt === true
                        ? ANSWER_COPY.yes[lang]
                        : opt === false
                          ? ANSWER_COPY.no[lang]
                          : ANSWER_COPY.unknown[lang];
                    const selected = current === opt && !(current === null && opt === null && answeredCountIsUnset(value, key));
                    return (
                      <Button
                        key={String(opt)}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        className="rounded-xl text-xs"
                        onClick={() => setItem(key, opt)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {answeredCount >= Math.min(3, items.length) && result.mechanism !== "unknown" && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
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

/** "Não sei" só fica marcado depois de clicado (evita marcar por padrão). */
function answeredCountIsUnset(value: MechanismAnswers, key: ItemKey): boolean {
  if (key === "neuroSensation") return !value.__neuroAnswered;
  return !(value.__unknownKeys ?? []).includes(key);
}

export default PainMechanismLite;
