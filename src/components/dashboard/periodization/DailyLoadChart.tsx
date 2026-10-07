import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyLoadPoint } from "@/lib/loadWindows";
import { TRACK_LABEL } from "./scales";

const COLORS: Record<string, string> = {
  physio: "hsl(var(--chart-1))",
  gym: "hsl(var(--chart-2))",
  cardio: "hsl(var(--chart-4))",
  sport: "hsl(var(--chart-3))",
};

const short = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Barras diárias empilhadas por frente (sRPE). */
const DailyLoadChart = ({ data, height = 160 }: { data: DailyLoadPoint[]; height?: number }) => {
  const used = (["physio", "gym", "cardio", "sport"] as const).filter((t) => data.some((d) => d[t] > 0));
  const rows = data.map((d) => ({ ...d, dia: short(d.date) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" width={36} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
            formatter={(v: number, k: string) => [v, TRACK_LABEL[k] ?? k]}
          />
          {(used.length ? used : (["physio"] as const)).map((t, i, arr) => (
            <Bar key={t} dataKey={t} stackId="load" fill={COLORS[t]} radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyLoadChart;
