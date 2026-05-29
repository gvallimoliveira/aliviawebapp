import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, Target, Activity, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { DEMO_MANAGEMENT } from "@/data/mockClinicData";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#8b5cf6", "#10b981", "#64748b"];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const Delta = ({ now, prev, isPct = false }: { now: number; prev: number; isPct?: boolean }) => {
  const diff = now - prev;
  const pct = prev > 0 ? ((diff / prev) * 100) : 0;
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${up ? "text-emerald-600" : "text-destructive"}`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}{isPct ? `${diff.toFixed(1)}pp` : `${pct.toFixed(1)}%`}
    </span>
  );
};

const Kpi = ({ icon: Icon, label, value, delta }: any) => (
  <Card>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          {delta}
        </div>
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const DemoManagementMock = () => {
  const M = DEMO_MANAGEMENT;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestão & KPIs</h2>
          <p className="text-xs text-muted-foreground">Faturamento, produtividade e indicadores ao vivo da clínica</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi icon={DollarSign} label="Faturamento mês" value={fmtBRL(M.monthly_revenue)} delta={<Delta now={M.monthly_revenue} prev={M.monthly_revenue_prev} />} />
        <Kpi icon={Users} label="Pacientes ativos" value={M.active_patients} delta={<Delta now={M.active_patients} prev={M.active_patients_prev} />} />
        <Kpi icon={Calendar} label="Sessões realizadas" value={M.sessions_month} delta={<Delta now={M.sessions_month} prev={M.sessions_month_prev} />} />
        <Kpi icon={Target} label="Conversão" value={`${M.conversion_rate_pct}%`} delta={<Delta now={M.conversion_rate_pct} prev={M.conversion_rate_pct_prev} isPct />} />
        <Kpi icon={DollarSign} label="Ticket médio" value={fmtBRL(M.avg_ticket)} delta={<Delta now={M.avg_ticket} prev={M.avg_ticket_prev} />} />
        <Kpi icon={Activity} label="Ocupação" value={`${M.occupancy_pct}%`} delta={<Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] mt-1">Acima da meta</Badge>} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Faturamento (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={M.revenue_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Distribuição por especialidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={M.specialty_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `${e.value}%`} labelLine={false} style={{ fontSize: 11 }}>
                  {M.specialty_distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Produtividade por profissional (mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={M.sessions_per_therapist} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoManagementMock;
