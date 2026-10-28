import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Compass } from "lucide-react";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";
import { ageFromBirth, hrCeiling, profileRule } from "@/lib/cardioSafety";
import { dailyConduct, type ConductTone } from "@/lib/dailyConduct";

const toneStyle: Record<ConductTone, string> = {
  stop: "border-destructive/40 bg-destructive/5",
  reduce: "border-destructive/30 bg-destructive/5",
  hold: "border-accent/40 bg-accent/10",
  go: "border-primary/30 bg-primary/5",
  info: "border-border bg-muted/40",
};
const toneLabel: Record<ConductTone, string> = { stop: "Segurança", reduce: "Reduzir", hold: "Manter", go: "Progredir", info: "Info" };

/** Conduta do dia: o que fazer hoje, antes dos números. Sempre sugestão. */
const DailyConductCard = ({ patientId, plan, entries, checkins, sessions }: { patientId: string; plan: any; entries: any[]; checkins: any[]; sessions: any[] }) => {
  const birth = usePatientBirthDate(patientId);
  return <DailyConductContent birth={birth} plan={plan} entries={entries} checkins={checkins} sessions={sessions} />;
};

export const DailyConductContent = ({ birth, plan, entries, checkins, sessions }: { birth: string | null; plan: any; entries: any[]; checkins: any[]; sessions: any[] }) => {
  const result = useMemo(() => {
    const ceil = hrCeiling({ profile: plan?.cardio_profile, age: ageFromBirth(birth), override: plan?.hr_ceiling_override ?? null });
    return dailyConduct({
      entries, checkins, sessions,
      ceiling: ceil.ceiling, maxHr: ceil.maxHr, profile: plan?.cardio_profile,
      rhrAlert: profileRule(plan?.cardio_profile).rhrAlert, betaBlocker: !!plan?.beta_blocker,
    });
  }, [entries, checkins, sessions, plan?.cardio_profile, plan?.hr_ceiling_override, plan?.beta_blocker, birth]);
  if (!entries.length && !checkins.length && !sessions.length) return null;
  const { headline, others } = result;
  return (
    <Card className={`border ${toneStyle[headline.tone]}`} data-periodization-block>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Compass className="h-4 w-4 text-primary" /> Conduta do dia
        </div>
        <div>
          <p className="text-base font-semibold text-foreground leading-snug">{headline.action}</p>
          <p className="text-sm text-muted-foreground mt-1">{headline.why}</p>
        </div>
        {others.length > 0 && (
          <ul className="space-y-2 border-t pt-3">
            {others.map((o, i) => (
              <li key={i} className="text-sm">
                <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground mr-2">{toneLabel[o.tone]}</span>
                <span className="font-medium text-foreground">{o.action}</span>
                {o.planned?.length ? (
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {o.planned.map((p, j) => (
                      <div key={j} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
                        <span className="min-w-0 truncate capitalize text-foreground">{p.label}</span>
                        <span className="flex shrink-0 gap-1">
                          {p.minutes ? <span className="rounded-md bg-background border px-1.5 py-0.5 text-[11px] text-muted-foreground">{p.minutes} min</span> : null}
                          {p.rpe ? <span className="rounded-md bg-background border px-1.5 py-0.5 text-[11px] text-muted-foreground">PSE {p.rpe}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground"> — {o.why}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">Sugestão baseada nos dados registrados. A decisão é sua.</p>
      </CardContent>
    </Card>
  );
};
export default DailyConductCard;
