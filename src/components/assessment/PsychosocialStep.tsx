// Optional psychosocial (yellow flags) step — FABQ-Brasil, applied inside the
// reassessment link flow when the professional enables the "psychosocial" step.
// Not tied to a body region: it profiles fear-avoidance beliefs.

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getSpecialtyQuestionnaire,
  scoreSpecialtyQuestionnaire,
  type SpecQScoreResult,
} from "@/data/specialtyQuestionnaires";

export interface PsychosocialStepResult {
  questionnaireId: string;
  questionnaireName: string;
  domain: "psychosocial" | "spine";
  answers: Record<string, number>;
  score: SpecQScoreResult;
}

interface Props {
  /** Called once every queued instrument was answered or skipped. */
  onComplete: (results: PsychosocialStepResult[]) => void;
  onBack: () => void;
  /** Instruments applied in sequence. Defaults to the full FABQ-Brasil. */
  questionnaireIds?: string[];
}

/** Instruments the professional made mandatory (no skip button). */
const MANDATORY = new Set(["srs22r"]);

const PsychosocialStep = ({ onComplete, onBack, questionnaireIds = ["fabq_brasil"] }: Props) => {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const tl = (pt: string, en: string) => (isPt ? pt : en);

  const [qIdx, setQIdx] = useState(0);
  const [collected, setCollected] = useState<PsychosocialStepResult[]>([]);
  const q = getSpecialtyQuestionnaire(questionnaireIds[qIdx]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);

  if (!q) return null;
  const isSpine = q.domain === "spine";

  const advance = (result?: PsychosocialStepResult) => {
    const all = result ? [...collected, result] : collected;
    if (qIdx < questionnaireIds.length - 1) {
      setCollected(all);
      setQIdx((i) => i + 1);
      setAnswers({});
      setIndex(0);
      window.scrollTo({ top: 0 });
      return;
    }
    onComplete(all);
  };

  const item = q.items[index];
  const total = q.items.length;
  const progress = ((index + (answers[item.id] != null ? 1 : 0)) / total) * 100;

  const select = (value: number) => {
    const next = { ...answers, [item.id]: value };
    setAnswers(next);
    if (index < total - 1) {
      setTimeout(() => setIndex((i) => i + 1), 180);
      return;
    }
    const score = scoreSpecialtyQuestionnaire(q.id, next);
    if (!score) return;
    setTimeout(
      () =>
        advance({
          questionnaireId: q.id,
          questionnaireName: q.name,
          domain: isSpine ? "spine" : "psychosocial",
          answers: next,
          score,
        }),
      180,
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 mx-auto">
          <HeartHandshake className="h-6 w-6 text-violet-500" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {isSpine
            ? tl("Questionário de escoliose (SRS-22r)", "Scoliosis questionnaire (SRS-22r)")
            : tl("Como você se sente em relação ao movimento", "How you feel about movement")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isSpine
            ? tl(
                "Não existe resposta certa ou errada. Escolha a opção que melhor descreve como você está.",
                "There is no right or wrong answer. Choose the option that best describes how you are.",
              )
            : tl(
                "Não existe resposta certa ou errada. Marque o quanto você concorda com cada frase, pensando na sua dor atual.",
                "There is no right or wrong answer. Mark how much you agree with each statement, thinking about your current pain.",
              )}
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {index + 1} / {total}
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 md:p-6 space-y-4">
          <p className="text-base font-medium text-foreground leading-snug">
            {isPt ? item.text_pt : item.text_en}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {(item.options || []).map((op) => {
              const active = answers[item.id] === op.value;
              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => select(op.value)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                    active ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted/50"
                  }`}
                >
                  {isPt ? op.label_pt : op.label_en}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="rounded-xl gap-1"
          onClick={() => (index > 0 ? setIndex((i) => i - 1) : qIdx === 0 ? onBack() : (setQIdx((i) => i - 1), setCollected((c) => c.slice(0, -1)), setAnswers({}), setIndex(0)))}
        >
          <ChevronLeft className="h-4 w-4" />
          {tl("Voltar", "Back")}
        </Button>
        {!MANDATORY.has(q.id) && (
          <Button variant="outline" className="rounded-xl gap-1" onClick={() => advance()}>
            {tl("Pular esta etapa", "Skip this step")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default PsychosocialStep;
