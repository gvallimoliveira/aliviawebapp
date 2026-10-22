import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LoadRecoveryPoint } from "@/lib/loadRecovery";

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

const TRACK_META = [
  { key: "physio", label: "Fisio", color: "hsl(var(--chart-1))" },
  { key: "gym", label: "Academia", color: "hsl(var(--chart-2))" },
  { key: "cardio", label: "Cardio", color: "hsl(var(--chart-4))" },
  { key: "sport", label: "Esporte", color: "hsl(var(--chart-5))" },
] as const;

const LoadRecoveryChart = ({ data }: { data: LoadRecoveryPoint[] }) => {
  const latest = [...data].reverse().find((point) => point.psr !== null);
  const paired = data.filter((point) => point.psr !== null && point.load !== null);
  const tracks = TRACK_META.filter((t) => data.some((point) => (point.tracks?.[t.key] ?? 0) > 0));
  const strained = data.filter((point) => point.pattern === "low_recovery_high_load").length;
  const recovered = data.filter((point) => point.pattern === "high_recovery_low_load").length;
  return (
    <div className="space-y-2" aria-label="Carga diária e percepção de recuperação">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {tracks.map((t) => (
          <span key={t.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: t.color }} />{t.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[hsl(var(--chart-3))]" />PSR · 1–10</span>
      </div>
      <div className="h-52 w-full min-w-0" role="img" aria-label={`Carga diária em barras e PSR em linha. ${paired.length} dias com ambas as medidas.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.map((point) => ({ ...point, ...(point.tracks ?? {}) }))} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis yAxisId="load" width={42} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis yAxisId="psr" orientation="right" domain={[1, 10]} ticks={[1, 4, 7, 10]} width={28} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <Tooltip content={({ active, payload }) => {
              const point = payload?.[0]?.payload as LoadRecoveryPoint | undefined;
              if (!active || !point) return null;
              return <div className="rounded-lg border border-border bg-card p-2 text-xs text-card-foreground shadow-sm">
                <p className="font-medium">{shortDate(point.date)}</p>
                <p>Carga: {point.load === null ? "sem sessão registrada" : `${point.load} sRPE`}</p>
                {point.tracks && TRACK_META.filter((t) => point.tracks![t.key] > 0).map((t) => (
                  <p key={t.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: t.color }} />{t.label}: {point.tracks![t.key]} sRPE</p>
                ))}
                <p>PSR: {point.psr === null ? "não respondida" : `${point.psr}/10`}</p>
                <p>Aguda (7d): {point.acute} sRPE</p>
                <p>Crônica: {point.chronic === null ? "histórico insuficiente" : `${point.chronic} sRPE/semana`}</p>
              </div>;
            }} />
            {tracks.map((t, i) => (
              <Bar key={t.key} yAxisId="load" dataKey={t.key} name={t.label} stackId="load" fill={t.color} radius={i === tracks.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            ))}
            <Line yAxisId="psr" dataKey="psr" name="PSR" type="linear" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {latest ? <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">PSR de {shortDate(latest.date)}: {latest.psr}/10 · carga do dia {latest.load === null ? "não registrada" : `${latest.load} sRPE`}</p>
        <p>Aguda: {latest.acute} · 7 dias anteriores: {latest.previousWeek ?? "—"} · crônica semanal: {latest.chronic ?? "—"} sRPE{latest.ratio !== null ? ` · ACWR ${latest.ratio}` : ""}.</p>
        {latest.psrBaseline !== null ? <p>PSR média dos 7 dias anteriores: {latest.psrBaseline.toFixed(1)}/10.</p> : <p>Referência pessoal de PSR: aguardando 3 respostas nos 7 dias anteriores.</p>}
        {strained > 0 && <p className="text-foreground">Em {strained} {strained === 1 ? "dia, recuperação menor coincidiu" : "dias, recuperação menor coincidiu"} com carga aguda acima do padrão. Revise tolerância, sono e distribuição das sessões.</p>}
        {recovered > 0 && <p className="text-foreground">Em {recovered} {recovered === 1 ? "dia, recuperação maior coincidiu" : "dias, recuperação maior coincidiu"} com carga aguda abaixo do padrão. Pode refletir recuperação ou redução planejada; progressão depende da avaliação.</p>}
        {strained === 0 && recovered === 0 && <p>{paired.length < 3 ? "Poucos dias com as duas medidas; acompanhe novas respostas." : "Sem padrão inverso destacado nos dias exibidos."}</p>}
      </div> : <p className="text-xs text-muted-foreground">PSR ainda não respondida neste período. As outras escalas não substituem essa nota.</p>}
      <p className="text-[10px] text-muted-foreground">Leitura descritiva: variação de PSR ≥2 pontos da média pessoal; carga aguda ±10% dos 7 dias anteriores ou ACWR fora de 0,8–1,3. Não são cortes diagnósticos. Ausência de registro não significa descanso. PSR pode anteceder o treino: coincidência no dia não demonstra causa ou correlação estatística.</p>
    </div>
  );
};

export default LoadRecoveryChart;