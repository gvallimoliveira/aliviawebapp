import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";

interface Props { clinicId: string; }

interface BenchRow {
  metric: string;
  clinic_value: number | null;
  peer_avg: number | null;
  peer_count: number;
  size_bucket: string;
  better_when_lower: boolean;
  small_avg: number | null;
  small_count: number;
  medium_avg: number | null;
  medium_count: number;
  large_avg: number | null;
  large_count: number;
}

const MIN_PEERS = 5;

const metricLabel = (m: string, lang: string) => {
  const map: Record<string, { pt: string; en: string; es: string; unit: string }> = {
    no_show_rate: { pt: "Taxa de não-comparecimento", en: "No-show rate", es: "Tasa de no presentación", unit: "%" },
    occupancy: { pt: "Taxa de ocupação", en: "Occupancy rate", es: "Ocupación", unit: "%" },
    assessments_per_therapist: { pt: "Avaliações por terapeuta/mês", en: "Assessments per therapist/month", es: "Evaluaciones por terapeuta/mes", unit: "" },
  };
  const e = map[m];
  if (!e) return { label: m, unit: "" };
  return { label: (e as any)[lang] || e.en, unit: e.unit };
};

const BenchmarkCard = ({ clinicId }: Props) => {
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_clinic_benchmarks" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const sizeBucket = rows[0]?.size_bucket ?? "small";
  const bucketLabel = (b: "small" | "medium" | "large") =>
    lang === "pt"
      ? b === "small" ? "Pequeno (1-3)" : b === "medium" ? "Médio (4-10)" : "Grande (11+)"
      : lang === "es"
      ? b === "small" ? "Pequeño (1-3)" : b === "medium" ? "Mediano (4-10)" : "Grande (11+)"
      : b === "small" ? "Small (1-3)" : b === "medium" ? "Medium (4-10)" : "Large (11+)";

  const buckets: ("small" | "medium" | "large")[] = ["small", "medium", "large"];

  const description =
    lang === "pt"
      ? "Compare sua clínica com pares por porte. Dados 100% anônimos."
      : lang === "es"
      ? "Compara tu clínica con pares por tamaño. Datos 100% anónimos."
      : "Compare your clinic with peers by size. Fully anonymous.";

  return (
    <InsightCardShell
      id="benchmark"
      icon={<Award className="h-4 w-4 text-primary" />}
      title={lang === "pt" ? "Benchmark anônimo" : lang === "es" ? "Benchmark anónimo" : "Anonymous benchmark"}
      description={description}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Sem dados ainda." : "No data yet."}
          </p>
        ) : (
          rows.map((r) => {
            const { label, unit } = metricLabel(r.metric, lang);
            const cv = r.clinic_value;
            const renderBucket = (b: "small" | "medium" | "large") => {
              const avg = b === "small" ? r.small_avg : b === "medium" ? r.medium_avg : r.large_avg;
              const cnt = b === "small" ? r.small_count : b === "medium" ? r.medium_count : r.large_count;
              const isMine = b === sizeBucket;
              const locked = cnt < MIN_PEERS;
              const delta = cv != null && avg != null ? cv - avg : null;
              const isBetter = delta != null && (r.better_when_lower ? delta < 0 : delta > 0);
              const isWorse = delta != null && (r.better_when_lower ? delta > 0 : delta < 0);
              return (
                <div
                  key={b}
                  className={`p-2 rounded-md border text-center ${
                    isMine
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/60 bg-background"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    {bucketLabel(b)}
                  </p>
                  {locked ? (
                    <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      <span className="text-xs">—</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold tabular-nums mt-0.5">
                        {Number(avg).toFixed(1)}{unit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">n={cnt}</p>
                      {isMine && delta != null && (
                        <p className={`text-[10px] font-medium mt-0.5 ${isBetter ? "text-emerald-700" : isWorse ? "text-amber-700" : "text-muted-foreground"}`}>
                          {isBetter ? "✓" : isWorse ? "↑" : "—"} {Math.abs(delta).toFixed(1)}{unit === "%" ? "pp" : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            };
            return (
              <div key={r.metric} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{label}</p>
                  {cv != null && (
                    <Badge variant="outline" className="text-xs">
                      {lang === "pt" ? "Você" : "You"}: <span className="font-bold ml-1">{Number(cv).toFixed(1)}{unit}</span>
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {buckets.map(renderBucket)}
                </div>
              </div>
            );
          })
        )}
        <p className="text-[10px] text-muted-foreground text-center">
          {lang === "pt"
            ? `Buckets com menos de ${MIN_PEERS} clínicas ficam ocultos para preservar anonimato.`
            : `Buckets with fewer than ${MIN_PEERS} clinics are hidden for anonymity.`}
        </p>
      </div>
    </InsightCardShell>
  );
};

export default BenchmarkCard;
