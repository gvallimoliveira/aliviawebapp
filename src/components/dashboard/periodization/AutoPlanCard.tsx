import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PeriodizationPlan, PeriodizationSession, ReadinessCheckin, SrpeEntry } from "@/lib/periodizationData";
import { saveSession } from "@/lib/periodizationData";
import { loadLevelFromRpe, localISODate } from "@/lib/periodization";
import { adjustToday, suggestNextWeek, type SuggestedSession } from "@/lib/autoPlan";
import { TRACK_LABEL } from "./scales";

interface Props {
  patientId: string;
  plan: PeriodizationPlan;
  entries: SrpeEntry[];
  checkins: ReadinessCheckin[];
  sessions: PeriodizationSession[];
  onChanged: () => void;
  readOnly?: boolean;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

const AutoPlanCard = ({ patientId, plan, entries, checkins, sessions, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<SuggestedSession[] | null>(null);
  const [saving, setSaving] = useState(false);
  const today = localISODate();

  const todayAdjust = useMemo(
    () => sessions.filter((s) => s.session_date === today)
      .map((s) => ({ s, adj: adjustToday(s, checkins, plan.cardio_profile) }))
      .filter((x) => x.adj),
    [sessions, checkins, plan.cardio_profile, today],
  );

  const suggest = () => {
    const r = suggestNextWeek(entries as any, plan.cardio_profile);
    setRows(r);
    if (!r.length) toast({ title: "Sem histórico suficiente", description: "Registre sessões nas últimas 4 semanas para gerar a sugestão." });
  };

  const upd = (i: number, patch: Partial<SuggestedSession>) =>
    setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (!rows?.length) return;
    setSaving(true);
    try {
      for (const r of rows) {
        await saveSession({
          plan_id: plan.id, patient_id: patientId, session_date: r.date, track: r.track,
          planned_duration_min: r.duration, planned_rpe: r.rpe,
          planned_load: loadLevelFromRpe(r.rpe, r.duration), title: "Sugestão automática",
        } as any);
      }
      toast({ title: "Semana salva no microciclo" });
      setRows(null);
      onChanged();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const applyAdjust = async (s: PeriodizationSession, duration: number, rpe: number) => {
    try {
      await saveSession({ id: s.id, plan_id: s.plan_id, session_date: s.session_date, planned_duration_min: duration, planned_rpe: rpe, planned_load: loadLevelFromRpe(rpe, duration) } as any);
      toast({ title: "Sessão de hoje ajustada" });
      onChanged();
    } catch (e: any) {
      toast({ title: "Não foi possível ajustar", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Card data-periodization-block>
      <CardContent className="pt-4 space-y-3">
        {todayAdjust.map(({ s, adj }) => (
          <div key={s.id} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
            <p className="text-foreground">
              Hoje ({TRACK_LABEL[s.track] ?? s.track}): {adj!.reason}. Sugestão: {adj!.duration} min, esforço até {adj!.rpe} — ou trocar por descanso ativo.
            </p>
            {!readOnly && (
              <Button type="button" size="sm" variant="outline" className="rounded-xl h-7" onClick={() => applyAdjust(s, adj!.duration, adj!.rpe)}>Aplicar ajuste</Button>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Sugere a próxima semana por frente a partir da carga das últimas 4 semanas: progride até 10%, respeita a faixa do perfil cardiovascular e alterna dias duros e leves. Você edita tudo antes de salvar.
        </p>
        {!readOnly && !rows && (
          <Button type="button" size="sm" className="rounded-xl gap-1" onClick={suggest}><Sparkles className="h-4 w-4" /> Sugerir próxima semana</Button>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                <Input type="date" value={r.date} onChange={(e) => upd(i, { date: e.target.value })} className="h-8 w-36 text-xs" aria-label="Data" />
                <Select value={r.track} onValueChange={(v) => upd(i, { track: v })}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TRACK_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={r.duration} onChange={(e) => upd(i, { duration: Number(e.target.value) || 0 })} className="h-8 w-20 text-xs" aria-label="Minutos" />
                <span className="text-[11px] text-muted-foreground">min</span>
                <Input type="number" min={0} max={10} value={r.rpe} onChange={(e) => upd(i, { rpe: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} className="h-8 w-16 text-xs" aria-label="Esforço" />
                <span className="text-[11px] text-muted-foreground">esforço · {dayLabel(r.date)} · {r.kind === "hard" ? "dia duro" : "dia leve"}</span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => setRows((rs) => rs && rs.filter((_, j) => j !== i))} aria-label="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" size="sm" className="rounded-xl" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar no microciclo
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => setRows(null)}>Descartar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoPlanCard;
