import { useState } from "react";
import { ChevronDown, ChevronUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SpineMaigneStar from "./SpineMaigneStar";
import {
  emptyStar, evaluateSpine, fryetteApplies, hasSpineContent,
  type PalpBehavior, type SpineBiomechanicsData,
} from "@/lib/spineBiomechanics";

interface Props {
  value: SpineBiomechanicsData;
  onChange: (v: SpineBiomechanicsData) => void;
  cervical: boolean;
  thoracolumbar: boolean;
}

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}
  >
    {children}
  </button>
);

const SpineBiomechanicsSection = ({ value, onChange, cervical, thoracolumbar }: Props) => {
  const [open, setOpen] = useState(hasSpineContent(value));
  const region = value.region ?? (thoracolumbar ? "lumbar" : cervical ? "cervical" : null);
  const data = { ...value, region, star: value.star || emptyStar(), palpation: value.palpation || {} };
  const set = (patch: Partial<SpineBiomechanicsData>) => onChange({ ...data, ...patch });
  const setPalp = (k: "neutral" | "extension" | "flexion", v: any) =>
    set({ palpation: { ...data.palpation, [k]: data.palpation[k] === v ? null : v } });
  const h = evaluateSpine(data);
  const fry = fryetteApplies(region);

  const behaviors: { v: PalpBehavior; l: string }[] = [
    { v: "levels", l: "Nivela (indolor)" },
    { v: "worsens", l: "Acentua (dor/limitação)" },
    { v: "unchanged", l: "Sem alteração" },
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3" data-spine-biomechanics>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Activity className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Biomecânica da coluna (opcional)</p>
            <p className="text-[11px] text-muted-foreground">
              Estrela de Maigne e teste palpatório das 3 posições (Fryette — torácica e lombar).
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="ml-1 text-xs">{open ? "Recolher" : "Abrir"}</span>
        </Button>
      </div>

      {open && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Região:</span>
            <Chip on={region === "cervical"} onClick={() => set({ region: "cervical" })}>Cervical</Chip>
            <Chip on={region === "thoracic"} onClick={() => set({ region: "thoracic" })}>Torácica</Chip>
            <Chip on={region === "lumbar"} onClick={() => set({ region: "lumbar" })}>Lombar</Chip>
            <Input
              value={data.level || ""}
              onChange={(e) => set({ level: e.target.value })}
              placeholder="Nível (ex.: L4–L5)"
              className="h-8 w-36 text-xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <SpineMaigneStar value={data.star} onChange={(star) => set({ star })} size={220} />
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Toque em cada eixo para marcar dor/bloqueio: 1, 2 ou 3 traços. Um quarto toque volta a livre.
            </p>
          </div>

          {fry ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Teste palpatório dos processos transversos</p>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs w-24 text-muted-foreground">1. Neutro:</span>
                <Chip on={data.palpation.neutral === "right"} onClick={() => setPalp("neutral", "right")}>Transverso D posterior</Chip>
                <Chip on={data.palpation.neutral === "left"} onClick={() => setPalp("neutral", "left")}>Transverso E posterior</Chip>
                <Chip on={data.palpation.neutral === "none"} onClick={() => setPalp("neutral", "none")}>Nivelados</Chip>
              </div>
              {(["extension", "flexion"] as const).map((k, i) => (
                <div key={k} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs w-24 text-muted-foreground">{i + 2}. {k === "extension" ? "Extensão:" : "Flexão:"}</span>
                  {behaviors.map((b) => (
                    <Chip key={b.v} on={data.palpation[k] === b.v} onClick={() => setPalp(k, b.v)}>{b.l}</Chip>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Na cervical, as leis de Fryette não se aplicam da mesma forma (C0–C2 e uncovertebrais); registre só a Estrela.
            </p>
          )}

          {(h.label || h.mechanism) && (
            <div className="rounded-md border bg-background p-3 space-y-1">
              {h.label && <Badge>Hipótese biomecânica: {h.label}</Badge>}
              {h.mechanism && <p className="text-xs text-foreground">{h.mechanism}</p>}
              {h.painBehavior && <p className="text-xs text-muted-foreground">{h.painBehavior}</p>}
              {h.confidence === "moderate" && (
                <p className="text-[11px] text-muted-foreground">Sustentada pela palpação; marque a Estrela para confirmar.</p>
              )}
              <p className="text-[11px] text-muted-foreground">Hipótese clínica revisável; não substitui red flags nem exame neurológico.</p>
            </div>
          )}

          <Textarea
            value={data.notes || ""}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
            placeholder="Observações do exame segmentar (opcional)"
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
};

export default SpineBiomechanicsSection;
