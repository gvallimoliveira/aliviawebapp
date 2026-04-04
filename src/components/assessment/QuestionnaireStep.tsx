import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, ClipboardCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getApplicableQuestionnaires,
  calculateQuestionnaireScore,
  type QuestionnaireDefinition,
  type QuestionnaireResult,
} from "@/data/questionnaireData";

interface QuestionnaireStepProps {
  painRegions: string[];
  onComplete: (results: QuestionnaireResult[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

const QuestionnaireStep = ({ painRegions, onComplete, onBack, onSkip }: QuestionnaireStepProps) => {
  const { language } = useLanguage();
  const tl = (pt: string, en: string) => (language === "pt" ? pt : en);

  const applicableQuestionnaires = useMemo(
    () => getApplicableQuestionnaires(painRegions),
    [painRegions]
  );

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentSubscaleIndex, setCurrentSubscaleIndex] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<QuestionnaireResult[]>([]);
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
        <p className="text-muted-foreground">
          {tl("Não há questionários específicos para as regiões selecionadas.", "No specific questionnaires for the selected regions.")}
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
  const allSubscaleAnswered = subscaleQuestions.every((q) => currentAnswers[q.id] !== undefined);
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
      const result = calculateQuestionnaireScore(currentQ, allAnswers[currentQ.id] || {});
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

      {/* Questionnaire header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {language === "pt" ? currentQ.fullName_pt : currentQ.fullName_en}
        </div>
        <p className="text-xs text-muted-foreground">{language === "pt" ? currentQ.description_pt : currentQ.description_en}</p>
      </div>

      {/* Subscale header */}
      <div>
        <h3 className="text-lg font-semibold">{language === "pt" ? subscaleLabel.pt : subscaleLabel.en}</h3>
        <p className="text-xs text-muted-foreground">{tl("Seção", "Section")} {currentSubscaleIndex + 1}/{totalSubscales}</p>
      </div>

      {/* Questions */}
      <motion.div key={`${currentQ.id}-${currentSubscale}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
        {subscaleQuestions.map((question) => {
          const isODILike = currentQ.id === "odi" || currentQ.id === "ndi";
          const isSPADI = currentQ.id === "spadi";
          const selectedValue = currentAnswers[question.id];

          return (
            <div key={question.id} className="space-y-2">
              <p className="text-sm font-medium">{language === "pt" ? question.text_pt : question.text_en}</p>
              {isODILike ? (
                <div className="space-y-1.5">
                  {question.options.map((opt) => (
                    <Card key={opt.value} className={`cursor-pointer transition-all ${selectedValue === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => handleAnswer(question.id, opt.value)}>
                      <CardContent className="py-2 px-3">
                        <span className="text-xs">{language === "pt" ? opt.label_pt : opt.label_en}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isSPADI ? (
                <div className="flex flex-wrap gap-1.5">
                  {question.options.map((opt) => (
                    <Button key={opt.value} variant={selectedValue === opt.value ? "default" : "outline"} size="sm" className="w-9 h-9 p-0 rounded-lg text-xs" onClick={() => handleAnswer(question.id, opt.value)}>
                      {opt.value}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {question.options.map((opt) => (
                    <Button key={opt.value} variant={selectedValue === opt.value ? "default" : "outline"} size="sm" className="rounded-lg text-xs h-auto py-1.5 px-2.5 flex-1 min-w-[60px]" onClick={() => handleAnswer(question.id, opt.value)}>
                      {language === "pt" ? opt.label_pt : opt.label_en}
                    </Button>
                  ))}
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
