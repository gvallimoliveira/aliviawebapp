import { getAllRegions } from "@/components/assessment/painMapData";

export interface RegionalPainAssessment {
  id: string;
  created_at: string;
  pain_score?: number | null;
  pain_regions?: string[] | null;
  status?: string | null;
  anamnesis_data?: Record<string, unknown> | null;
}
export interface RegionalPainSeries {
  key: string;
  regionId: string;
  measurements: { date: string; score: number }[];
}
const validScore = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;

/** Explicit scores can be keyed by body-map id OR the chief complaint i18n key.
 * A global score shared by multiple regions remains global, never duplicated. */
export function buildRegionalPainEvolution(assessments: RegionalPainAssessment[]) {
  const usable = assessments.filter(a => (a.status === "completed" || a.status === "diagnosis_complete") && Number.isFinite(Date.parse(a.created_at)))
    .slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const series: RegionalPainSeries[] = [];
  const byId = new Map<string, RegionalPainSeries>();
  const points = usable.map(a => {
    const point: Record<string, string | number | null> = { date: a.created_at, assessmentId: a.id };
    const raw = a.anamnesis_data?.painScoresPerRegion ?? a.anamnesis_data?.pain_scores_per_region;
    const explicit = raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.entries(raw).filter((entry): entry is [string, number] => validScore(entry[1])) : [];
    const regions = [...new Set(a.pain_regions || [])];
    const values: [string, number][] = explicit.length ? explicit : validScore(a.pain_score)
      ? [[regions.length === 1 ? regions[0] : "general", a.pain_score]] : [];
    for (const [regionId, score] of values) {
      let item = byId.get(regionId);
      if (!item) {
        item = { key: `region${series.length}`, regionId, measurements: [] };
        byId.set(regionId, item);
        series.push(item);
      }
      item.measurements.push({ date: a.created_at, score });
      point[item.key] = score;
    }
    return point;
  });
  // Explicit nulls stop lines at assessments that did not measure this region.
  for (const point of points) for (const item of series) if (!(item.key in point)) point[item.key] = null;
  return { series, points: points.filter(p => series.some(s => p[s.key] != null)) };
}

export function regionalPainLabel(id: string, language: string, translate: (key: string) => string) {
  if (id === "general") return language === "pt" ? "Dor geral (sem medida regional)" : language === "es" ? "Dolor general (sin medida regional)" : "Overall pain (no regional score)";
  if (id.startsWith("anamnesis.complaint.")) return translate(id);
  const region = getAllRegions()[id];
  if (region) return language === "en" ? region.label_en : region.label_pt;
  return id.replace(/_/g, " ");
}