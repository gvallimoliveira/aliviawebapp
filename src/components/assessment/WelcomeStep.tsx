import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Stethoscope, Activity, ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logoAlivia from "@/assets/logo-alivia.png";

export interface WelcomeStepProps {
  mode: "basic" | "premium" | "professional";
  professionalName?: string;
  onContinue: (email?: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WelcomeStep = ({ mode, professionalName, onContinue }: WelcomeStepProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isPt = language === "pt";
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const needsEmail = mode === "basic" && !user;

  const handleContinue = () => {
    if (needsEmail) {
      const trimmed = email.trim();
      if (!trimmed) {
        setEmailError(isPt ? "Informe seu e-mail para continuar" : "Enter your email to continue");
        return;
      }
      if (!EMAIL_RE.test(trimmed)) {
        setEmailError(isPt ? "E-mail inválido" : "Invalid email");
        return;
      }
      setEmailError("");
    }
    setIsTransitioning(true);
    setTimeout(() => onContinue(needsEmail ? email.trim() : undefined), 600);
  };

  const estimatedTime = mode === "premium"
    ? (isPt ? "5 a 8 minutos" : "5 to 8 minutes")
    : mode === "professional"
    ? (isPt ? "5 a 7 minutos" : "5 to 7 minutes")
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
    : mode === "professional"
    ? [
        {
          icon: <ClipboardList className="h-5 w-5 text-primary" />,
          text: isPt ? "Triagem de segurança rápida" : "Quick safety screening",
        },
        {
          icon: <Stethoscope className="h-5 w-5 text-primary" />,
          text: isPt ? "Anamnese completa e mapa de dor" : "Complete anamnesis and pain map",
        },
        {
          icon: <Activity className="h-5 w-5 text-primary" />,
          text: isPt ? "Questionários validados e hipótese preliminar" : "Validated questionnaires and preliminary hypothesis",
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isTransitioning ? { opacity: 0, y: -30, scale: 0.96 } : { opacity: 1, y: 0 }}
        transition={{ duration: isTransitioning ? 0.5 : 0.5, ease: "easeInOut" }}
        className="flex flex-col items-center text-center py-8 space-y-8"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isTransitioning ? { scale: 1.2, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={{ delay: isTransitioning ? 0 : 0.2, duration: 0.4 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center p-2"
        >
          <img src={logoAlivia} alt="Aliv.iA" className="h-14 w-14 object-contain" />
        </motion.div>

        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "professional" && professionalName
              ? (isPt ? `Avaliação pré-consulta com ${professionalName}` : `Pre-consultation assessment with ${professionalName}`)
              : (isPt ? "Vamos entender sua dor juntos" : "Let's understand your pain together")}
          </h2>
          <p className="text-muted-foreground">
            {mode === "professional"
              ? (isPt
                ? `São apenas ${estimatedTime}. Suas respostas serão enviadas diretamente ao seu fisioterapeuta para uma avaliação mais assertiva.`
                : `It only takes ${estimatedTime}. Your answers will be sent directly to your physiotherapist for a more accurate assessment.`)
              : (isPt
                ? `São apenas ${estimatedTime}. Vamos guiar você por algumas etapas simples.`
                : `It only takes ${estimatedTime}. We'll guide you through a few simple steps.`)}
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={isTransitioning ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
              transition={{ delay: isTransitioning ? i * 0.05 : 0.3 + i * 0.15 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-left"
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                {s.icon}
              </div>
              <span className="text-sm text-foreground">{s.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Email capture for basic assessments (non-logged users) */}
        {needsEmail && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-sm space-y-2"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={isPt ? "Seu melhor e-mail" : "Your best email"}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                className="pl-10"
                autoComplete="email"
              />
            </div>
            {emailError && (
              <p className="text-xs text-destructive text-left">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {isPt
                ? "Usaremos apenas para identificar seu resultado. Você poderá compartilhá-lo via WhatsApp."
                : "We'll only use it to identify your result. You can share it via WhatsApp."}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={handleContinue}
            disabled={isTransitioning}
            size="lg"
            className="rounded-xl gap-2 px-8 transition-all duration-300"
          >
            {isTransitioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPt ? "Preparando..." : "Preparing..."}
              </>
            ) : (
              <>
                {isPt ? "Começar avaliação" : "Start assessment"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeStep;
