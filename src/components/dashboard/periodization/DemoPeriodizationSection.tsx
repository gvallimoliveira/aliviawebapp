import { useMemo, useState } from "react";
import { Gauge, Plus } from "lucide-react";
import { createDemoPeriodization, mergeDemoSession } from "@/data/demoPeriodization";
import { loadLevelFromRpe, trainingLoad } from "@/lib/periodization";
import type { PeriodizationSession, SrpeEntry } from "@/lib/periodizationData";
import { DailyConductContent } from "./DailyConductCard";
import LoadMonitorCard from "./LoadMonitorCard";
import DoseAdherenceCard from "./DoseAdherenceCard";
import MacroTimeline from "./MacroTimeline";
import MicroWeekGrid from "./MicroWeekGrid";
import PeriodizationCollapsible from "./PeriodizationCollapsible";

/** Reuses real calculations/presentation with a local sandbox, not a live patient ID. */
const DemoPeriodizationSection = ({ patientName }: { patientName?: string | null }) => {
  const fixture = useMemo(() => createDemoPeriodization(undefined, patientName ?? "patient"), [patientName]);
  const [sessions, setSessions] = useState(fixture.sessions);
  const [entries, setEntries] = useState(fixture.entries);
  const noop = () => {};
  return <div className="space-y-3">
    <DailyConductContent birth={null} plan={fixture.plan} entries={entries} checkins={fixture.checkins} sessions={sessions} />
    <PeriodizationCollapsible title="Macrociclo (fases do STEPS)" icon={<Gauge className="h-4 w-4 text-primary" />} defaultOpen={false}>
      <MacroTimeline cycles={fixture.cycles} planId={fixture.plan.id} onChanged={noop} readOnly />
    </PeriodizationCollapsible>
    <PeriodizationCollapsible title="Carga e prontidão" icon={<Gauge className="h-4 w-4 text-primary" />}>
      <LoadMonitorCard patientId={fixture.patientId} entries={entries} checkins={fixture.checkins} onChanged={noop} readOnly />
    </PeriodizationCollapsible>
    <PeriodizationCollapsible title="Dose planejada e percebida" icon={<Gauge className="h-4 w-4 text-primary" />}>
      <DoseAdherenceCard patientId={fixture.patientId} sessions={sessions} entries={entries} onChanged={noop} readOnly />
    </PeriodizationCollapsible>
    <PeriodizationCollapsible title="Microciclo da semana" icon={<Plus className="h-4 w-4 text-primary" />}>
      <MicroWeekGrid patientId={fixture.patientId} planId={fixture.plan.id} sessions={sessions} entries={entries}
        onChanged={noop} patientName={patientName} professionalName="Equipe FisioVida · Demo" sport={fixture.plan.sport}
        currentPhase={fixture.cycles.find(c => c.is_current)?.name} demoActions={{
          saveDose: dose => {
            const duration = dose.plannedDurationMin;
            const session: PeriodizationSession = { id: crypto.randomUUID(), patient_id: fixture.patientId,
              plan_id: fixture.plan.id, cycle_id: null, session_date: dose.sessionDate, track: dose.track,
              planned_load: loadLevelFromRpe(dose.plannedRpe, duration), planned_duration_min: duration,
              planned_rpe: dose.plannedRpe, planned_target_load: trainingLoad(duration, dose.plannedRpe),
              title: dose.title ?? null, notes: dose.notes ?? null, exercise_program_id: null, created_source: "professional" };
            setSessions(prev => [...prev, session]);
          },
          removeDose: id => setSessions(prev => prev.filter(s => s.id !== id)),
          saveMonitored: input => {
            const merged = entries.some(e => e.session_date === input.sessionDate && e.track === input.track);
            const entry: SrpeEntry = { id: crypto.randomUUID(), patient_id: fixture.patientId, plan_id: fixture.plan.id,
              session_date: input.sessionDate, track: input.track, duration_min: input.durationMin, rpe: input.rpe,
              training_load: trainingLoad(input.durationMin, input.rpe), source: "professional", notes: input.notes ?? null,
              session_id: sessions.find(s => s.session_date === input.sessionDate && s.track === input.track)?.id ?? null,
              ...(input.monitor ?? {}) };
            setEntries(prev => mergeDemoSession(prev, entry));
            return { merged };
          },
        }} />
    </PeriodizationCollapsible>
  </div>;
};
export default DemoPeriodizationSection;