import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { dayLabel } from "@/lib/loadWindows";
import { localISODate } from "@/lib/periodization";

export interface DayGroup {
  date: string;
  summary: string;
  rows: Array<{ key: string; left: ReactNode; right: ReactNode }>;
}

/** Lista recolhida por dia: uma linha-resumo por dia; tocar abre as sessões. */
const DayGroupList = ({ groups, defaultOpenFirst = false }: { groups: DayGroup[]; defaultOpenFirst?: boolean }) => {
  const today = localISODate();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    defaultOpenFirst && groups[0] ? { [groups[0].date]: true } : {},
  );
  if (!groups.length) return null;
  return (
    <ul className="space-y-1">
      {groups.map((g) => {
        const isOpen = !!open[g.date];
        return (
          <li key={g.date} className="rounded-lg border border-border bg-background">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [g.date]: !o[g.date] }))}
            >
              <span className="min-w-0">
                <span className="font-medium text-foreground capitalize">{dayLabel(g.date, today)}</span>
                <span className="text-muted-foreground"> · {g.summary}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <ul className="space-y-0.5 border-t border-border px-2.5 py-1.5">
                {g.rows.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-3 text-[11px]">
                    <span className="min-w-0 truncate text-muted-foreground">{r.left}</span>
                    <span className="whitespace-nowrap text-foreground">{r.right}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default DayGroupList;
