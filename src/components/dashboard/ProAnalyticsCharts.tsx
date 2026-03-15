import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { Activity, Target, TrendingDown, MapPin } from "lucide-react";

interface ProAnalyticsChartsProps {
  assessments: any[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
];

const PAIN_REGION_LABELS: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
  upper_back: "Torácica", lower_back: "Lombar", right_knee: "Joelho D.", left_knee: "Joelho E.",
  right_hip: "Quadril D.", left_hip: "Quadril E.", right_ankle: "Tornozelo D.", left_ankle: "Tornozelo E.",
  right_elbow: "Cotovelo D.", left_elbow: "Cotovelo E.", right_wrist: "Punho D.", left_wrist: "Punho E.",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

const ProAnalyticsCharts = ({ assessments }: ProAnalyticsChartsProps) => {
  const { t } = useLanguage();

  // Monthly distribution (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const count = assessments.filter((a) => {
        const ad = new Date(a.created_at);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, count });
    }
    return months;
  }, [assessments]);

  // Status distribution for donut
  const statusData = useMemo(() => {
    let withDiagnosis = 0, withTreatment = 0, withRedFlags = 0, pending = 0;
    assessments.forEach((a) => {
      if (a.red_flags && Object.values(a.red_flags).some((v) => v === true)) {
        withRedFlags++;
      } else if (a.treatment_plan) {
        withTreatment++;
      } else if (a.diagnosis) {
        withDiagnosis++;
      } else {
        pending++;
      }
    });
    return [
      { name: "Com tratamento", value: withTreatment, color: "hsl(150, 60%, 45%)" },
      { name: "Com diagnóstico", value: withDiagnosis, color: "hsl(210, 70%, 55%)" },
      { name: "Red Flags", value: withRedFlags, color: "hsl(0, 70%, 55%)" },
      { name: "Pendente", value: pending, color: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);
  }, [assessments]);

  // Pain regions frequency
  const regionData = useMemo(() => {
    const freq = new Map<string, number>();
    assessments.forEach((a) => {
      (a.pain_regions || []).forEach((r: string) => {
        freq.set(r, (freq.get(r) || 0) + 1);
      });
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([region, count]) => ({
        region: PAIN_REGION_LABELS[region] || region,
        count,
      }));
  }, [assessments]);

  // Average pain over time (monthly)
  const painTrendData = useMemo(() => {
    const now = new Date();
    const data: { label: string; avg: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const scores = assessments
        .filter((a) => {
          const ad = new Date(a.created_at);
          return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear() && a.pain_score != null;
        })
        .map((a) => a.pain_score as number);
      if (scores.length > 0) {
        data.push({ label, avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 });
      } else {
        data.push({ label, avg: 0 });
      }
    }
    return data;
  }, [assessments]);

  if (assessments.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Row 1: Monthly volume + Status donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Avaliações por mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avaliações" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Distribuição por status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Pain trend + Top regions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Média de dor ao longo do tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={painTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Média de dor"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {regionData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Regiões mais afetadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} width={80} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(210, 70%, 55%)" radius={[0, 4, 4, 0]} name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProAnalyticsCharts;
