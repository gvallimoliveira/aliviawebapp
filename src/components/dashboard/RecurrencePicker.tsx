import { useMemo } from "react";
import { Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { expandRecurrence, MAX_OCCURRENCES, type RecurrenceFreq, type RecurrenceRule } from "@/lib/appointmentRecurrence";

const L = {
  pt: { none: "Não se repete", weekly: "Toda semana", weekdays: "Dias escolhidos da semana", biweekly: "A cada 2 semanas", monthly: "Todo mês", daily: "Todo dia", yearly: "Todo ano", ends: "Termina", after: "após", sessions: "sessões", on: "em", preview: (n: number, d: string) => `Serão criados ${n} atendimentos, até ${d}`, days: ["D", "S", "T", "Q", "Q", "S", "S"] },
  en: { none: "Does not repeat", weekly: "Every week", weekdays: "Chosen weekdays", biweekly: "Every 2 weeks", monthly: "Every month", daily: "Every day", yearly: "Every year", ends: "Ends", after: "after", sessions: "sessions", on: "on", preview: (n: number, d: string) => `${n} appointments will be created, until ${d}`, days: ["S", "M", "T", "W", "T", "F", "S"] },
  es: { none: "No se repite", weekly: "Cada semana", weekdays: "Días elegidos", biweekly: "Cada 2 semanas", monthly: "Cada mes", daily: "Cada día", yearly: "Cada año", ends: "Termina", after: "tras", sessions: "sesiones", on: "el", preview: (n: number, d: string) => `Se crearán ${n} citas, hasta ${d}`, days: ["D", "L", "M", "X", "J", "V", "S"] },
};

interface Props {
  value: RecurrenceRule;
  onChange: (r: RecurrenceRule) => void;
  startDate: string; // yyyy-MM-dd
  language: string;
}

const fmt = (s: string) => s.split("-").reverse().slice(0, 2).join("/");

export default function RecurrencePicker({ value, onChange, startDate, language }: Props) {
  const l = L[(language as keyof typeof L)] || L.pt;
  const dates = useMemo(() => expandRecurrence(startDate, value), [startDate, value]);
  const endMode = value.until ? "until" : "count";
  const startDow = new Date(startDate + "T12:00:00").getDay();

  const setFreq = (f: RecurrenceFreq) => {
    if (f === "none") return onChange({ freq: "none" });
    onChange({ freq: f, count: value.count ?? 10, until: value.until, days: f === "weekdays" ? (value.days?.length ? value.days : [startDow]) : undefined });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select value={value.freq} onValueChange={(v) => setFreq(v as RecurrenceFreq)}>
          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{l.none}</SelectItem>
            <SelectItem value="weekly">{l.weekly}</SelectItem>
            <SelectItem value="weekdays">{l.weekdays}</SelectItem>
            <SelectItem value="biweekly">{l.biweekly}</SelectItem>
            <SelectItem value="monthly">{l.monthly}</SelectItem>
            <SelectSeparator />
            <SelectItem value="daily">{l.daily}</SelectItem>
            <SelectItem value="yearly">{l.yearly}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.freq === "weekdays" && (
        <div className="flex gap-1 pl-5">
          {l.days.map((d, i) => {
            const on = value.days?.includes(i);
            return (
              <button key={i} type="button" aria-pressed={on}
                onClick={() => {
                  const set = new Set(value.days || []);
                  on ? set.delete(i) : set.add(i);
                  onChange({ ...value, days: [...set].sort() });
                }}
                className={cn("h-7 w-7 rounded-full text-[11px] border border-border", on ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >{d}</button>
            );
          })}
        </div>
      )}

      {value.freq !== "none" && (
        <>
          <div className="flex flex-wrap items-center gap-1.5 pl-5 text-xs text-muted-foreground">
            <span>{l.ends}</span>
            <Select value={endMode} onValueChange={(m) => onChange(m === "until"
              ? { ...value, count: undefined, until: dates[dates.length - 1] || startDate }
              : { ...value, until: undefined, count: 10 })}>
              <SelectTrigger className="h-8 w-auto text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="count">{l.after}</SelectItem>
                <SelectItem value="until">{l.on}</SelectItem>
              </SelectContent>
            </Select>
            {endMode === "count" ? (
              <>
                <Input type="number" min={2} max={MAX_OCCURRENCES} value={value.count ?? 10}
                  onChange={(e) => onChange({ ...value, count: Math.min(MAX_OCCURRENCES, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="h-8 w-16 text-xs" />
                <span>{l.sessions}</span>
              </>
            ) : (
              <Input type="date" min={startDate} value={value.until} onChange={(e) => onChange({ ...value, until: e.target.value || startDate })} className="h-8 w-auto text-xs" />
            )}
          </div>
          <p className="pl-5 text-[11px] text-muted-foreground">{l.preview(dates.length, fmt(dates[dates.length - 1] || startDate))}</p>
        </>
      )}
    </div>
  );
}
