import { motion } from "framer-motion";
import { Heart, ClipboardList, Stethoscope, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeStepProps {
  mode: "basic" | "premium";
  onContinue: () => void;
}

const WelcomeStep = ({ mode, onContinue }: WelcomeStepProps) => {
  const { language } = useLanguage();
  const isPt = language === "pt";

  const estimatedTime = mode === "premium"
    ? (isPt ? "5 a 8 minutos" : "5 to 8 minutes")
    : (isPt ? "3 minutos" : "3 minutes");

  const steps = mode === "premium"
    ? [
        {
          icon: <ClipboardList className="h-5 w-5 text-primary" />,
          text: isPt ? "Triagem de segurança rápida" : "Quick safety screening",
        },
        {
          icon: <Stethoscope className="h-5 w-5 text-primary" />,
          text: isPt ? "Anamnese, questionários e testes funcionais" : "Anamnesis, questionnaires & functional tests",
        },
        {
          icon: <Activity className="h-5 w-5 text-primary" />,
          text: isPt ? "Diagnóstico detalhado + plano de tratamento" : "Detailed diagnosis + treatment plan",
        },
      ]
    : [
        {
          icon: <ClipboardList className="h-5 w-5 text-primary" />,
          text: isPt ? "Triagem de segurança rápida" : "Quick safety screening",
        },
        {
          icon: <Stethoscope className="h-5 w-5 text-primary" />,
          text: isPt ? "Perguntas sobre sua dor" : "Questions about your pain",
        },
        {
          icon: <Activity className="h-5 w-5 text-primary" />,
          text: isPt ? "Diagnóstico inicial" : "Initial diagnosis",
        },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center py-8 space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Heart className="h-8 w-8 text-primary" />
      </motion.div>

      <div className="space-y-3 max-w-md">
        <h2 className="text-2xl font-bold text-foreground">
          {isPt ? "Vamos entender sua dor juntos" : "Let's understand your pain together"}
        </h2>
        <p className="text-muted-foreground">
          {isPt
            ? `São apenas ${estimatedTime}. Vamos guiar você por algumas etapas simples.`
            : `It only takes ${estimatedTime}. We'll guide you through a few simple steps.`}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-left"
          >
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              {s.icon}
            </div>
            <span className="text-sm text-foreground">{s.text}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button onClick={onContinue} size="lg" className="rounded-xl gap-2 px-8">
          {isPt ? "Começar avaliação" : "Start assessment"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeStep;
