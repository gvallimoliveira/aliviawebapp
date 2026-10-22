import { useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildRegionalPainEvolution, regionalPainLabel, type RegionalPainAssessment } from "@/lib/regionalPainEvolution";

export default function PatientPainEvolution({ assessments }: { assessments: RegionalPainAssessment[] }) {
  const { language, t } = useLanguage();
  const { series, points } = useMemo(() => buildRegionalPainEvolution(assessments), [assessments]);
  const [hidden, setHidden] = useState<string[]>([]);
  const locale = language === "en" ? "en-US" : language === "es" ? "es" : "pt-BR";
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { day: "2-digit", month: "short" });
  if (!series.length) return null;
  return <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 shrink-0 text-primary" />{language === "pt" ? "Evolução da dor por região" : language === "es" ? "Evolución del dolor por región" : "Pain evolution by region"}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {series.map((s, i) => <Button key={s.key} variant="outline" size="sm" className="h-auto min-h-8 max-w-full gap-2 whitespace-normal text-left text-xs" aria-pressed={!hidden.includes(s.key)} onClick={() => setHidden(old => old.includes(s.key) ? old.filter(k => k !== s.key) : old.length < series.length - 1 ? [...old, s.key] : old)}>
          <svg width="12" height="12" className="shrink-0" aria-hidden><circle cx="6" cy="6" r="5" fill={`hsl(var(--chart-${i % 6 + 1}))`} opacity={hidden.includes(s.key) ? 0.25 : 1} /></svg>
          <span className={hidden.includes(s.key) ? "text-muted-foreground line-through" : ""}>{regionalPainLabel(s.regionId, language, t)}</span>
        </Button>)}
      </div>
      <div className="h-56 min-w-0" role="img" aria-label={language === "pt" ? "Pontuação de dor de 0 a 10 por região e data" : language === "es" ? "Dolor de 0 a 10 por región y fecha" : "Pain score from 0 to 10 by region and date"}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={date} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={24} padding={{ left: 48, right: 48 }} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip labelFormatter={value => new Date(String(value)).toLocaleDateString(locale)} formatter={(value: number, name: string) => [`${value}/10`, name]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", maxWidth: 240, whiteSpace: "normal" }} />
          {series.map((s, i) => { const color = `hsl(var(--chart-${i % 6 + 1}))`; return <Line key={s.key} dataKey={s.key} name={regionalPainLabel(s.regionId, language, t)} hide={hidden.includes(s.key)} stroke={color} strokeDasharray={i >= 6 ? "5 3" : undefined} type="monotone" strokeWidth={2.5} dot={{ r: 5, fill: color, strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 7, fill: color, strokeWidth: 2, stroke: "hsl(var(--card))" }} connectNulls={false} isAnimationActive={false} />; })}
        </LineChart></ResponsiveContainer>
      </div>
      <div id="sec-regioes-dor" className="scroll-mt-24 divide-y divide-border">
        {series.map(s => {
          const first = s.measurements[0];
          const last = s.measurements[s.measurements.length - 1];
          if (!first || !last) return null;
          const diff = first.score - last.score;
          return <div key={s.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-xs">
            <div className="min-w-0"><p className="font-medium text-foreground break-words">{regionalPainLabel(s.regionId, language, t)}</p><p className="text-muted-foreground">{date(first.date)}{s.measurements.length > 1 ? ` → ${date(last.date)}` : ""}</p></div>
            <div className="flex items-center gap-2 tabular-nums">
              <span>{first.score}/10{s.measurements.length > 1 ? ` → ${last.score}/10` : ""}</span>
              {s.measurements.length > 1 ? <span className={diff < 0 ? "text-destructive flex items-center gap-1" : "text-muted-foreground flex items-center gap-1"}>{diff > 0 ? <ArrowDown className="h-3 w-3" /> : diff < 0 ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{Math.abs(diff)}</span> : <span className="text-muted-foreground">{language === "pt" ? "Única medição" : language === "es" ? "Medición única" : "Single measurement"}</span>}
            </div>
          </div>;
        })}
      </div>
    </CardContent>
  </Card>;
}