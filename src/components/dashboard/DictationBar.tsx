import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDictation, appendDictated } from "@/hooks/useDictation";
import { Mic, Pause, Play, Square, X, Loader2 } from "lucide-react";
import { useState } from "react";

export type DictationTarget = "content" | "observation";

interface Props {
  /** Recebe o texto transcrito para o campo escolhido. */
  onAppend: (target: DictationTarget, appender: (current: string) => string) => void;
  /** Quando false, o seletor de destino não aparece (só evolução). */
  allowObservation?: boolean;
  className?: string;
}

const mmss = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

const DictationBar = ({ onAppend, allowObservation = true, className }: Props) => {
  const { language } = useLanguage();
  const [target, setTarget] = useState<DictationTarget>("content");
  const [error, setError] = useState<string | null>(null);

  const { state, seconds, pending, start, pause, resume, stop, cancel } = useDictation({
    language: language === "en" ? "en" : language === "es" ? "es" : "pt",
    onText: (text) => {
      setError(null);
      onAppend(target, (current) => appendDictated(current, text));
    },
    onError: (message) => setError(message),
  });

  const active = state !== "idle";

  return (
    <div className={cn("rounded-xl border border-border/60 bg-background/70 p-2 space-y-1.5", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {!active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[11px] rounded-lg"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setError(null); start(); }}
          >
            <Mic className="h-3.5 w-3.5" />
            Ditar
          </Button>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <span className={cn("h-2 w-2 rounded-full", state === "recording" ? "bg-destructive animate-pulse" : "bg-muted-foreground")} />
              {mmss(seconds)}
            </span>
            {state === "recording" ? (
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] rounded-lg"
                onMouseDown={(e) => e.preventDefault()} onClick={pause}>
                <Pause className="h-3.5 w-3.5" />
                Pausar
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] rounded-lg"
                onMouseDown={(e) => e.preventDefault()} onClick={resume}>
                <Play className="h-3.5 w-3.5" />
                Continuar
              </Button>
            )}
            <Button type="button" size="sm" className="h-7 gap-1.5 text-[11px] rounded-lg"
              onMouseDown={(e) => e.preventDefault()} onClick={stop}>
              <Square className="h-3.5 w-3.5" />
              Concluir
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-[11px] text-muted-foreground"
              onMouseDown={(e) => e.preventDefault()} onClick={cancel}>
              <X className="h-3.5 w-3.5" />
              Descartar
            </Button>
          </>
        )}

        {allowObservation && (
          <div className="flex items-center gap-1 ml-auto">
            {(["content", "observation"] as DictationTarget[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={target === key ? "secondary" : "ghost"}
                className="h-7 px-2 text-[10px] rounded-lg"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTarget(key)}
              >
                {key === "content" ? "Evolução" : "Observação"}
              </Button>
            ))}
          </div>
        )}
      </div>

      {pending > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Transcrevendo o que você falou…
        </p>
      )}
      {!pending && active && (
        <p className="text-[11px] text-muted-foreground">
          Fale normalmente — o texto aparece no campo {target === "content" ? "de evolução" : "de observação"} a cada pausa.
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
};

export default DictationBar;
