import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, Users, ClipboardCheck, TrendingUp, CalendarDays, Percent,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isToday } from "date-fns";
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

const ClinicOwnerDashboard = ({ clinicId }: Props) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      const [apptRes, assessRes, membersRes] = await Promise.all([
        supabase
          .from("professional_appointments")
          .select("*")
          .eq("clinic_id", clinicId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("assessments")
          .select("*")
          .eq("clinic_id", clinicId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("clinic_members")
          .select("*")
          .eq("clinic_id", clinicId)
          .eq("status", "active"),
      ]);

      setAppointments(apptRes.data || []);
      setAssessments(assessRes.data || []);
      setMembers(membersRes.data || []);
      setLoading(false);
    };
    load();
  }, [clinicId]);

  // KPI cards
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = appointments.filter((a) => {
      const d = parseISO(a.appointment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const completedThisMonth = currentMonth.filter((a) => a.status === "completed").length;
    const totalThisMonth = currentMonth.length;
    const todayAppts = appointments.filter((a) => isToday(parseISO(a.appointment_date)));
    const therapists = members.filter((m) => m.role === "therapist" || m.role === "owner").length;

    // Occupancy: assume 8 slots/day/therapist, 22 working days
    const maxCapacity = therapists * 8 * 22;
    const occupancy = maxCapacity > 0 ? Math.round((totalThisMonth / maxCapacity) * 100) : 0;

    const assessmentsThisMonth = assessments.filter((a) => {
      const d = parseISO(a.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalThisMonth,
      completedThisMonth,
      todayCount: todayAppts.length,
      occupancy: Math.min(occupancy, 100),
      assessmentsThisMonth,
      therapists,
    };
  }, [appointments, assessments, members]);

  // Monthly appointments chart (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: startOfMonth(now) });
    return months.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const count = appointments.filter((a) => {
        const d = parseISO(a.appointment_date);
        return d >= start && d <= end;
      }).length;
      const assCount = assessments.filter((a) => {
        const d = parseISO(a.created_at);
        return d >= start && d <= end;
      }).length;
      return {
        month: format(m, "MMM", { locale: ptBR }),
        atendimentos: count,
        avaliacoes: assCount,
      };
    });
  }, [appointments, assessments]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      const s = a.status || "scheduled";
      counts[s] = (counts[s] || 0) + 1;
    });
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
      no_show: "Não compareceu",
    };
    return Object.entries(counts).map(([k, v]) => ({
      name: labels[k] || k,
      value: v,
    }));
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
            <p className="text-2xl font-bold text-foreground">{kpis.todayCount}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpis.totalThisMonth}</p>
            <p className="text-xs text-muted-foreground">Atendimentos / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpis.completedThisMonth}</p>
            <p className="text-xs text-muted-foreground">Concluídos / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Percent className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpis.occupancy}%</p>
            <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <ClipboardCheck className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpis.assessmentsThisMonth}</p>
            <p className="text-xs text-muted-foreground">Avaliações / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{kpis.therapists}</p>
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
