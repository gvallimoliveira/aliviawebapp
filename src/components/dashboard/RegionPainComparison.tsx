import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus, MapPin } from "lucide-react";
import { regionsByView } from "@/components/assessment/painMapData";

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

// Authoritative PT labels built from the pain map data (covers every region id
// rendered by the assessment SVGs — front/back/left/right views).
const REGION_LABELS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const view of Object.values(regionsByView)) {
    for (const r of view) {
      if (!out[r.id]) out[r.id] = r.label_pt;
    }
  }
  return out;
})();

// Human-readable fallback: "right_thigh_post" → "Coxa Post. Dir."
const SEGMENT_PT: Record<string, string> = {
  right: "Dir.", left: "Esq.",
  post: "Post.", posterior: "Post.",
  ant: "Ant.", anterior: "Ant.",
  lat: "Lat.", lateral: "Lat.", medial: "Medial",
  thigh: "Coxa", calf: "Panturrilha", shin: "Canela",
  knee: "Joelho", ankle: "Tornozelo", foot: "Pé",
  hip: "Quadril", gluteal: "Glúteo", hamstring: "Post. Coxa",
  quadriceps: "Ant. Coxa",
  shoulder: "Ombro", elbow: "Cotovelo", forearm: "Antebraço",
  arm: "Braço", wrist: "Punho", hand: "Mão",
  head: "Cabeça", neck: "Pescoço", cervical: "Cervical",
  thoracic: "Torácica", lumbar: "Lombar",
  lower: "Lombar", upper: "Torácica", back: "Costas",
  chest: "Tórax", abdomen: "Abdômen",
};

const prettifyId = (id: string): string => {
  const parts = id.split("_").filter(Boolean);
  const mapped = parts.map((p) => SEGMENT_PT[p] ?? (p.charAt(0).toUpperCase() + p.slice(1)));
  return mapped.join(" ");
};

// Group bilateral regions into a single "anatomical zone".
const ZONE_OF: Record<string, string> = {
  head: "Cabeça", head_back: "Cabeça",
  neck: "Pescoço", cervical: "Cervical (posterior)", cervical_front: "Pescoço (anterior)",
  thoracic: "Coluna Torácica", upper_back: "Coluna Torácica",
  lower_back: "Lombar", chest: "Tórax", abdomen: "Abdômen",
  right_shoulder: "Ombros", left_shoulder: "Ombros",
  right_shoulder_back: "Ombros", left_shoulder_back: "Ombros",
  right_arm: "Braços", left_arm: "Braços",
  right_arm_back: "Braços", left_arm_back: "Braços",
  right_elbow: "Cotovelos", left_elbow: "Cotovelos",
  right_elbow_back: "Cotovelos", left_elbow_back: "Cotovelos",
  right_forearm: "Antebraços", left_forearm: "Antebraços",
  right_forearm_back: "Antebraços", left_forearm_back: "Antebraços",
  right_wrist: "Punhos", left_wrist: "Punhos",
  right_hand: "Mãos", left_hand: "Mãos",
  right_hand_back: "Mãos", left_hand_back: "Mãos",
  right_hip: "Quadril", left_hip: "Quadril",
  right_knee: "Joelhos", left_knee: "Joelhos",
  right_knee_back: "Joelhos", left_knee_back: "Joelhos",
  right_ankle: "Tornozelos", left_ankle: "Tornozelos",
  right_ankle_back: "Tornozelos", left_ankle_back: "Tornozelos",
  right_foot: "Pés", left_foot: "Pés",
  right_foot_back: "Pés", left_foot_back: "Pés",
  right_gluteal: "Glúteos", left_gluteal: "Glúteos",
  right_hamstring: "Posterior Coxa", left_hamstring: "Posterior Coxa",
  right_thigh_post: "Posterior Coxa", left_thigh_post: "Posterior Coxa",
  right_quadriceps: "Anterior Coxa", left_quadriceps: "Anterior Coxa",
  right_thigh_ant: "Anterior Coxa", left_thigh_ant: "Anterior Coxa",
  right_thigh: "Coxa", left_thigh: "Coxa",
  right_shin: "Canelas", left_shin: "Canelas",
  right_calf: "Panturrilhas", left_calf: "Panturrilhas",
};

const labelFor = (regionId: string) => REGION_LABELS[regionId] || prettifyId(regionId);
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
