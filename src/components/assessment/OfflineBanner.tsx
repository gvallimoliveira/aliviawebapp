import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, CloudOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OfflineBannerProps {
  online: boolean;
  /** True when an AI step is queued waiting for reconnection. */
  pendingResume?: boolean;
}

/**
 * Slim banner shown above the assessment when the device is offline.
 * Uses semantic tokens — no raw colors.
 */
const OfflineBanner = ({ online, pendingResume }: OfflineBannerProps) => {
  const { language } = useLanguage();
  const tl = (pt: string, en: string, es: string) =>
    language === "pt" ? pt : language === "es" ? es : en;

  const show = !online || pendingResume;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/60 px-3 py-2.5 flex items-start gap-2.5"
          role="status"
          aria-live="polite"
        >
          {!online ? (
            <WifiOff className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          ) : (
            <CloudOff className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          )}
          <div className="text-xs leading-snug text-amber-900 dark:text-amber-100">
            <p className="font-semibold">
              {!online
                ? tl("Você está offline", "You're offline", "Estás sin conexión")
                : tl("Reenviando avaliação…", "Resending assessment…", "Reenviando evaluación…")}
            </p>
            <p className="opacity-90">
              {!online
                ? tl(
                    "Seu progresso está salvo. Pode continuar preenchendo — vamos enviar automaticamente quando a conexão voltar.",
                    "Your progress is saved. Keep going — we'll submit automatically when you're back online.",
                    "Tu progreso está guardado. Sigue completando — enviaremos automáticamente cuando vuelva la conexión."
                  )
                : tl(
                    "Conexão restaurada — finalizando o passo que ficou pendente.",
                    "Connection restored — finishing the pending step.",
                    "Conexión restaurada — finalizando el paso pendiente."
                  )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
