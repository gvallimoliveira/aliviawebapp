import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, Users, ClipboardCheck, TrendingUp, CalendarDays, Percent,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clinicId: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(40, 80%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(var(--muted-foreground))",
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

interface KpiPayload {
  today_count: number;
  total_this_month: number;
  completed_this_month: number;
  occupancy: number;
  assessments_this_month: number;
  therapists: number;
  monthly_data: Array<{ month_start: string; atendimentos: number; avaliacoes: number }>;
  status_data: Array<{ name: string; value: number }>;
}

const ClinicOwnerDashboard = ({ clinicId }: Props) => {
  const [kpiData, setKpiData] = useState<KpiPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // Server-side aggregation: heavy filtering and counting now run in Postgres
      // instead of streaming 6 months of raw rows to the browser. Drastically
      // reduces payload + CPU for clinics with thousands of records.
      const { data, error } = await supabase.rpc("get_clinic_kpis" as any, {
        _clinic_id: clinicId,
      });
      if (cancelled) return;
      if (error || !data) {
        setKpiData(null);
      } else {
        // RPC returns SETOF — take first row
        const row = Array.isArray(data) ? data[0] : data;
        setKpiData(row as KpiPayload);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [clinicId]);

  const monthlyData = useMemo(() => {
    if (!kpiData?.monthly_data) return [];
    return kpiData.monthly_data.map((m) => ({
      month: format(parseISO(m.month_start), "MMM", { locale: ptBR }),
      atendimentos: m.atendimentos,
      avaliacoes: m.avaliacoes,
    }));
  }, [kpiData]);

  const statusData = useMemo(() => kpiData?.status_data || [], [kpiData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Não foi possível carregar os indicadores.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Dashboard Gerencial</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <CalendarDays className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.today_count}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.total_this_month}</p>
            <p className="text-xs text-muted-foreground">Atendimentos / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.completed_this_month}</p>
            <p className="text-xs text-muted-foreground">Concluídos / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Percent className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.occupancy}%</p>
            <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <ClipboardCheck className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.assessments_this_month}</p>
            <p className="text-xs text-muted-foreground">Avaliações / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpiData.therapists}</p>
            <p className="text-xs text-muted-foreground">Terapeutas ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Volume mensal (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="atendimentos" name="Atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avaliacoes" name="Avaliações" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status distribution */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição de status dos atendimentos</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    const total = statusData.reduce((s, d) => s + d.value, 0);
                    return [`${value} (${((value / total) * 100).toFixed(0)}%)`, name];
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicOwnerDashboard;
