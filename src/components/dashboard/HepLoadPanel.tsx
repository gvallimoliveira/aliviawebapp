import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CalendarCheck } from "lucide-react";
import { HepLoadSummary, phaseWarning, summarizeHep, weeklyJump, Intensity, VolumeLevel } from "@/lib/hepLoad";

const INT_LABEL: Record<Intensity, string> = { light: "Leve", moderate: "Moderada", high: "Alta" };
const VOL_LABEL: Record<VolumeLevel, string> = { low: "Baixo", moderate: "Moderado", high: "Alto" };
const TONE: Record<string, string> = {
  light: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

interface Props {
  summary: HepLoadSummary;
  regionLabel: (r: string) => string;
  professionalId: string;
  patientName: string;
  editProgramId?: string | null;
}

const HepLoadPanel = ({ summary, regionLabel, professionalId, patientName, editProgramId }: Props) => {
  const [phase, setPhase] = useState<string | null>(null);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [prevSets, setPrevSets] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = supabase as any;
        const { data: pt } = await sb.from("patients").select("id").eq("professional_id", professionalId).ilike("full_name", patientName).limit(1).maybeSingle();
        if (!alive) return;
        setLinked(!!pt?.id);
        if (pt?.id) {
          const { data: plan } = await sb.from("periodization_plans").select("id").eq("patient_id", pt.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (plan?.id) {
            const { data: cyc } = await sb.from("periodization_cycles").select("name").eq("plan_id", plan.id).eq("is_current", true).limit(1).maybeSingle();
            if (alive) setPhase(cyc?.name || null);
          }
        }
        let q = sb.from("exercise_programs").select("id").eq("professional_id", professionalId).ilike("patient_name", patientName).order("created_at", { ascending: false }).limit(2);
        const { data: progs } = await q;
        const prev = (progs || []).find((p: any) => p.id !== editProgramId);
        if (prev) {
          const { data: items } = await sb.from("exercise_program_items").select("sets, reps, frequency").eq("program_id", prev.id);
          const s = summarizeHep((items || []).map((i: any) => ({ name: "", region: "x", sets: i.sets, reps: i.reps, frequency: i.frequency })));
          if (alive) setPrevSets(s.weeklySets);
        }
      } catch (e) {
        console.warn("hep load context failed", e);
      }
    })();
    return () => { alive = false; };
  }, [professionalId, patientName, editProgramId]);

  if (!summary.items.length) return null;
  const warn = phaseWarning(phase, summary);
  const jump = weeklyJump(prevSets, summary.weeklySets);
  const maxSets = Math.max(...summary.byRegion.map((r) => r.weeklySets), 1);

  return (
    <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Carga do programa</p>
        {summary.predominant && <Badge className={`${TONE[summary.predominant]} border-0 text-[10px]`}>Intensidade {INT_LABEL[summary.predominant].toLowerCase()}</Badge>}
        {summary.hasHigh && summary.predominant !== "high" && <Badge variant="outline" className="text-[10px]">contém estímulo alto</Badge>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="Repetições/sessão" value={summary.totalReps} />
        <Stat label="Volume de carga" value={summary.volumeLoad ? `${summary.volumeLoad} kg` : "—"} />
        <Stat label="Isometria" value={summary.tut ? `${summary.tut} s` : "—"} />
        <Stat label="Séries/semana" value={summary.weeklySets} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Séries semanais por região</p>
        {summary.byRegion.map((r) => (
          <div key={r.region} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 truncate">{regionLabel(r.region)}</span>
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.weeklySets / maxSets) * 100}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums">{r.weeklySets}</span>
            <Badge className={`${TONE[r.volume]} border-0 text-[10px] w-16 justify-center`}>{VOL_LABEL[r.volume]}</Badge>
          </div>
        ))}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Por exercício</summary>
        <div className="mt-1.5 space-y-1">
          {summary.items.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium truncate max-w-[45%]">{p.name || "Exercício"}</span>
              <span className="text-muted-foreground">
                {p.holdS != null ? `${p.setsN}×${p.holdS}s = ${p.tut}s` : `${p.setsN}×${p.repsN} = ${p.totalReps} reps`}
                {p.volumeLoad ? ` · ${p.volumeLoad} kg` : p.loadType && p.loadType !== "kg" ? ` · ${p.loadType === "band" ? "elástico" : "peso corporal"}` : ""}
              </span>
              {p.intensity && <Badge className={`${TONE[p.intensity]} border-0 text-[10px]`}>{INT_LABEL[p.intensity]}</Badge>}
              {p.volume && <Badge variant="outline" className="text-[10px]">vol. {VOL_LABEL[p.volume].toLowerCase()}</Badge>}
            </div>
          ))}
        </div>
      </details>

      {summary.targetRpe != null && (
        <div className="flex items-start gap-2 rounded-lg bg-background p-2 text-xs">
          <CalendarCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p>
            Dose planejada: <b>{summary.sessionsPerWeek}×/semana</b>, ~<b>{summary.durationMin} min</b> com esforço alvo <b>{summary.targetRpe}/10</b> = <b>{Math.round(summary.durationMin * summary.targetRpe)}</b> por sessão.{" "}
            {linked === false
              ? <span className="text-muted-foreground">Paciente sem cadastro: a dose não vai para o microciclo.</span>
              : <span className="text-muted-foreground">Vai automaticamente para o microciclo (Fisioterapia) dos próximos 7 dias ao salvar.</span>}
          </p>
        </div>
      )}

      {(warn || jump) && (
        <div className="space-y-1">
          {warn && <Warn text={warn} />}
          {jump && <Warn text={`Séries semanais subiram ${jump}% em relação ao programa anterior (limite sugerido: 10%).`} />}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg bg-background p-2">
    <p className="text-base font-semibold tabular-nums">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const Warn = ({ text }: { text: string }) => (
  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {text}
  </p>
);

export default HepLoadPanel;
