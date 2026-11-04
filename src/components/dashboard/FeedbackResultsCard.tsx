import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart3, Loader2, Star, ThumbsUp, ThumbsDown, Download, FileText, TrendingUp } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const SERVICE_LABELS: Record<string, string> = {
  fisioterapia: "Fisio",
  pilates: "Pilates",
  osteopatia: "Osteopatia",
  massoterapia: "Massot.",
  rpg: "RPG",
};

const SERVICE_COLORS: Record<string, string> = {
  fisioterapia: "bg-teal-100 text-teal-800",
  pilates: "bg-purple-100 text-purple-800",
  osteopatia: "bg-orange-100 text-orange-800",
  massoterapia: "bg-pink-100 text-pink-800",
  rpg: "bg-indigo-100 text-indigo-800",
};

interface FeedbackResultsCardProps {
  clinicId: string;
  lang: "pt" | "en" | "es";
}

const exportToCSV = (feedbacks: any[], lang: string) => {
  const headers = [
    "Data", "Paciente", "Email", "Serviço",
    "Qualidade", "Resultado", "Recomenda",
    "Comunicação", "Pontualidade", "Empatia",
    "Limpeza", "Agendamento", "Ambiente",
    "Obs. Serviço", "Obs. Profissional", "Obs. Clínica", "Obs. Gerais",
  ];
  const rows = feedbacks.map((f) => {
    const sa = (f.service_answers || {}) as any;
    const pa = (f.professional_answers || {}) as any;
    const ca = (f.clinic_answers || {}) as any;
    return [
      new Date(f.created_at).toLocaleDateString("pt-BR"),
      f.patient_name || "",
      f.patient_email || "",
      SERVICE_LABELS[f.service_type] || f.service_type,
      sa.quality || "", sa.result || "", sa.recommend || "",
      pa.communication || "", pa.punctuality || "", pa.empathy || "",
      ca.cleanliness || "", ca.scheduling || "", ca.environment || "",
      sa.observations || "", pa.observations || "", ca.observations || "",
      f.general_observations || "",
    ].map((v) => {
      const cell = String(v);
      const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feedbacks_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const escHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

const exportToPDF = (feedbacks: any[], nps: number, recommends: number, detractors: number) => {
  // Generate a printable HTML and use window.print
  const rows = feedbacks.map((f) => {
    const sa = (f.service_answers || {}) as any;
    const pa = (f.professional_answers || {}) as any;
    const ca = (f.clinic_answers || {}) as any;
    return `<tr>
      <td>${escHtml(new Date(f.created_at).toLocaleDateString("pt-BR"))}</td>
      <td>${escHtml(f.patient_name || "Anônimo")}</td>
      <td>${escHtml(SERVICE_LABELS[f.service_type] || f.service_type)}</td>
      <td>${escHtml(sa.quality || "-")}</td>
      <td>${escHtml(sa.recommend || "-")}</td>
      <td>${escHtml(pa.communication || "-")}</td>
      <td>${escHtml(ca.cleanliness || "-")}</td>
      <td>${escHtml(f.general_observations ? String(f.general_observations).slice(0, 60) : "-")}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Relatório de Feedback</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      h1{font-size:18px;margin-bottom:4px}
      .summary{display:flex;gap:30px;margin:12px 0}
      .metric{text-align:center}
      .metric .val{font-size:28px;font-weight:bold}
      .metric .lbl{font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;font-size:11px}
      th{background:#f5f5f5}
    </style>
  </head><body>
    <h1>Relatório de Feedback da Clínica</h1>
    <p style="color:#666;font-size:11px">Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${feedbacks.length} respostas</p>
    <div class="summary">
      <div class="metric"><div class="val" style="color:${nps >= 0 ? "#059669" : "#ef4444"}">${Number(nps) || 0}</div><div class="lbl">NPS</div></div>
      <div class="metric"><div class="val" style="color:#059669">${Number(recommends) || 0}</div><div class="lbl">Promotores</div></div>
      <div class="metric"><div class="val" style="color:#ef4444">${Number(detractors) || 0}</div><div class="lbl">Detratores</div></div>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Paciente</th><th>Serviço</th><th>Qualidade</th><th>Recomenda</th><th>Comunicação</th><th>Limpeza</th><th>Observações</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
};

const FeedbackResultsCard = ({ clinicId, lang }: FeedbackResultsCardProps) => {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    supabase
      .from("clinic_feedback_surveys")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setFeedbacks(data || []);
        setLoading(false);
      });
  }, [clinicId]);

  const filtered = serviceFilter === "all" ? feedbacks : feedbacks.filter((f) => f.service_type === serviceFilter);

  const recommends = filtered.filter((f) => (f.service_answers as any)?.recommend === "sim").length;
  const detractors = filtered.filter((f) => (f.service_answers as any)?.recommend === "nao").length;
  const nps = filtered.length > 0 ? Math.round(((recommends - detractors) / filtered.length) * 100) : 0;

  const qualityCounts: Record<string, number> = {};
  filtered.forEach((f) => {
    const q = (f.service_answers as any)?.quality;
    if (q) qualityCounts[q] = (qualityCounts[q] || 0) + 1;
  });

  const activeServices = [...new Set(feedbacks.map((f) => f.service_type))];

  const trendData = useMemo(() => {
    if (filtered.length < 2) return [];
    const byMonth: Record<string, { total: number; promoters: number; detractors: number; excellent: number; good: number }> = {};
    filtered.forEach((f) => {
      const d = new Date(f.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { total: 0, promoters: 0, detractors: 0, excellent: 0, good: 0 };
      byMonth[key].total++;
      const rec = (f.service_answers as any)?.recommend;
      if (rec === "sim") byMonth[key].promoters++;
      if (rec === "nao") byMonth[key].detractors++;
      const q = (f.service_answers as any)?.quality;
      if (q === "excelente") byMonth[key].excellent++;
      if (q === "bom") byMonth[key].good++;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: month.slice(5) + "/" + month.slice(2, 4),
        nps: d.total > 0 ? Math.round(((d.promoters - d.detractors) / d.total) * 100) : 0,
        satisfaction: d.total > 0 ? Math.round(((d.excellent + d.good) / d.total) * 100) : 0,
        total: d.total,
      }));
  }, [filtered]);

  // NPS comparison by service
  const SERVICE_BAR_COLORS: Record<string, string> = {
    fisioterapia: "#0d9488",
    pilates: "#7c3aed",
    osteopatia: "#ea580c",
    massoterapia: "#db2777",
    rpg: "#4f46e5",
  };

  const serviceComparisonData = useMemo(() => {
    if (feedbacks.length < 2) return [];
    const byService: Record<string, { total: number; promoters: number; detractors: number; satisfaction: number }> = {};
    feedbacks.forEach((f) => {
      const svc = f.service_type;
      if (!byService[svc]) byService[svc] = { total: 0, promoters: 0, detractors: 0, satisfaction: 0 };
      byService[svc].total++;
      const rec = (f.service_answers as any)?.recommend;
      if (rec === "sim") byService[svc].promoters++;
      if (rec === "nao") byService[svc].detractors++;
      const q = (f.service_answers as any)?.quality;
      if (q === "excelente" || q === "bom") byService[svc].satisfaction++;
    });
    return Object.entries(byService)
      .filter(([, d]) => d.total >= 1)
      .map(([svc, d]) => ({
        service: SERVICE_LABELS[svc] || svc,
        serviceKey: svc,
        nps: Math.round(((d.promoters - d.detractors) / d.total) * 100),
        satisfaction: Math.round((d.satisfaction / d.total) * 100),
        total: d.total,
      }))
      .sort((a, b) => b.nps - a.nps);
  }, [feedbacks]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">
              {lang === "pt" ? "Resultados de Feedback" : "Feedback Results"}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">{filtered.length} respostas</Badge>
        </div>

        {/* Service filter */}
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              {lang === "pt" ? "Todos os serviços" : "All services"}
            </SelectItem>
            {activeServices.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {SERVICE_LABELS[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {lang === "pt" ? "Nenhum feedback recebido ainda." : "No feedback received yet."}
          </p>
        ) : (
          <>
            {/* Export buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs flex-1"
                onClick={() => {
                  exportToCSV(filtered, lang);
                  toast({ title: lang === "pt" ? "CSV exportado!" : "CSV exported!" });
                }}
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs flex-1"
                onClick={() => exportToPDF(filtered, nps, recommends, detractors)}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>

            {/* NPS score */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className={`text-2xl font-bold ${nps >= 0 ? "text-emerald-600" : "text-red-500"}`}>{nps}</p>
                <p className="text-[10px] text-muted-foreground">NPS</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-lg font-bold text-emerald-600">{recommends}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Promotores</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-lg font-bold text-red-500">{detractors}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Detratores</p>
              </div>
            </div>

            {/* Trend Charts */}
            {trendData.length >= 2 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {lang === "pt" ? "Tendência mensal" : "Monthly trend"}
                  </p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} domain={[-100, 100]} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === "nps" ? "NPS" : lang === "pt" ? "Satisfação" : "Satisfaction",
                        ]}
                        labelFormatter={(label) => `${lang === "pt" ? "Mês" : "Month"}: ${label}`}
                      />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={(value) =>
                          value === "nps" ? "NPS" : lang === "pt" ? "Satisfação (Bom+Excelente)" : "Satisfaction"
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="nps"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="satisfaction"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4">
                  {trendData.map((d) => (
                    <div key={d.month} className="text-center">
                      <p className="text-[9px] text-muted-foreground">{d.month}</p>
                      <p className="text-[9px] text-muted-foreground">{d.total} resp.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NPS Comparison by Service */}
            {serviceComparisonData.length >= 2 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {lang === "pt" ? "NPS por serviço" : "NPS by service"}
                  </p>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceComparisonData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="service" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[-100, 100]} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === "nps" ? "NPS" : lang === "pt" ? "Satisfação" : "Satisfaction",
                        ]}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => v === "nps" ? "NPS" : lang === "pt" ? "Satisfação" : "Satisfaction"} />
                      <Bar dataKey="nps" radius={[4, 4, 0, 0]}>
                        {serviceComparisonData.map((entry) => (
                          <Cell key={entry.serviceKey} fill={SERVICE_BAR_COLORS[entry.serviceKey] || "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                      <Bar dataKey="satisfaction" radius={[4, 4, 0, 0]} fill="#10b981" opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 flex-wrap">
                  {serviceComparisonData.map((d) => (
                    <Badge key={d.serviceKey} variant="outline" className="text-[9px] gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: SERVICE_BAR_COLORS[d.serviceKey] || "hsl(var(--primary))" }} />
                      {d.service}: {d.total} resp.
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(qualityCounts).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {lang === "pt" ? "Qualidade do atendimento" : "Service quality"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(qualityCounts).map(([key, count]) => (
                    <Badge key={key} variant="outline" className="text-[10px]">
                      {key}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent feedbacks */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">
                {lang === "pt" ? "Feedbacks recentes" : "Recent feedback"}
              </p>
              {filtered.slice(0, 10).map((f) => (
                <div key={f.id} className="border border-border/50 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{f.patient_name || "Anônimo"}</span>
                    <Badge className={`text-[9px] ${SERVICE_COLORS[f.service_type] || ""}`}>
                      {SERVICE_LABELS[f.service_type] || f.service_type}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(f.service_answers as any)?.quality && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" /> {(f.service_answers as any).quality}
                      </span>
                    )}
                    {(f.service_answers as any)?.recommend && (
                      <span className="text-[10px] text-muted-foreground">
                        Recomenda: {(f.service_answers as any).recommend}
                      </span>
                    )}
                  </div>
                  {f.general_observations && (
                    <p className="text-[10px] text-muted-foreground italic">"{f.general_observations}"</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/60">
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackResultsCard;
