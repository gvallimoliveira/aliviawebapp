import { motion } from "framer-motion";
import { ShieldAlert, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  flaggedItems: Record<string, boolean>;
  professionalName?: string;
  onContinue: () => void;
  onEnd: () => void;
}

const RedFlagContinueScreen = ({ flaggedItems, professionalName, onContinue, onEnd }: Props) => {
  const { t, language } = useLanguage();

  const positiveFlags = Object.entries(flaggedItems)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const isPt = language === "pt";
  const isEs = language === "es";

  const title = isPt
    ? "Atenção — sinal de alerta detectado"
    : isEs
      ? "Atención — señal de alerta detectada"
      : "Attention — warning sign detected";

  const intro = isPt
    ? `Identificamos um ou mais sinais que exigem acompanhamento médico. ${professionalName ? `${professionalName} ` : "O profissional responsável "}será avisado e poderá orientá-lo(a) sobre os próximos passos.`
    : isEs
      ? `Identificamos una o más señales que requieren seguimiento médico. ${professionalName ? `${professionalName} ` : "El profesional responsable "}será avisado y le orientará sobre los próximos pasos.`
      : `We identified one or more signs that require medical follow-up. ${professionalName ? `${professionalName} ` : "Your professional "}will be notified and can guide you on next steps.`;

  const continueExplain = isPt
    ? "Você pode prosseguir com a avaliação para que o profissional tenha um quadro completo. A hipótese fisioterapêutica ficará marcada como “sob ressalva” até liberação médica."
    : isEs
      ? "Puede continuar la evaluación para que el profesional tenga un cuadro completo. La hipótesis quedará marcada como “con reserva” hasta liberación médica."
      : "You can continue the assessment so your professional gets a complete picture. The physiotherapy hypothesis will be marked “pending medical clearance.”";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-xl w-full border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="py-8 px-6 sm:px-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200">{title}</h2>
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80 mt-1">{intro}</p>
            </div>
          </div>

          {positiveFlags.length > 0 && (
            <div className="rounded-lg border border-amber-300/60 bg-white/60 dark:bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-amber-700 mb-2">
                {isPt ? "Sinais marcados" : isEs ? "Señales marcadas" : "Flagged items"}
              </p>
              <ul className="space-y-1.5">
                {positiveFlags.map((key) => (
                  <li key={key} className="text-sm flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-foreground/80">{continueExplain}</p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={onContinue} size="lg" className="flex-1 gap-2 rounded-xl">
              {isPt ? "Continuar avaliação" : isEs ? "Continuar evaluación" : "Continue assessment"}
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={onEnd} size="lg" variant="outline" className="flex-1 gap-2 rounded-xl">
              <XCircle className="h-4 w-4" />
              {isPt ? "Encerrar agora" : isEs ? "Finalizar ahora" : "End now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RedFlagContinueScreen;
