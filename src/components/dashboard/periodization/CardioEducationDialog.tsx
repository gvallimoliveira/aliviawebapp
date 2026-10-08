import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CARDIO_PROFILES } from "@/lib/cardioSafety";
import { CARDIO_EDUCATION } from "@/lib/cardioEducation";
import { profileGoal, CARDIO_REFERENCES } from "@/lib/cardioAnalysis";

export default function CardioEducationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Informações educativas cardiovasculares" title="Informações educativas cardiovasculares">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 text-left">
          <DialogTitle className="leading-snug tracking-normal">Guia de intensidade cardiovascular</DialogTitle>
          <DialogDescription>Perfis, escalas de esforço e referências para individualizar o treino.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Públicos e referências iniciais do app</h3>
            <div className="divide-y divide-border">
              {CARDIO_PROFILES.map((rule) => (
                <div key={rule.key} className="py-2">
                  <p className="font-medium text-foreground">{rule.label} · {Math.round(rule.ceilingPct * 100)}% da FC máxima estimada</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profileGoal(rule.key).intensity}. {profileGoal(rule.key).weekly}.</p>
                </div>
              ))}
            </div>
          </section>
          {CARDIO_EDUCATION.map(({ title, text }) => (
            <section key={title} className="space-y-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
            </section>
          ))}
          <details className="border-t border-border pt-3 text-xs">
            <summary className="cursor-pointer font-medium text-foreground">Referências científicas</summary>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-muted-foreground">{CARDIO_REFERENCES.map((ref) => <li key={ref}>{ref}</li>)}</ul>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}