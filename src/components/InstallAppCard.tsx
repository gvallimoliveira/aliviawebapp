import { useEffect, useState } from "react";
import { Smartphone, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import InstallAppGuide from "./InstallAppGuide";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Use a localStorage key to persist dismissal (e.g. dashboard). Omit to never persist. */
  dismissKey?: string;
  /** Start expanded instead of collapsed. */
  defaultOpen?: boolean;
  /** Hide entirely if already installed as PWA. Default true. */
  hideIfStandalone?: boolean;
  variant?: "default" | "subtle";
}

const COPY = {
  pt: { title: "Use o Aliv.iA como app no celular", sub: "Adicione um atalho na tela inicial em segundos.", show: "Ver passo a passo", hide: "Ocultar passos", dismiss: "Não mostrar novamente" },
  en: { title: "Use Aliv.iA as an app on your phone", sub: "Add a home-screen shortcut in seconds.", show: "Show steps", hide: "Hide steps", dismiss: "Don't show again" },
  es: { title: "Usa Aliv.iA como app en tu móvil", sub: "Añade un acceso directo a la pantalla de inicio en segundos.", show: "Ver paso a paso", hide: "Ocultar pasos", dismiss: "No mostrar de nuevo" },
};

const InstallAppCard = ({ dismissKey, defaultOpen = false, hideIfStandalone = true, variant = "default" }: Props) => {
  const { language } = useLanguage();
  const t = COPY[language as "pt" | "en" | "es"] || COPY.pt;
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (dismissKey && typeof localStorage !== "undefined") {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, [dismissKey]);

  if (dismissed) return null;
  if (hideIfStandalone && isStandalone) return null;

  const handleDismiss = () => {
    if (dismissKey && typeof localStorage !== "undefined") {
      localStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  };

  return (
    <Card className={variant === "subtle" ? "p-4 bg-muted/30 border-dashed" : "p-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>
        </div>
        {dismissKey && (
          <button onClick={handleDismiss} aria-label={t.dismiss} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="gap-1.5">
          {open ? <><ChevronUp className="h-3.5 w-3.5" /> {t.hide}</> : <><ChevronDown className="h-3.5 w-3.5" /> {t.show}</>}
        </Button>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <InstallAppGuide compact />
        </div>
      )}
    </Card>
  );
};

export default InstallAppCard;
