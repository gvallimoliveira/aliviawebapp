import { useEffect, useState } from "react";
import { CalendarPlus, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { agendaGuidanceState } from "@/lib/gettingStarted";

interface Props {
  scopeKey: string;
  appointments: { service_type?: string | null; status: string }[];
  loading: boolean;
  hasError: boolean;
  canSchedule: boolean;
  clinical: boolean;
  demo?: boolean;
  onNew: () => void;
}

function isDismissed(key: string) {
  try { return localStorage.getItem(key) === "dismissed"; } catch { return false; }
}

export default function AgendaStartHelp({ scopeKey, appointments, loading, hasError, canSchedule, clinical, demo, onNew }: Props) {
  const { t } = useLanguage();
  const key = `alivia:agenda-tip:v1:${scopeKey}`;
  const [dismissed, setDismissed] = useState(() => isDismissed(key));
  useEffect(() => { setDismissed(isDismissed(key)); }, [key]);
  const state = agendaGuidanceState(appointments, loading, hasError, canSchedule, clinical, dismissed, demo);
  if (!state.empty && !state.tip) return null;
  return (
    <aside aria-label={t("agenda_start.label")} className="border-y border-border bg-muted/20 px-3 py-3 space-y-3">
      {state.empty && <div className="flex flex-wrap items-center gap-3">
        <CalendarPlus className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 basis-40 text-sm text-foreground">{t("agenda_start.empty")}</p>
        <Button type="button" variant="outline" size="sm" className="h-auto min-h-9 gap-2 whitespace-normal" onClick={onNew}>
          <CalendarPlus className="h-4 w-4 shrink-0" />{t("agenda_start.create")}
        </Button>
      </div>}
      {state.tip && <div className="flex items-start gap-2.5">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{t("agenda_start.tip_title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("agenda_start.tip")}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("agenda_start.dismiss")} title={t("agenda_start.dismiss")}
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem(key, "dismissed"); } catch { /* This visit can still dismiss it. */ }
          }}><X className="h-3.5 w-3.5" /></Button>
      </div>}
    </aside>
  );
}