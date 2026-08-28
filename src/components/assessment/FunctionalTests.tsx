import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Check, X, Activity, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTestsForRegions, testCategories, type FunctionalTest } from "@/data/functionalTestsData";

export interface TestResult {
  testId: string;
  painful: boolean;
}

interface FunctionalTestsProps {
  painRegions: string[];
  onComplete: (results: TestResult[]) => void;
  onBack: () => void;
  hasQuestionnaires?: boolean;
  /** Etapa opcional (fluxos por link): mostra botão de pular. */
  optional?: boolean;
  onSkip?: () => void;
}

const categoryIcons: Record<string, string> = {
  mobility: "🔄",
  flexibility: "🤸",
  strength: "💪",
  stability: "⚖️",
  neurodynamic: "🧠",
  trigger_points: "📍",
};

const FunctionalTests = ({ painRegions, onComplete, onBack, hasQuestionnaires = false, optional = false, onSkip }: FunctionalTestsProps) => {
  const { t } = useLanguage();
  const tests = useMemo(() => getTestsForRegions(painRegions), [painRegions]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTest = tests[currentIndex];
  const totalTests = tests.length;
  const answeredCurrent = results.find((r) => r.testId === currentTest?.id);

  // Group tests by category for progress display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    tests.forEach((test) => {
      if (!counts[test.category]) counts[test.category] = { total: 0, done: 0 };
      counts[test.category].total++;
      if (results.find((r) => r.testId === test.id)) counts[test.category].done++;
    });
    return counts;
  }, [tests, results]);

  const handleAnswer = (painful: boolean) => {
    const updated = results.filter((r) => r.testId !== currentTest.id);
    updated.push({ testId: currentTest.id, painful });
    setResults(updated);

    // Auto-advance after answering
    if (currentIndex < totalTests - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
    }
  };

  const handleFinish = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onComplete(results);
  };

  const allAnswered = results.length === totalTests;

  if (totalTests === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-12">
        <Activity className="h-16 w-16 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold text-foreground">{t("ftest.no_tests_title")}</h2>
        <p className="text-muted-foreground">{t("ftest.no_tests_desc")}</p>
        <Button onClick={() => (onSkip ? onSkip() : onComplete([]))} className="rounded-xl">{t("ftest.continue")}</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t("ftest.title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("ftest.subtitle")}</p>
        {optional && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t("ftest.skip_optional")}
          </button>
        )}
        {hasQuestionnaires && (
          <Alert className="mt-3 rounded-xl border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-muted-foreground">
              {t("ftest.questionnaire_overlap_notice")}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Category progress pills */}
      <div className="flex flex-wrap gap-2">
        {testCategories
          .filter((cat) => categoryCounts[cat])
          .map((cat) => {
            const c = categoryCounts[cat];
            const isActive = currentTest?.category === cat;
            return (
              <Badge
                key={cat}
                variant={isActive ? "default" : "outline"}
                className="gap-1 text-xs rounded-full"
              >
                <span>{categoryIcons[cat]}</span>
                {t(`ftest.category.${cat}`)}
                <span className="opacity-70">{c.done}/{c.total}</span>
              </Badge>
            );
          })}
      </div>

      {/* Global progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("ftest.test")} {currentIndex + 1}/{totalTests}</span>
          <span>{Math.round((results.length / totalTests) * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${(results.length / totalTests) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Test Card */}
      {currentTest && (
        <motion.div key={currentTest.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* Test name + category */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>{categoryIcons[currentTest.category]}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t(`ftest.category.${currentTest.category}`)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{t(currentTest.nameKey)}</h3>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{t(currentTest.instructionKey)}</p>
              </div>

              {/* Video search link */}
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentTest.searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {t("ftest.watch_video")}
              </a>

              {/* Binary answer */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("ftest.question")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  <Button
                    variant={answeredCurrent?.painful === true ? "default" : "outline"}
                    className="h-auto min-h-12 w-full py-3 px-3 rounded-xl gap-2 whitespace-normal text-center leading-snug"
                    onClick={() => handleAnswer(true)}
                  >
                    <X className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">{t("ftest.painful")}</span>
                  </Button>
                  <Button
                    variant={answeredCurrent?.painful === false ? "default" : "outline"}
                    className="h-auto min-h-12 w-full py-3 px-3 rounded-xl gap-2 whitespace-normal text-center leading-snug"
                    onClick={() => handleAnswer(false)}
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">{t("ftest.no_pain")}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={currentIndex === 0 ? onBack : () => setCurrentIndex(currentIndex - 1)}
          className="gap-2 rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("anamnesis.back")}
        </Button>

        {currentIndex < totalTests - 1 ? (
          <Button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            disabled={!answeredCurrent}
            className="gap-2 rounded-xl"
          >
            {t("anamnesis.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={!allAnswered || isSubmitting}
            className="gap-2 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("ftest.finish_tests")}
              </>
            ) : (
              <>
                {t("ftest.finish_tests")}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default FunctionalTests;
