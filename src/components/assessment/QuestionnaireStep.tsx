import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, ClipboardCheck, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import QuestionnaireResultCard from "@/components/assessment/QuestionnaireResultCard";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getApplicableQuestionnaires,
  getFunctionalQuestionnaires,
  calculateQuestionnaireScore,
  type QuestionnaireDefinition,
  type QuestionnaireResult,
} from "@/data/questionnaireData";

interface QuestionnaireStepProps {
  painRegions: string[];
  onComplete: (results: QuestionnaireResult[]) => void;
  onBack: () => void;
  onSkip: () => void;
  previousAnswers?: Record<string, Record<string, number>>;
  painScoresPerRegion?: Record<string, number>;
  generalPainScore?: number;
  extraQuestionnaireRegions?: string[];
  /** Demo mode: shows a single-click autofill button using `autofillAnswers`. */
  demoMode?: boolean;
  /** Mock answers keyed by questionnaire id -> question id -> value. */
  autofillAnswers?: Record<string, Record<string, number>>;
  /** Preventive mode: painRegions are attention/history sites; only functional items. */
  functionalOnly?: boolean;
}

const QuestionnaireStep = ({ painRegions, onComplete, onBack, onSkip, previousAnswers, painScoresPerRegion, generalPainScore, extraQuestionnaireRegions, demoMode, autofillAnswers, functionalOnly }: QuestionnaireStepProps) => {
  const { language } = useLanguage();
  const tl = (pt: string, en: string) => (language === "pt" ? pt : en);

  // Score each applicable questionnaire by the highest pain score among its
  // mapped regions. Keep top 2 as mandatory. If the user described a relevant
  // functional limitation in a low-pain region (extraQuestionnaireRegions),
  // allow one extra questionnaire that covers that region (max 3 total).
  const applicableQuestionnaires = useMemo(() => {
    if (functionalOnly) return getFunctionalQuestionnaires(painRegions).slice(0, 2);
    const all = getApplicableQuestionnaires(painRegions);
    if (all.length <= 2) return all;

    const scoreFor = (q: QuestionnaireDefinition) => {
      let best = 0;
      for (const r of q.regionMapping) {
        const s = Number(painScoresPerRegion?.[r] ?? 0);
        if (s > best) best = s;
      }
      if (best === 0 && typeof generalPainScore === "number") best = generalPainScore;
      return best;
    };

    const sorted = [...all].sort((a, b) => scoreFor(b) - scoreFor(a));
    const top = sorted.slice(0, 2);
    const rest = sorted.slice(2);

    const extraRegions = extraQuestionnaireRegions ?? [];
    let extra: QuestionnaireDefinition | null = null;
    if (extraRegions.length > 0) {
      extra = rest.find((q) => q.regionMapping.some((r) => extraRegions.includes(r))) ?? null;
    }
    return extra ? [...top, extra] : top;
  }, [painRegions, painScoresPerRegion, generalPainScore, extraQuestionnaireRegions, functionalOnly]);

  const priorityNames = applicableQuestionnaires.map((q) => q.name).join(" + ");

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentSubscaleIndex, setCurrentSubscaleIndex] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<QuestionnaireResult[]>([]);
  const [activityLabels, setActivityLabels] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQ = applicableQuestionnaires[currentQIndex] as QuestionnaireDefinition | undefined;

  const subscales = useMemo(() => {
    if (!currentQ) return [];
    const seen: string[] = [];
    for (const q of currentQ.questions) {
      if (!seen.includes(q.subscale)) seen.push(q.subscale);
    }
    return seen;
  }, [currentQ]);

  // No applicable questionnaires
  if (applicableQuestionnaires.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-10">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">{tl("Questionários Funcionais", "Functional Questionnaires")}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {tl(
            "Os questionários funcionais são validados por região do corpo. Não existe um questionário específico para as regiões que você marcou no mapa de dor, então esta etapa não se aplica ao seu caso.",
            "Functional questionnaires are validated per body region. There is no specific questionnaire for the regions you marked on the pain map, so this step does not apply to your case.",
          )}
        </p>
        <Button onClick={onSkip} className="rounded-xl">{tl("Continuar", "Continue")}</Button>
      </motion.div>
    );
  }


  if (!currentQ) return null;

  const currentAnswers = allAnswers[currentQ.id] || {};
  const currentSubscale = subscales[currentSubscaleIndex];
  const subscaleQuestions = currentQ.questions.filter((q) => q.subscale === currentSubscale);
  const subscaleLabel = currentQ.subscaleLabels[currentSubscale];
  const isPSFS = currentQ.id === "psfs";
  const psfsFilled = (id: string) => !!activityLabels[id]?.trim() && currentAnswers[id] !== undefined;
  const allSubscaleAnswered = isPSFS
    ? psfsFilled("psfs_1") && subscaleQuestions.every((q) => !activityLabels[q.id]?.trim() || currentAnswers[q.id] !== undefined)
    : subscaleQuestions.every((q) => currentAnswers[q.id] !== undefined);
  const totalQuestionnaires = applicableQuestionnaires.length;
  const totalSubscales = subscales.length;
  const overallProgress = ((currentQIndex * 100) / totalQuestionnaires) + ((currentSubscaleIndex + 1) / totalSubscales) * (100 / totalQuestionnaires);

  const handleAnswer = (questionId: string, value: number) => {
    setAllAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { ...(prev[currentQ.id] || {}), [questionId]: value },
    }));
  };

  const handleNext = () => {
    if (currentSubscaleIndex < totalSubscales - 1) {
      setCurrentSubscaleIndex(currentSubscaleIndex + 1);
    } else {
      const rawAnswers = allAnswers[currentQ.id] || {};
      const answersForScore = currentQ.id === "psfs"
        ? Object.fromEntries(Object.entries(rawAnswers).filter(([k]) => !!activityLabels[k]?.trim()))
        : rawAnswers;
      const scored0 = calculateQuestionnaireScore(currentQ, answersForScore);
      const scored = currentQ.id === "psfs"
        ? (() => {
            const labels = Object.fromEntries(Object.keys(answersForScore).map((k) => [k, activityLabels[k].trim()]));
            const list = Object.entries(labels).map(([k, l]) => `${l} (${answersForScore[k]}/10)`).join("; ");
            return { ...scored0, activityLabels: labels, interpretation_pt: `${scored0.interpretation_pt}. Atividades: ${list}`, interpretation_en: `${scored0.interpretation_en}. Activities: ${list}` };
          })()
        : scored0;
      const result = functionalOnly ? { ...scored, functionalOnly: true, interpretation_pt: `Subescala funcional (dor não coletada). ${scored.interpretation_pt}`, interpretation_en: `Functional subscale (pain not collected). ${scored.interpretation_en}` } : scored;
      const newResults = [...results, result];
      setResults(newResults);
      if (currentQIndex < totalQuestionnaires - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setCurrentSubscaleIndex(0);
      } else {
        setShowResults(true);
      }
    }
  };

  const handleBack = () => {
    if (currentSubscaleIndex > 0) {
      setCurrentSubscaleIndex(currentSubscaleIndex - 1);
    } else if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
      const prevQ = applicableQuestionnaires[currentQIndex - 1];
      const prevSubs = [...new Set(prevQ.questions.map((q) => q.subscale))];
      setCurrentSubscaleIndex(prevSubs.length - 1);
      setResults((prev) => prev.slice(0, -1));
    } else {
      onBack();
    }
  };

  // Results view
  if (showResults) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="text-center space-y-2">
          <Award className="h-10 w-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold">{tl("Resultados dos Questionários", "Questionnaire Results")}</h3>
          <p className="text-sm text-muted-foreground">
            {tl("Estes scores ajudarão a refinar seu diagnóstico e plano de tratamento.", "These scores will help refine your diagnosis and treatment plan.")}
          </p>
        </div>
        <div className="space-y-4">
          {results.map((r) => (
            <QuestionnaireResultCard key={r.questionnaireId} result={r} language={language} />
          ))}
        </div>
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setShowResults(false)} className="gap-2 rounded-xl">
            <ChevronLeft className="h-4 w-4" /> {tl("Voltar", "Back")}
          </Button>
          <Button onClick={() => onComplete(results)} className="gap-2 rounded-xl">
            {tl("Continuar Avaliação", "Continue Assessment")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Questions view
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{tl("Questionário", "Questionnaire")} {currentQIndex + 1}/{totalQuestionnaires} — {currentQ.name}</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {totalQuestionnaires > 1 && currentQIndex === 0 && (
        <div className="text-[11px] leading-snug rounded-lg border border-primary/20 bg-primary/5 text-foreground/80 px-3 py-2">
          {tl(
            `Para focar a análise, priorizamos ${totalQuestionnaires} questionário(s) (${priorityNames}) das regiões com maior dor.`,
            `To focus the analysis, we prioritized ${totalQuestionnaires} questionnaire(s) (${priorityNames}) for the regions with highest pain.`
          )}
        </div>
      )}

      {/* Questionnaire header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {language === "pt" ? currentQ.fullName_pt : currentQ.fullName_en}
        </div>
        <p className="text-xs text-muted-foreground">{language === "pt" ? currentQ.description_pt : currentQ.description_en}</p>
        {functionalOnly && (<p className="text-xs text-primary mt-1">{tl("Sem dor no momento: aplicamos só as perguntas de atividades do dia a dia da região em acompanhamento.", "No current pain: only daily-activity questions for the monitored region are applied.")}</p>)}
      </div>

      {/* Subscale header */}
      <div>
        <h3 className="text-lg font-semibold">{language === "pt" ? subscaleLabel.pt : subscaleLabel.en}</h3>
        <p className="text-xs text-muted-foreground">{tl("Seção", "Section")} {currentSubscaleIndex + 1}/{totalSubscales}</p>
      </div>

      {/* Previous answer legend */}
      {previousAnswers && previousAnswers[currentQ.id] && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <div className="w-3 h-3 rounded border-2 border-dashed border-amber-400/70 bg-amber-50 dark:bg-amber-900/20 shrink-0" />
          <span>{tl("= Resposta da avaliação anterior", "= Previous assessment answer")}</span>
        </div>
      )}

      {/* Demo autofill: one click fills all questions visible on screen */}
      {demoMode && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-2">
          <p className="text-[11px] leading-snug text-amber-900 dark:text-amber-200">
            {tl(
              "Modo demonstração: clique para preencher esta seção com as respostas do caso simulado.",
              "Demo mode: click to fill this section with the simulated case answers.",
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg border-amber-400/60 text-amber-900 dark:text-amber-100 hover:bg-amber-100/60"
            onClick={() => {
              const mockForQ = autofillAnswers?.[currentQ.id] || {};
              setAllAnswers((prev) => {
                const merged = { ...(prev[currentQ.id] || {}) };
                for (const q of subscaleQuestions) {
                  const v = mockForQ[q.id];
                  merged[q.id] = typeof v === "number" ? v : (q.options[Math.floor(q.options.length / 2)]?.value ?? 0);
                }
                return { ...prev, [currentQ.id]: merged };
              });
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {tl("Preencher seção", "Fill section")}
          </Button>
        </div>
      )}

      {/* Questions */}
      <motion.div key={`${currentQ.id}-${currentSubscale}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

        {subscaleQuestions.map((question) => {
          const isODILike = currentQ.id === "odi" || currentQ.id === "ndi";
          const isSPADI = currentQ.id === "spadi" || currentQ.id === "psfs";
          const selectedValue = currentAnswers[question.id];
          const prevValue = previousAnswers?.[currentQ.id]?.[question.id];

          return (
            <div key={question.id} className="space-y-2">
              <p className="text-sm font-medium">{language === "pt" ? question.text_pt : question.text_en}</p>
              {currentQ.id === "psfs" && (
                <Input
                  value={activityLabels[question.id] || ""}
                  maxLength={80}
                  placeholder={tl("Ex.: carregar sacolas, ficar sentado 1h, correr", "E.g. carrying bags, sitting 1h, running")}
                  onChange={(e) => setActivityLabels((prev) => ({ ...prev, [question.id]: e.target.value }))}
                />
              )}
              {isODILike ? (
                <div className="space-y-1.5">
                  {question.options.map((opt) => {
                    const isPrev = prevValue !== undefined && prevValue === opt.value && selectedValue !== opt.value;
                    return (
                      <Card key={opt.value} className={`cursor-pointer transition-all ${selectedValue === opt.value ? "border-primary bg-primary/5" : isPrev ? "border-dashed border-amber-400/70 bg-amber-50/40 dark:bg-amber-900/10" : "border-border/50 hover:border-primary/30"}`} onClick={() => handleAnswer(question.id, opt.value)}>
                        <CardContent className="py-2 px-3">
                          <span className="text-xs">{language === "pt" ? opt.label_pt : opt.label_en}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : isSPADI ? (
                <div className="flex flex-wrap gap-1.5">
                  {question.options.map((opt) => {
                    const isPrev = prevValue !== undefined && prevValue === opt.value && selectedValue !== opt.value;
                    return (
                      <Button key={opt.value} variant={selectedValue === opt.value ? "default" : "outline"} size="sm" className={`w-9 h-9 p-0 rounded-lg text-xs ${isPrev ? "border-dashed border-amber-400/70 bg-amber-50/40 dark:bg-amber-900/10" : ""}`} onClick={() => handleAnswer(question.id, opt.value)}>
                        {opt.value}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {question.options.map((opt) => {
                    const isPrev = prevValue !== undefined && prevValue === opt.value && selectedValue !== opt.value;
                    return (
                      <Button key={opt.value} variant={selectedValue === opt.value ? "default" : "outline"} size="sm" className={`rounded-lg text-xs h-auto py-1.5 px-2 whitespace-normal text-center leading-tight ${isPrev ? "border-dashed border-amber-400/70 bg-amber-50/40 dark:bg-amber-900/10" : ""}`} onClick={() => handleAnswer(question.id, opt.value)}>
                        {language === "pt" ? opt.label_pt : opt.label_en}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack} className="gap-2 rounded-xl">
          <ChevronLeft className="h-4 w-4" /> {tl("Voltar", "Back")}
        </Button>
        <Button onClick={handleNext} disabled={!allSubscaleAnswered} className="gap-2 rounded-xl">
          {currentSubscaleIndex === totalSubscales - 1 && currentQIndex === totalQuestionnaires - 1
            ? tl("Ver Resultados", "View Results")
            : tl("Próximo", "Next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default QuestionnaireStep;
