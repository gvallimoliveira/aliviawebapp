import { motion } from "framer-motion";
import { History, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface DraftResumeBannerProps {
  updatedAt: Date;
  source: "local" | "cloud";
  onRestore: () => void;
  onDiscard: () => void;
}

const formatRelative = (date: Date, lang: string) => {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return lang === "pt" ? "agora mesmo" : lang === "es" ? "ahora mismo" : "just now";
  if (mins < 60) return lang === "pt" ? `há ${mins} min` : lang === "es" ? `hace ${mins} min` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "pt" ? `há ${hours}h` : lang === "es" ? `hace ${hours}h` : `${hours}h ago`;
  return date.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en");
};

const DraftResumeBanner = ({ updatedAt, source, onRestore, onDiscard }: DraftResumeBannerProps) => {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const isEs = language === "es";

  const title = isPt
    ? "Encontramos um rascunho não finalizado"
    : isEs
    ? "Encontramos un borrador sin terminar"
    : "We found an unfinished draft";

  const subtitle = isPt
    ? `Salvo ${formatRelative(updatedAt, language)}${source === "cloud" ? " (na nuvem)" : ""}.`
    : isEs
    ? `Guardado ${formatRelative(updatedAt, language)}${source === "cloud" ? " (en la nube)" : ""}.`
    : `Saved ${formatRelative(updatedAt, language)}${source === "cloud" ? " (cloud)" : ""}.`;

  const restoreLabel = isPt ? "Retomar" : isEs ? "Reanudar" : "Resume";
  const discardLabel = isPt ? "Descartar" : isEs ? "Descartar" : "Discard";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30 p-3 flex items-start gap-3"
    >
      <div className="shrink-0 mt-0.5">
        <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{title}</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{subtitle}</p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="h-7 rounded-lg gap-1 text-xs" onClick={onRestore}>
            <RotateCcw className="h-3 w-3" />
            {restoreLabel}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg gap-1 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={onDiscard}>
            <X className="h-3 w-3" />
            {discardLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DraftResumeBanner;
