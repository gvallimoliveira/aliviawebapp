import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MovementEvolutionPoint {
  date: string;
  esq: number | null;
  dir: number | null;
}

interface Props {
  data: MovementEvolutionPoint[];
  /** Unit suffix shown in the tooltip, e.g. "°" or "kgf". */
  unit: string;
}

/**
 * Longitudinal line chart for one movement (Esq × Dir) across assessments.
 * Rendered only when there are 2+ dated measurements for that movement.
 */
export default function MovementEvolutionChart({ data, unit }: Props) {
  const [isNarrow, setIsNarrow] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setIsNarrow((entries[0]?.contentRect.width || 400) < 360);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="h-36 w-full" role="img" aria-label="Gráfico de evolução por movimento">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: isNarrow ? -22 : -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={isNarrow ? 40 : 16}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: 11,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value: any, name: any) => [
              value == null ? "—" : `${value} ${unit}`,
              name === "esq" ? "Esq" : "Dir",
            ]}
            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="esq"
            name="esq"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="dir"
            name="dir"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: "hsl(var(--muted-foreground))", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-primary" /> Esq
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-muted-foreground" /> Dir
        </span>
      </div>
    </div>
  );
}
