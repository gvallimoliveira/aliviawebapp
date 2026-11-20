import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { createDemoInsights } from "@/data/demoInsights";
import { DEMO_APPOINTMENTS, DEMO_TEAM } from "@/data/mockClinicData";
import type { MgmtAppt } from "@/lib/managementMetrics";

interface Props { variant?: "clinic" | "pro"; appointments?: MgmtAppt[] }
type Category = "summary" | "patients" | "routine" | "finance" | "team" | "operations";
const categories: { id: Category; label: string }[] = [
  { id: "summary", label: "Resumo" }, { id: "patients", label: "Pacientes" },
  { id: "routine", label: "Rotina clínica" }, { id: "finance", label: "Financeiro" },
  { id: "team", label: "Equipe & Qualidade" }, { id: "operations", label: "Operação" },
];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const percent = (n: number | null) => n === null ? "—" : `${n}%`;
const Metric = ({ label, value, detail }: { label: string; value: string; detail?: string }) => <div className="border border-border rounded-lg p-3">
  <p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold text-foreground">{value}</p>
  {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
</div>;
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => <Card>
  <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
  <CardContent className="space-y-3 max-h-[440px] overflow-y-auto">{children}</CardContent>
</Card>;

/** Categorized local demo, intentionally never mounts production RPC-backed insights. */
const DemoInsightsMock = ({ variant = "clinic", appointments }: Props) => {
  const [category, setCategory] = useState<Category>("summary");
  const rows = useMemo(() => appointments ?? (variant === "pro" ? DEMO_APPOINTMENTS.filter(a => a.professional_id === "demo-pro-owner") : DEMO_APPOINTMENTS), [appointments, variant]);
  const data = useMemo(() => createDemoInsights(undefined, rows), [rows]);
  const active = data.patients.filter(p => !p.completed);
  return <div className="space-y-4">
    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Insights inteligentes</h2><Badge variant="outline">Demo</Badge></div>
    <nav aria-label="Categorias de insights" className="overflow-x-auto pb-1"><div className="flex gap-2 w-max">
      {categories.map(c => <Button key={c.id} size="sm" variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)}>{variant === "pro" && c.id === "team" ? "Qualidade" : c.label}</Button>)}
    </div></nav>
    {category === "summary" && <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <Metric label="Pacientes fictícios" value={String(data.patients.length)} detail={`${active.length} em acompanhamento`} />
      <Metric label="Alta registrada" value={String(data.patients.filter(p => p.completed).length)} detail="Não é previsão de IA" />
      <Metric label="Carga ou recuperação em atenção" value={String(active.filter(p => p.load.level !== "ok").length)} />
      <Metric label="Perdido com faltas/cancelamentos (30d)" value={brl(data.chair.lostValue)} detail={`${data.chair.lostCount} horários da agenda fictícia`} />
    </div>}
    {category === "patients" && <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Carga e prontidão">{active.map(p => <div key={p.id} className="border-b border-border pb-2 last:border-0">
        <p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">Dor {p.pain ?? "—"}/10 · Prontidão {percent(p.readiness)} · ACWR {p.load.acwr ?? "—"}</p>
        {p.load.messages.map(m => <p key={m} className="text-xs text-muted-foreground">{m}</p>)}
      </div>)}</Panel>
      <Panel title="Check-ins e dose respondida (14 dias)">{data.patients.map(p => <div key={p.id} className="border-b border-border pb-2 last:border-0">
        <p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.checkinDays} dias com check-in · {p.answered}/{p.planned} doses respondidas</p>
        <p className="text-xs text-muted-foreground">{p.under} subdose · {p.over} superdose · {p.answered - p.under - p.over} dose certa · {p.missing} sem resposta</p>
      </div>)}</Panel>
    </div>}
    {category === "routine" && <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Fase do tratamento (STEPS)">{data.phases.map(p => <div key={p.name} className="flex justify-between gap-2 text-sm"><span>{p.name}</span><Badge variant="secondary">{p.count}</Badge></div>)}</Panel>
      <Panel title="Contexto da decisão clínica">{data.patients.map(p => <div key={p.id} className="border-b border-border pb-2 last:border-0"><p className="text-sm font-medium">{p.name} · {p.phase}</p><p className="text-xs text-muted-foreground">{p.notes}</p></div>)}</Panel>
    </div>}
    {category === "finance" && <Panel title="Receita e perdas da agenda fictícia"><div className="grid grid-cols-2 gap-2">
      <Metric label="Receita realizada no mês" value={brl(data.revenue)} detail={`${data.realized} atendimentos classificados`} />
      <Metric label="Valor por sessão no cenário" value={brl(data.price)} />
      <Metric label="Cadeira vazia (30 dias)" value={brl(data.chair.lostValue)} />
      <Metric label="Faltas / cancelamentos" value={`${data.chair.noShow} / ${data.chair.cancelled}`} />
    </div><div className="max-h-64 overflow-y-auto space-y-2">{data.chair.details.map(a => <div key={a.id} className="flex justify-between gap-2 text-xs"><span>{a.patient_name} · {a.appointment_date.split("-").reverse().join("/")}</span><span>{brl(a.value)}</span></div>)}</div></Panel>}
    {category === "team" && <Panel title={variant === "clinic" ? "Atendimentos e qualidade" : "Qualidade dos registros"}>
      <Metric label="Prontuário em dia (30d)" value={percent(data.records.rate)} detail={`${data.records.pendingCount} pendências · não presume evolução gravada`} />
      {variant === "clinic" && data.team.map(p => <div key={p.id} className="flex justify-between gap-2 text-sm"><span>{DEMO_TEAM.find(t => t.id === p.id)?.full_name ?? "Profissional demo"}</span><span>{p.completed} sessões · {brl(p.revenue)}</span></div>)}
    </Panel>}
    {category === "operations" && <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Ocupação da agenda (7 dias)"><div className="grid grid-cols-2 gap-2"><Metric label="Ocupação" value={percent(data.occupancy.occupancy)} /><Metric label="Faltas" value={percent(data.occupancy.noShowRate)} /></div><p className="text-xs text-muted-foreground">{data.occupancy.active} horários ocupados / {data.occupancy.capacity} disponíveis no cenário.</p></Panel>
      <Panel title="Cancelamento tardio (30 dias)"><Metric label="Confirmados" value={String(data.cancellations.late)} detail={`${data.cancellations.unknown} sem horário de cancelamento conhecido`} /></Panel>
    </div>}
  </div>;
};
export default DemoInsightsMock;
