import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Target, MapPin } from "lucide-react";
import { getAllRegions } from "@/components/assessment/painMapData";

interface ProAnalyticsChartsProps {
  assessments: any[];
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

const ProAnalyticsCharts = ({ assessments }: ProAnalyticsChartsProps) => {
  const allRegions = useMemo(() => getAllRegions(), []);

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

  // Pain regions frequency with proper labels from painMapData
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
        region: allRegions[region]?.label_pt || region,
        count,
      }));
  }, [assessments, allRegions]);

  if (assessments.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Status donut */}
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
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pain regions */}
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
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} width={90} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(210, 70%, 55%)" radius={[0, 4, 4, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProAnalyticsCharts;
