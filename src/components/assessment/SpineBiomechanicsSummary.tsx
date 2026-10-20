import SpineMaigneStar from "./SpineMaigneStar";
import { Badge } from "@/components/ui/badge";
import { emptyStar, evaluateSpine, type SpineBiomechanicsData } from "@/lib/spineBiomechanics";

export default function SpineBiomechanicsSummary({ data, date }: { data: SpineBiomechanicsData; date: string }) {
  const h = evaluateSpine(data);
  const region = data.region === "cervical" ? "Cervical" : data.region === "thoracic" ? "Torácica" : data.region === "lumbar" ? "Lombar" : "";
  return <section className="space-y-2 border-t border-border pt-3">
    <h3 className="text-sm font-semibold text-foreground">Estrela de Maigne</h3>
    <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString("pt-BR")} · {[region, data.level].filter(Boolean).join(" · ")}</p>
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div className="shrink-0"><SpineMaigneStar value={data.star || emptyStar()} size={200} /></div>
      <div className="min-w-0 space-y-2 text-xs text-foreground">
        {h.label && <Badge className="whitespace-normal">Hipótese biomecânica: {h.label}</Badge>}
        {h.summary && <p className="leading-relaxed">{h.summary}</p>}
        {data.notes && <p className="whitespace-pre-wrap break-words">{data.notes}</p>}
        <p className="text-muted-foreground">Hipótese clínica revisável; não substitui red flags nem exame neurológico.</p>
      </div>
    </div>
  </section>;
}