import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Stethoscope, Activity, ArrowRight, Loader2, Mail, User, AlertCircle, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logoAlivia from "@/assets/logo-alivia.png";
import { logConsent } from "@/lib/consentLog";


const CONSENT_KEY = "alivia_self_assessment_consent_v1";

export interface WelcomeStepProps {
  mode: "basic" | "premium" | "professional";
  professionalName?: string;
  clinicLogoUrl?: string | null;
  clinicName?: string;
  onContinue: (data?: { email?: string; name?: string }) => void;
  /**
   * Optional callback to reset the entire assessment from scratch.
   * When provided, a "Restart self-assessment" button is shown below the
   * primary CTA so users who walked back from a later step (or whose draft
   * was auto-restored) can intentionally start over.
   */
  onRestart?: () => void;
  /** LGPD consent scope for professional/clinic links, e.g. "clinic:<id>". Omit to skip (demo). */
  consentScopeRef?: string;
  consentType?: "professional_link_assessment" | "clinic_link_assessment";
  consentSubjectEmail?: string | null;
  consentSubjectName?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WelcomeStep = ({ mode, professionalName, clinicLogoUrl, clinicName, onContinue, onRestart, consentScopeRef, consentType, consentSubjectEmail, consentSubjectName }: WelcomeStepProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isPt = language === "pt";
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const showClinicLogo = !!clinicLogoUrl && failedLogoUrl !== clinicLogoUrl;
  // Only patient self-assessments require the explicit consent.
  // Professional/clinic flows already have a clinical responsible party.
  const isLinkConsent = mode === "professional" && !!consentScopeRef;
  const requiresConsent = mode === "basic" || mode === "premium" || isLinkConsent;
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const needsEmail = mode === "basic" && !user;

  const handleContinue = () => {
    if (requiresConsent && !consent) {
      setConsentError(true);
      return;
    }
    if (needsEmail) {
      let hasError = false;
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName) {
        setNameError(isPt ? "Informe seu nome para continuar" : "Enter your name to continue");
        hasError = true;
      } else {
        setNameError("");
      }
      if (!trimmedEmail) {
        setEmailError(isPt ? "Informe seu e-mail para continuar" : "Enter your email to continue");
        hasError = true;
      } else if (!EMAIL_RE.test(trimmedEmail)) {
        setEmailError(isPt ? "E-mail inválido" : "Invalid email");
        hasError = true;
      } else {
        setEmailError("");
      }
      if (hasError) return;
    }
    if (requiresConsent) {
      try {
        localStorage.setItem(
          CONSENT_KEY,
          JSON.stringify({ ts: new Date().toISOString(), mode, lang: language }),
        );
      } catch { /* storage may be unavailable */ }
      // Registro auditável do consentimento (LGPD, art. 8º §1º)
      void logConsent(isLinkConsent ? {
        consentType: consentType ?? "professional_link_assessment",
        subjectEmail: consentSubjectEmail || null,
        subjectName: consentSubjectName || null,
        scopeRef: consentScopeRef,
      } : {
        consentType: "self_assessment",
        subjectEmail: email.trim() || null,
        subjectName: name.trim() || null,
        scopeRef: mode,
      });
    }

    setIsTransitioning(true);
    setTimeout(() => onContinue(needsEmail ? { email: email.trim(), name: name.trim() } : undefined), 600);
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
          text: isPt ? "Hipótese preliminar detalhada + plano de tratamento" : "Detailed preliminary hypothesis + treatment plan",
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
          text: isPt ? "Hipótese preliminar inicial" : "Initial preliminary hypothesis",
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
          className={showClinicLogo
            ? "w-48 h-28 flex items-center justify-center"
            : "w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center p-2"}
        >
          <img
            src={showClinicLogo ? clinicLogoUrl ?? logoAlivia : logoAlivia}
            alt={showClinicLogo ? clinicName || professionalName || "Clínica" : "Aliv.iA"}
            onError={showClinicLogo ? () => setFailedLogoUrl(clinicLogoUrl ?? null) : undefined}
            className={showClinicLogo ? "h-full w-full object-contain" : "h-14 w-14 object-contain"}
          />
        </motion.div>

        <div className="space-y-3 max-w-md">
          <h2 className={`text-2xl font-bold ${clinicName ? "text-[hsl(var(--clinic-ink))]" : "text-foreground"}`}>
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
              className={`flex items-center gap-3 p-3 rounded-xl text-left ${clinicName ? "bg-primary/5 border border-primary/20 border-l-4 border-l-primary" : "bg-muted/50"}`}
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                {s.icon}
              </div>
              <span className="text-sm text-foreground">{s.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Focus warning for poly-complaint patients */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm flex items-start gap-3 p-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/15 dark:border-amber-700/50 text-left"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-snug">
            {language === "pt"
              ? "Se você tem mais de uma queixa de dor, foque nas mais relevantes ou que começaram nos últimos 12 meses. Dores antigas e sem relação direta podem confundir a análise."
              : language === "es"
              ? "Si tienes más de una queja de dolor, enfócate en las más relevantes o que comenzaron en los últimos 12 meses. Dolores antiguos sin relación directa pueden confundir el análisis."
              : "If you have more than one pain complaint, focus on the most relevant ones or those that started within the last 12 months. Old, unrelated pains may confuse the analysis."}
          </p>
        </motion.div>

        {/* Name + Email capture for basic assessments (non-logged users) */}
        {needsEmail && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-sm space-y-3"
          >
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={isPt ? "Seu nome" : "Your name"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  className="pl-10"
                  autoComplete="name"
                />
              </div>
              {nameError && (
                <p className="text-xs text-destructive text-left">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
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
            </div>
            <p className="text-xs text-muted-foreground">
              {isPt
                ? "Usaremos apenas para identificar seu resultado. Você poderá compartilhá-lo via WhatsApp."
                : "We'll only use it to identify your result. You can share it via WhatsApp."}
            </p>
          </motion.div>
        )}

        {requiresConsent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="w-full max-w-sm space-y-2"
          >
            <label
              htmlFor="self-assess-consent"
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                consentError
                  ? "border-destructive bg-destructive/5"
                  : "border-border bg-muted/40 hover:bg-muted/60"
              }`}
            >
              <Checkbox
                id="self-assess-consent"
                checked={consent}
                onCheckedChange={(v) => {
                  setConsent(v === true);
                  if (v === true) setConsentError(false);
                }}
                className="mt-0.5"
              />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {isLinkConsent
                    ? (language === "es"
                      ? "Consentimiento para datos de salud (LGPD)"
                      : language === "en"
                      ? "Health data consent (LGPD)"
                      : "Consentimento para dados de saúde (LGPD)")
                    : language === "es"
                    ? "Reconozco que es una autoevaluación"
                    : language === "en"
                    ? "I acknowledge this is a self-assessment"
                    : "Reconheço que esta é uma autoavaliação"}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {isLinkConsent
                    ? (language === "es"
                      ? `Autorizo de forma específica y destacada que ${professionalName || "el profesional"} y Aliv.iA traten mis datos de salud (dolor, historial, condiciones y respuestas) solo para esta evaluación y mi atención. Puedo revocar este consentimiento en cualquier momento.`
                      : language === "en"
                      ? `I specifically authorize ${professionalName || "the professional"} and Aliv.iA to process my health data (pain, history, conditions and answers) only for this assessment and my care. I may revoke this consent at any time.`
                      : `Autorizo, de forma específica e destacada, que ${professionalName || "o profissional"} e o Aliv.iA tratem meus dados de saúde (dor, histórico, condições e respostas) apenas para esta avaliação e meu atendimento. Posso revogar este consentimento a qualquer momento.`)
                    : language === "es"
                    ? "Yo mismo respondo el cuestionario, guiado por el método del app. El resultado no es un diagnóstico médico ni sustituye una consulta presencial. En caso de emergencia, llamaré al 192 (SAMU)."
                    : language === "en"
                    ? "I am answering this questionnaire myself, guided by the app's method. The result is not a medical diagnosis and does not replace an in-person consultation. In an emergency, I will call 192 (SAMU — Brazil)."
                    : "Eu mesmo(a) respondo este questionário, guiado(a) pelo método do app. O resultado não é diagnóstico médico nem substitui consulta presencial. Em caso de emergência, ligarei 192 (SAMU)."}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {language === "es"
                    ? "Autorizo el tratamiento de mis datos de salud para esta evaluación, según la "
                    : language === "en"
                    ? "I authorize the processing of my health data for this assessment, per the "
                    : "Autorizo o tratamento dos meus dados de saúde para esta avaliação, conforme a "}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {language === "es"
                      ? "Política de Privacidad"
                      : language === "en"
                      ? "Privacy Policy"
                      : "Política de Privacidade"}
                  </a>
                  .
                </p>

              </div>
            </label>
            {consentError && (
              <p className="text-xs text-destructive text-left">
                {language === "es"
                  ? "Marca el consentimiento para continuar."
                  : language === "en"
                  ? "Please confirm the consent to continue."
                  : "Marque o consentimento para continuar."}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            onClick={handleContinue}
            disabled={isTransitioning || (requiresConsent && !consent)}
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
                {isPt ? "Começar autoavaliação" : "Start self-assessment"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {onRestart && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRestart}
              disabled={isTransitioning}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {language === "es"
                ? "Reiniciar autoevaluación"
                : language === "en"
                ? "Restart self-assessment"
                : "Recomeçar autoavaliação"}
            </Button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeStep;

