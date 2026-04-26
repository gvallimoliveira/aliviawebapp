import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus, MapPin } from "lucide-react";

interface Assessment {
  id: string;
  created_at: string;
  pain_score: number | null;
  pain_regions: string[] | null;
  anamnesis_data?: any;
  status?: string;
  type?: string;
}

interface Props {
  assessments: Assessment[];
}

const REGION_LABELS: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço",
  right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
  upper_back: "Coluna Torácica", lower_back: "Lombar", chest: "Tórax",
  right_elbow: "Cotovelo D.", left_elbow: "Cotovelo E.",
  right_wrist: "Punho D.", left_wrist: "Punho E.",
  right_hand: "Mão D.", left_hand: "Mão E.",
  right_hip: "Quadril D.", left_hip: "Quadril E.",
  right_knee: "Joelho D.", left_knee: "Joelho E.",
  right_ankle: "Tornozelo D.", left_ankle: "Tornozelo E.",
  right_foot: "Pé D.", left_foot: "Pé E.",
  right_gluteal: "Glúteo D.", left_gluteal: "Glúteo E.",
  right_hamstring: "Posterior Coxa D.", left_hamstring: "Posterior Coxa E.",
  right_quadriceps: "Anterior Coxa D.", left_quadriceps: "Anterior Coxa E.",
  right_calf: "Panturrilha D.", left_calf: "Panturrilha E.",
  abdomen: "Abdômen",
};

// Group bilateral regions into a single "anatomical zone".
const ZONE_OF: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço", upper_back: "Coluna Torácica",
  lower_back: "Lombar", chest: "Tórax", abdomen: "Abdômen",
  right_shoulder: "Ombros", left_shoulder: "Ombros",
  right_elbow: "Cotovelos", left_elbow: "Cotovelos",
  right_wrist: "Punhos", left_wrist: "Punhos",
  right_hand: "Mãos", left_hand: "Mãos",
  right_hip: "Quadril", left_hip: "Quadril",
  right_knee: "Joelhos", left_knee: "Joelhos",
  right_ankle: "Tornozelos", left_ankle: "Tornozelos",
  right_foot: "Pés", left_foot: "Pés",
  right_gluteal: "Glúteos", left_gluteal: "Glúteos",
  right_hamstring: "Posterior Coxa", left_hamstring: "Posterior Coxa",
  right_quadriceps: "Anterior Coxa", left_quadriceps: "Anterior Coxa",
  right_calf: "Panturrilhas", left_calf: "Panturrilhas",
};

const labelFor = (regionId: string) => REGION_LABELS[regionId] || regionId;
const zoneOf = (regionId: string) => ZONE_OF[regionId] || labelFor(regionId);

interface ZoneRow {
  zone: string;
  firstScore: number | null;
  latestScore: number | null;
  firstDate: string;
  latestDate: string;
  diff: number | null;
}

const RegionPainComparison = ({ assessments }: Props) => {
  const rows = useMemo<ZoneRow[]>(() => {
    // Only completed (or diagnosis_complete) assessments with regions
    const usable = assessments
      .filter((a) =>
        (a.status === "completed" || a.status === "diagnosis_complete") &&
        Array.isArray(a.pain_regions) && a.pain_regions.length > 0
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (usable.length < 1) return [];

    const scoreFor = (a: Assessment, zone: string): number | null => {
      const perRegion = a.anamnesis_data?.painScoresPerRegion || a.anamnesis_data?.pain_scores_per_region;
      if (perRegion && typeof perRegion === "object") {
        const matches: number[] = [];
        for (const [k, v] of Object.entries(perRegion)) {
          if (zoneOf(k) === zone && typeof v === "number") matches.push(v);
        }
        if (matches.length > 0) {
          return Math.round(matches.reduce((s, n) => s + n, 0) / matches.length);
        }
      }
      const present = (a.pain_regions || []).some((r) => zoneOf(r) === zone);
      return present ? a.pain_score ?? null : null;
    };

    const allZones = new Set<string>();
    usable.forEach((a) => (a.pain_regions || []).forEach((r) => allZones.add(zoneOf(r))));

    const out: ZoneRow[] = [];
    allZones.forEach((zone) => {
      const containing = usable.filter((a) =>
        (a.pain_regions || []).some((r) => zoneOf(r) === zone)
      );
      if (containing.length === 0) return;

      const firstA = containing[0];
      const latestA = containing[containing.length - 1];
      const f = scoreFor(firstA, zone);
      const l = containing.length > 1 ? scoreFor(latestA, zone) : null;
      const diff = containing.length > 1 && f != null && l != null ? f - l : null;

      out.push({
        zone,
        firstScore: f,
        latestScore: containing.length > 1 ? l : f,
        firstDate: firstA.created_at,
        latestDate: latestA.created_at,
        diff,
      });
    });

    // Order: most improved first, then worsened, then stable, then unmeasured
    return out.sort((a, b) => {
      const ad = a.diff ?? -999;
      const bd = b.diff ?? -999;
      return bd - ad;
    });
  }, [assessments]);

  if (rows.length === 0) return null;

  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Comparação de Dor por Região
        </CardTitle>
        <CardDescription className="text-xs">
          Evolução por zona anatômica entre a primeira e a última avaliação que registrou cada região
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => {
          const improved = row.diff != null && row.diff > 0;
          const worsened = row.diff != null && row.diff < 0;
          const stable = row.diff != null && row.diff === 0;

          return (
            <div
              key={row.zone}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
              title={
                row.diff != null
                  ? `${fmt(row.firstDate)} → ${fmt(row.latestDate)}`
                  : `Registrada em ${fmt(row.firstDate)}`
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{row.zone}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {row.diff != null ? (
                  <>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {row.firstScore ?? "—"}/10
                    </span>
                    <span className="text-muted-foreground/50">→</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {row.latestScore ?? "—"}/10
                    </span>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[10px] border-0 ${
                        improved
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : worsened
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {improved ? <ArrowDown className="h-3 w-3" /> :
                        worsened ? <ArrowUp className="h-3 w-3" /> :
                        <Minus className="h-3 w-3" />}
                      {improved ? `−${row.diff}` : worsened ? `+${Math.abs(row.diff)}` : "0"}
                    </Badge>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {row.firstScore ?? "—"}/10
                    </span>
                    <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground">
                      única medição
                    </Badge>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default RegionPainComparison;
