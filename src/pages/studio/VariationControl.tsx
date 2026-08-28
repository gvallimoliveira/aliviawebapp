import { useMemo, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyLexicon, type VoiceRegister } from "./lexicon";
import {
  VARIATION_LEVELS,
  intensityFor,
  type VariationLevel,
  type VariationProfile,
} from "./variation";

type VariationKey = keyof VariationProfile;

const ROWS: { key: VariationKey; label: string; sample: string }[] = [
  { key: "headlines", label: "Títulos", sample: "Clareza gera resultado" },
  { key: "support", label: "Textos de apoio", sample: "Um processo claro transforma cuidado em resultado" },
  { key: "actions", label: "Chamadas e legendas", sample: "Comece agora e descubra um caminho melhor" },
];

type Props = {
  value: VariationProfile;
  onChange: (value: VariationProfile) => void;
  register: VoiceRegister;
  previewSeed: string;
  compact?: boolean;
};

const VariationControl = ({ value, onChange, register, previewSeed, compact = false }: Props) => {
  const [open, setOpen] = useState(false);
  const examples = useMemo(
    () =>
      Object.fromEntries(
        ROWS.map((row) => [
          row.key,
          applyLexicon(row.sample, {
            register,
            seed: `${previewSeed}:preview:${row.key}:${value[row.key]}`,
            intensity: intensityFor(value[row.key]),
          }),
        ]),
      ) as Record<VariationKey, string>,
    [previewSeed, register, value],
  );

  return (
    <div className={compact ? "" : "mt-2"}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 rounded-full px-2 text-[11px]"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Languages className="h-3.5 w-3.5" />
        Variação linguística
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="mt-2 grid gap-3 rounded-2xl border border-border bg-muted/30 p-3 text-left">
          {ROWS.map((row) => (
            <div key={row.key} className="grid gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-start">
              <p className="pt-1 text-[11px] font-semibold text-foreground">{row.label}</p>
              <div>
                <div className="flex flex-wrap gap-1">
                  {VARIATION_LEVELS.map((level) => (
                    <Button
                      key={level.id}
                      type="button"
                      size="sm"
                      variant={value[row.key] === level.id ? "secondary" : "ghost"}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                      onClick={() => onChange({ ...value, [row.key]: level.id as VariationLevel })}
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 rounded-md bg-background px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Exemplo: “{examples[row.key]}”
                </p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">A prévia é local e não consome gerações.</p>
        </div>
      )}
    </div>
  );
};

export default VariationControl;