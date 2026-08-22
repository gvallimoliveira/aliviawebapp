/**
 * Triagem aprofundada de mecanismo de dor — 3 etapas.
 *
 * Etapa 1: critérios clínicos ponderados por bloco (nociceptivo / neuropático /
 *          nociplástico), com pontuação ao vivo.
 * Etapa 2: subtipo do mecanismo predominante (mecânica x inflamatória,
 *          periférica x central, nociplástica primária x secundária) + CSI e
 *          distribuição (apenas no fluxo profissional).
 * Etapa 3: resultado — mecanismo, subtipo, eixo, confiança e raciocínio.
 *
 * Classificação 100% determinística (`classifyMechanism`), sem IA.
 * Referências: Kosek et al. 2021 (nociplástica), Finnerup et al. 2016 (neuropática).
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  classifyMechanism,
  criteriaForBlock,
  blockMaxScore,
  getMechanismLabel,
  getMechanismLay,
  getMechanismTechnical,
  getMechanismTokenClass,
  getSubtypeLabel,
  suggestSubtype,
  MECHANISM_BLOCK_ORDER,
  MECHANISM_CRITERIA,
  subtypeOptionsFor,
  type MechanismBlock,
  type MechanismResult,
  type MechanismSubtype,
  type MechanismDistribution,
} from "@/lib/painMechanism";
import type { MechanismAnswers } from "./PainMechanismScreening";

type Lang = "pt" | "en" | "es";

const COPY = {
  title: {
    pt: "Triagem do mecanismo de dor",
    en: "Pain mechanism screening",
    es: "Triaje del mecanismo de dolor",
  },
  subtitlePro: {
    pt: "Marque os critérios presentes. Classificação determinística (Kosek 2021 / Finnerup 2016) — sem IA.",
    en: "Check the criteria present. Deterministic classification (Kosek 2021 / Finnerup 2016) — no AI.",
    es: "Marque los criterios presentes. Clasificación determinista (Kosek 2021 / Finnerup 2016) — sin IA.",
  },
  subtitlePatient: {
    pt: "Marque tudo o que combina com a sua dor. Isso ajuda a entender o tipo de dor, não só onde dói.",
    en: "Check everything that matches your pain. This helps us understand the type of pain, not just where it hurts.",
    es: "Marque todo lo que coincida con su dolor. Ayuda a entender el tipo de dolor, no solo dónde duele.",
  },
  steps: {
    pt: ["Critérios", "Subtipo", "Resultado"],
    en: ["Criteria", "Subtype", "Result"],
    es: ["Criterios", "Subtipo", "Resultado"],
  },
  blocks: {
    nociceptive: {
      pt: "Padrão nociceptivo (tecido)",
      en: "Nociceptive pattern (tissue)",
      es: "Patrón nociceptivo (tejido)",
    },
    neuropathic: {
      pt: "Padrão neuropático (nervo)",
      en: "Neuropathic pattern (nerve)",
      es: "Patrón neuropático (nervio)",
    },
    nociplastic: {
      pt: "Padrão nociplástico (sensibilização)",
      en: "Nociplastic pattern (sensitization)",
      es: "Patrón nociplástico (sensibilización)",
    },
  } as Record<MechanismBlock, Record<Lang, string>>,
  next: { pt: "Avançar", en: "Next", es: "Avanzar" },
  back: { pt: "Voltar", en: "Back", es: "Volver" },
  subtypeTitle: {
    pt: "Refine o subtipo do mecanismo predominante",
    en: "Refine the predominant mechanism subtype",
    es: "Refine el subtipo del mecanismo predominante",
  },
  subtypeSuggested: { pt: "sugerido", en: "suggested", es: "sugerido" },
  subtypeNone: {
    pt: "Ainda sem critérios suficientes para sugerir um subtipo. Volte e marque os itens presentes.",
    en: "Not enough criteria yet to suggest a subtype. Go back and check the items present.",
    es: "Aún sin criterios suficientes para sugerir un subtipo. Vuelva y marque los ítems presentes.",
  },
  csi: {
    pt: "Escore CSI (Central Sensitization Inventory, 0-100) — opcional",
    en: "CSI score (Central Sensitization Inventory, 0-100) — optional",
    es: "Puntaje CSI (Central Sensitization Inventory, 0-100) — opcional",
  },
  distribution: { pt: "Distribuição da dor", en: "Pain distribution", es: "Distribución del dolor" },
  useMapSuggestion: {
    pt: "Usar sugestão do mapa",
    en: "Use map suggestion",
    es: "Usar sugerencia del mapa",
  },
  result: { pt: "Mecanismo predominante", en: "Predominant mechanism", es: "Mecanismo predominante" },
  axis: { pt: "Eixo", en: "Axis", es: "Eje" },
  confidence: { pt: "Confiança", en: "Confidence", es: "Confianza" },
  reasoning: { pt: "Critérios que sustentam", en: "Supporting criteria", es: "Criterios que sustentan" },
  csLikely: {
    pt: "sensibilização central provável",
    en: "central sensitization likely",
    es: "sensibilización central probable",
  },
  disclaimer: {
    pt: "Impressão automática de triagem — não substitui avaliação profissional.",
    en: "Automatic screening impression — not a substitute for professional assessment.",
    es: "Impresión automática de triaje — no sustituye la evaluación profesional.",
  },
};

const AXIS_COPY: Record<string, Record<Lang, string>> = {
  peripheral: { pt: "Periférico", en: "Peripheral", es: "Periférico" },
  central: { pt: "Central", en: "Central", es: "Central" },
  mixed: { pt: "Misto", en: "Mixed", es: "Mixto" },
  unknown: { pt: "Indefinido", en: "Undefined", es: "Indefinido" },
};

const CONFIDENCE_COPY: Record<string, Record<Lang, string>> = {
  low: { pt: "baixa", en: "low", es: "baja" },
  moderate: { pt: "moderada", en: "moderate", es: "moderada" },
  high: { pt: "alta", en: "high", es: "alta" },
};

const DISTRIBUTION_COPY: Record<MechanismDistribution, Record<Lang, string>> = {
  unknown: { pt: "Não avaliada", en: "Not assessed", es: "No evaluada" },
  localized: { pt: "Localizada (1 região)", en: "Localized (1 region)", es: "Localizada (1 región)" },
  dermatomal: {
    pt: "Dermatomal / trajeto de nervo",
    en: "Dermatomal / nerve path",
    es: "Dermatomal / trayecto nervioso",
  },
  regional: {
    pt: "Regional (2-4 regiões contíguas)",
    en: "Regional (2-4 contiguous)",
    es: "Regional (2-4 contiguas)",
  },
  widespread: {
    pt: "Difusa (acima e abaixo da cintura)",
    en: "Widespread",
    es: "Difusa",
  },
  multisite: { pt: "Multissítio (≥ 5 regiões)", en: "Multisite (≥ 5 regions)", es: "Multisitio (≥ 5 regiones)" },
};

export interface PainMechanismWizardProps {
  value: MechanismAnswers;
  onChange: (next: MechanismAnswers) => void;
  /** `pro` mostra critérios de exame físico, CSI e distribuição manual. */
  variant?: "pro" | "patient";
  language?: string;
  regionCount?: number;
  durationWeeks?: number | null;
  suggestedDistribution?: MechanismDistribution;
  disabled?: boolean;
}

const PainMechanismWizard = ({
  value,
  onChange,
  variant = "pro",
  language = "pt",
  regionCount = 0,
  durationWeeks = null,
  suggestedDistribution,
  disabled = false,
}: PainMechanismWizardProps) => {
  const lang: Lang = language === "pt" ? "pt" : language === "es" ? "es" : "en";
  const isPro = variant === "pro";
  const [stage, setStage] = useState(0);

  const includeExam = isPro;

  const result: MechanismResult = useMemo(
    () =>
      classifyMechanism({
        descriptors: value.descriptors,
        distribution: value.distribution,
        criteria: value.criteria,
        subtype: value.subtype,
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

  const dominantBlock: MechanismBlock | null = useMemo(() => {
    const ranked = (
      Object.entries(result.scores) as [MechanismBlock, number][]
    ).sort((a, b) => b[1] - a[1]);
    return ranked[0][1] > 0 ? ranked[0][0] : null;
  }, [result.scores]);

  const autoSubtype = dominantBlock ? suggestSubtype(dominantBlock, value.criteria) : null;

  const toggleCriterion = (key: string) => {
    const next = value.criteria.includes(key)
      ? value.criteria.filter((k) => k !== key)
      : [...value.criteria, key];
    // Trocar critérios pode invalidar o subtipo escolhido → volta para a sugestão.
    onChange({ ...value, criteria: next, subtype: null });
  };

  const blockPercent = (block: MechanismBlock) => {
    const max = blockMaxScore(block, includeExam) || 1;
    return Math.min(100, Math.round((result.scores[block] / max) * 100));
  };

  const stepLabels = COPY.steps[lang];

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label className="text-xs font-semibold">
          {COPY.title[lang]}{" "}
          <span className="font-normal text-muted-foreground">
            ({COPY.optional[lang]})
          </span>
        </Label>
        <p className="text-[11px] text-muted-foreground">
          {isPro ? COPY.subtitlePro[lang] : COPY.subtitlePatient[lang]}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          {COPY.optionalHint[lang]}
        </p>
      </div>


      {/* Trilha de etapas */}
      <div className="flex items-center gap-1.5">
        {stepLabels.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={disabled || i > stage}
            onClick={() => setStage(i)}
            className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
              i === stage
                ? "border-primary bg-primary/10 text-primary"
                : i < stage
                  ? "border-border bg-background text-muted-foreground"
                  : "border-dashed border-border/60 text-muted-foreground/60"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Etapa 1 — critérios */}
      {stage === 0 && (
        <div className="space-y-3">
          {MECHANISM_BLOCK_ORDER.map((block) => {
            const items = criteriaForBlock(block, { includeExam });
            return (
              <div key={block} className="space-y-1.5 rounded-md border bg-background p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold">{COPY.blocks[block][lang]}</span>
                  <Badge variant="outline" className={`text-[10px] ${getMechanismTokenClass(block)}`}>
                    {blockPercent(block)}%
                  </Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${blockPercent(block)}%` }}
                  />
                </div>
                <div className="space-y-1 pt-1">
                  {items.map((c) => {
                    const active = value.criteria.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleCriterion(c.key)}
                        className={`flex w-full items-start gap-2 rounded-md border p-2 text-left text-[11px] leading-snug transition-colors ${
                          active
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </span>
                        <span>{isPro ? c.label[lang] : c.lay[lang]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Etapa 2 — subtipo (+ CSI e distribuição no fluxo pro) */}
      {stage === 1 && (
        <div className="space-y-3">
          <Label className="text-[11px] font-semibold">{COPY.subtypeTitle[lang]}</Label>
          {!dominantBlock && (
            <p className="text-[11px] text-muted-foreground">{COPY.subtypeNone[lang]}</p>
          )}
          {dominantBlock && (
            <div className="space-y-2">
              {subtypeOptionsFor(dominantBlock).map((opt) => {
                const selected = (value.subtype ?? autoSubtype) === opt.key;
                return (
                  <Card
                    key={opt.key}
                    className={`cursor-pointer transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"
                    }`}
                    onClick={() => !disabled && onChange({ ...value, subtype: opt.key })}
                  >
                    <CardContent className="space-y-1 px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium">{opt.label[lang]}</span>
                        {autoSubtype === opt.key && (
                          <Badge variant="secondary" className="text-[9px]">
                            {COPY.subtypeSuggested[lang]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {isPro ? opt.hint[lang] : opt.hint[lang]}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {isPro && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{COPY.distribution[lang]}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border bg-background px-2 py-1 text-[11px]">
                    {DISTRIBUTION_COPY[value.distribution][lang]}
                  </span>
                  {suggestedDistribution &&
                    suggestedDistribution !== "unknown" &&
                    suggestedDistribution !== value.distribution && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        disabled={disabled}
                        onClick={() => onChange({ ...value, distribution: suggestedDistribution })}
                      >
                        {COPY.useMapSuggestion[lang]}: {DISTRIBUTION_COPY[suggestedDistribution][lang]}
                      </Button>
                    )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">{COPY.csi[lang]}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  className="h-9 w-28 text-xs"
                  value={value.csiScore ?? ""}
                  disabled={disabled}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return onChange({ ...value, csiScore: null });
                    const n = Math.max(0, Math.min(100, Number(raw)));
                    onChange({ ...value, csiScore: Number.isFinite(n) ? n : null });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Etapa 3 — resultado */}
      {stage === 2 && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{COPY.result[lang]}:</span>
            <Badge variant="outline" className={getMechanismTokenClass(result.mechanism)}>
              {getMechanismLabel(result.mechanism, lang)}
            </Badge>
            {getSubtypeLabel(result.subtype, lang) && (
              <Badge variant="outline" className="text-[10px]">
                {getSubtypeLabel(result.subtype, lang)}
              </Badge>
            )}
            {result.secondary && (
              <Badge variant="outline" className="text-[10px]">
                {lang === "pt" ? "secundário: " : lang === "es" ? "secundario: " : "secondary: "}
                {getMechanismLabel(result.secondary, lang)}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {COPY.axis[lang]}: {AXIS_COPY[result.axis][lang]}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {COPY.confidence[lang]} {CONFIDENCE_COPY[result.confidence][lang]}
            </Badge>
            {result.centralSensitizationLikely && (
              <Badge variant="outline" className="text-[10px]">
                {COPY.csLikely[lang]}
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {MECHANISM_BLOCK_ORDER.map((block) => (
              <div key={block} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{COPY.blocks[block][lang]}</span>
                  <span>{blockPercent(block)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${blockPercent(block)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            {isPro
              ? getMechanismTechnical(result.mechanism, lang)
              : getMechanismLay(result.mechanism, lang)}
          </p>

          {value.criteria.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {COPY.reasoning[lang]}
              </span>
              <ul className="space-y-0.5">
                {value.criteria.map((key) => {
                  const c = MECHANISM_CRITERIA.find((x) => x.key === key);
                  if (!c) return null;
                  return (
                    <li key={key} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{isPro ? c.label[lang] : c.lay[lang]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!isPro && (
            <p className="text-[10px] text-muted-foreground/80">{COPY.disclaimer[lang]}</p>
          )}
        </div>
      )}

      {/* Navegação interna */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-[11px]"
          disabled={disabled || stage === 0}
          onClick={() => setStage((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          {COPY.back[lang]}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-[11px]"
          disabled={disabled || stage === 2}
          onClick={() =>
            setStage((s) => {
              const next = Math.min(2, s + 1);
              // Ao sair da etapa 2 sem escolha manual, congela a sugestão automática.
              if (s === 1 && !value.subtype && autoSubtype) {
                onChange({ ...value, subtype: autoSubtype });
              }
              return next;
            })
          }
        >
          {COPY.next[lang]}
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default PainMechanismWizard;
