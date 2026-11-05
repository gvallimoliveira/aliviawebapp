import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PhysioTechIcon } from "@/components/PhysioTechShortcut";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string; exam_type: string; exam_title: string | null; exam_date: string | null;
  conclusion: string | null; metrics: any; images: any; pdf_url: string | null;
}
const LABEL: Record<string, string> = { termografia: "Termografia", ultrassom: "Ultrassom", ressonancia: "Ressonância" };

/** Exames complementares recebidos do PhysioTech (bloco clínico). Oculto quando não há laudos. */
const PhysioTechReportsSection = ({ patientId }: { patientId?: string | null }) => {
  const [rows, setRows] = useState<Report[]>([]);
  useEffect(() => {
    if (!patientId) return;
    let alive = true;
    supabase.from("physiotech_reports").select("*").eq("patient_id", patientId)
      .order("exam_date", { ascending: false }).limit(20)
      .then(({ data }) => { if (alive) setRows((data as Report[]) || []); });
    return () => { alive = false; };
  }, [patientId]);

  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PhysioTechIcon /> Exames complementares (PhysioTech)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const m = r.metrics || {};
          const imgs: string[] = Array.isArray(r.images) ? r.images : [];
          return (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{LABEL[r.exam_type] || r.exam_type}</Badge>
                <span className="text-sm font-medium text-foreground">{r.exam_title}</span>
                {r.exam_date && <span className="text-xs text-muted-foreground">{new Date(r.exam_date).toLocaleDateString("pt-BR")}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {m.tqi != null && <Badge variant="outline">TQI {m.tqi}</Badge>}
                {m.temperatureGradient != null && <Badge variant="outline">ΔT {m.temperatureGradient} °C</Badge>}
                {m.classification && <Badge variant="outline">{m.classification}</Badge>}
              </div>
              {r.conclusion && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.conclusion}</p>}
              {imgs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {imgs.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt="Imagem do exame" className="h-20 w-20 rounded-md object-cover border border-border" />
                    </a>
                  ))}
                </div>
              )}
              {r.pdf_url && (
                <a href={r.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Abrir laudo original
                </a>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
export default PhysioTechReportsSection;
