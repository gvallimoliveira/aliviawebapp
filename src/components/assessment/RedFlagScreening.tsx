import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface RedFlagScreeningProps {
  onPass: () => void;
  onFlagged: () => void;
}

const RedFlagScreening = ({ onPass, onFlagged }: RedFlagScreeningProps) => {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});

  const questions = [
    "redflags.trauma",
    "redflags.weight_loss",
    "redflags.fever",
    "redflags.sphincter",
    "redflags.night_pain",
    "redflags.cancer",
    "redflags.numbness_progressive",
    "redflags.recent_surgery",
  ];

  const handleAnswer = (key: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const allAnswered = questions.every((q) => answers[q] !== undefined && answers[q] !== null);
  const hasRedFlag = Object.values(answers).some((v) => v === true);

  const handleContinue = () => {
    if (hasRedFlag) {
      onFlagged();
    } else {
      onPass();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-sm font-medium text-destructive">
          <ShieldAlert className="h-4 w-4" />
          {t("redflags.title")}
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          {t("redflags.subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((key, i) => (
          <Card key={key} className="border-border/50">
            <CardContent className="flex items-center justify-between py-4 px-5 gap-4">
              <span className="text-sm font-medium text-foreground flex-1">
                {i + 1}. {t(key)}
              </span>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={answers[key] === true ? "destructive" : "outline"}
                  onClick={() => handleAnswer(key, true)}
                  className="min-w-[60px]"
                >
                  {t("redflags.yes")}
                </Button>
                <Button
                  size="sm"
                  variant={answers[key] === false ? "default" : "outline"}
                  onClick={() => handleAnswer(key, false)}
                  className="min-w-[60px]"
                >
                  {t("redflags.no")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!allAnswered}
          className="gap-2 rounded-xl px-8"
        >
          {t("redflags.continue")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default RedFlagScreening;
