import { Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const labels = { pt: "Português", en: "English", es: "Español" };

export default function LanguageSelector({ className, onSelected }: { className?: string; onSelected?: () => void }) {
  const { language, selectLanguage } = useLanguage();
  const [pending, setPending] = useState(false);
  const select = async (value: string) => {
    if (value !== "pt" && value !== "en" && value !== "es") return;
    setPending(true);
    try {
      await selectLanguage(value as Language);
      onSelected?.();
    } finally {
      setPending(false);
    }
  };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className={className} disabled={pending} aria-label={language === "pt" ? "Selecionar idioma" : language === "es" ? "Seleccionar idioma" : "Select language"}>
        <Globe className="h-4 w-4" />{labels[language]}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup value={language} onValueChange={value => { void select(value); }}>
        {Object.entries(labels).map(([value, label]) => <DropdownMenuRadioItem key={value} value={value} disabled={pending}>{label}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}