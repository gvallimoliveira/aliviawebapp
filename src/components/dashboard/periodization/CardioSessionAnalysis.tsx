import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { fmtNum, sessionReadings, type AnalysisContext, type SessionAnalysis } from "@/lib/cardioAnalysis";
import { TRACK_LABEL } from "./scales";

const ZONE_LO = [0.5, 0.6, 0.7, 0.8, 0.9];
const WARN = /acima|atenção|abaixo de|fora da|maior do que o esforço/;

/** Análise de uma sessão monitorada: zonas, FC relativa, coerência e recuperação. */
const CardioSessionAnalysis = ({ s, ctx }: { s: SessionAnalysis; ctx: AnalysisContext }) => {
  const ceilFrac = ctx.ceiling.ceiling && ctx.ceiling.maxHr ? ctx.ceiling.ceiling / ctx.ceiling.maxHr : null;
  const zoneData = s.zones?.map((m, i) => ({
    zona: `Z${i + 1}`,
    min: m,
    // Zona que alcança o teto fica destacada.
    over: ceilFrac !== null && ZONE_LO[i] + 0.1 > ceilFrac,
  }));
  const readings = sessionReadings(s, ctx);
  const metrics: Array<[string, string, boolean?]> = [
    ["Duração", `${s.durationMin} min`],
    ["PSE", fmtNum(s.rpe)],
    ["FC média", s.hrAvg ? `${s.hrAvg} bpm${s.hrAvgPctMax ? ` · ${s.hrAvgPctMax}%` : ""}` : "—"],
    ["FC máxima", s.hrMax ? `${s.hrMax} bpm${s.hrMaxPctMax ? ` · ${s.hrMaxPctMax}%` : ""}` : "—", s.aboveCeiling],
    ["Acima do teto", s.minutesAboveCeiling !== null ? `${fmtNum(s.minutesAboveCeiling)} min · ${s.pctAboveCeiling ?? 0}%` : s.aboveCeiling ? "sim" : "—", s.aboveCeiling],
    ["Carga FC (TRIMP)", s.trimp !== null ? String(s.trimp) : "—"],
    ["Carga PSE (sRPE)", String(s.srpe)],
    ["Recuperação 1º min", s.recovery ? `${s.recovery.drop} bpm` : "—", s.recovery?.status === "low"],
  ];
  if (s.paceMinKm !== null) metrics.push(["Ritmo", `${Math.floor(s.paceMinKm)}:${String(Math.round((s.paceMinKm % 1) * 60)).padStart(2, "0")} min/km`]);
  if (s.efficiency) metrics.push(["Eficiência", s.efficiency.kind === "speed" ? `${fmtNum(s.efficiency.value)} m/batimento` : `${fmtNum(s.efficiency.value)} W/bpm`]);
  if (s.spo2Min !== null) metrics.push(["SpO₂ mínima", `${s.spo2Min}%`, s.spo2Low]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {new Date(`${s.date}T12:00:00Z`).toLocaleDateString("pt-BR")} · {TRACK_LABEL[s.track] ?? s.track} · intensidade pela{" "}
        {s.intensity.source === "zones" ? "distribuição nas zonas" : s.intensity.source === "avg_hr" ? "FC média" : "PSE"}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map(([label, value, warn]) => (
          <div key={label} className={`min-w-0 rounded-lg p-2 ${warn ? "bg-destructive/10" : "bg-muted/50"}`}>
            <div className="truncate text-[11px] text-muted-foreground">{label}</div>
            <div className={`truncate text-sm font-semibold ${warn ? "text-destructive" : "text-foreground"}`}>{value}</div>
          </div>
        ))}
      </div>
      {zoneData && (
        <div>
          <p className="mb-1 text-xs font-medium text-foreground">Tempo em cada zona (min)</p>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="zona" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} width={30} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} formatter={(v: number) => [`${v} min`, "Tempo"]} />
                <Bar dataKey="min" radius={[4, 4, 0, 0]}>
                  {zoneData.map((z) => <Cell key={z.zona} fill={z.over ? "hsl(var(--destructive))" : "hsl(var(--chart-1))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {ceilFrac !== null && <p className="text-[11px] text-muted-foreground">Em vermelho, zonas que alcançam o teto do perfil ({ctx.ceiling.ceiling} bpm).</p>}
        </div>
      )}
      {readings.length > 0 && (
        <ul className="space-y-1">
          {readings.map((r) => (
            <li key={r} className={`flex gap-1.5 text-xs ${WARN.test(r) ? "text-destructive" : "text-foreground"}`}>
              {WARN.test(r) ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> : <span className="shrink-0">•</span>}
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CardioSessionAnalysis;
