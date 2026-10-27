import { Copy } from "lucide-react";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Segunda-feira (ISO) da semana que contém a data. */
export const mondayOfISO = (iso: string): string => {
  const dow = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
};

/** Datas da mesma semana (seg→dom), exceto a data base. */
export const copyTargetDays = (baseISO: string) => {
  const monday = mondayOfISO(baseISO);
  return WEEKDAYS.map((label, i) => ({ label, iso: addDays(monday, i) }));
};

interface Props {
  baseDate: string;
  value: string[];
  onChange: (dates: string[]) => void;
}

/** Copiar a mesma dose planejada para outros dias da semana (cria sessões novas). */
export default function CopyToDaysPicker({ baseDate, value, onChange }: Props) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return null;
  const days = copyTargetDays(baseDate);
  const toggle = (iso: string) =>
    onChange(value.includes(iso) ? value.filter((d) => d !== iso) : [...value, iso]);
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Copy className="h-3 w-3" /> Copiar também para (opcional)
      </span>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isBase = d.iso === baseDate;
          const on = value.includes(d.iso);
          return (
            <button
              key={d.iso}
              type="button"
              disabled={isBase}
              aria-pressed={on}
              onClick={() => toggle(d.iso)}
              className={`rounded-lg border px-0 py-1.5 text-[10px] leading-tight transition ${
                isBase
                  ? "border-primary/40 bg-primary/10 text-primary cursor-default"
                  : on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/60"
              }`}
            >
              {d.label}
              <span className="block">{d.iso.slice(8, 10)}</span>
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Serão criadas {value.length + 1} sessões iguais nesta semana.
        </p>
      )}
    </div>
  );
}
