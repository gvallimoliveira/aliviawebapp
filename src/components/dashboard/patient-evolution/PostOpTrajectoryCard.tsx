import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, AlertTriangle, Target, Pencil } from "lucide-react";
import { ACL_PHASES, computePostOpStatus, autoCriteriaFromMeasurements, effectiveCriteria, prefillFromAnamnesis, phaseUnlockDate, type MeasuredAssessment } from "@/lib/postOpTrajectory";
import { Lock, CheckCircle2, Info } from "lucide-react";
import { localISODate } from "@/lib/periodization";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id?: string;
  patient_id: string;
  surgery_date: string;
  graft_type: string | null;
  meniscal_repair: boolean;
  surgeon_restrictions: string | null;
  criteria: Record<string, boolean>;
}

/** Beta (somente admin, validado no servidor): trajetória pós-operatória do caso. */
export default function PostOpTrajectoryCard({ patientId, suggestActivate, assessments = [] }: { patientId: string; suggestActivate: boolean; assessments?: MeasuredAssessment[] }) {
  const { toast } = useToast();
  const [allowed, setAllowed] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Row | null>(null);
  const [prefilled, setPrefilled] = useState<string | null>(null);
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: ok } = await supabase.rpc("can_use_post_op_beta" as any);
      if (cancel || !ok) return;
      setAllowed(true);
      const { data } = await supabase.from("post_op_profiles" as any).select("*").eq("patient_id", patientId).maybeSingle();
      if (!cancel && data) setRow(data as any);
    })();
    return () => { cancel = true; };
  }, [patientId]);

  const auto = useMemo(() => (row ? autoCriteriaFromMeasurements(assessments, row.surgery_date) : {}), [row, assessments]);
  const effective = useMemo(() => effectiveCriteria(row?.criteria, auto), [row, auto]);
  const status = useMemo(() => (row ? computePostOpStatus({ ...row, criteria: effective }, localISODate()) : null), [row, effective]);

  if (!allowed) return null;

  const save = async (next: Row) => {
    const payload = { ...next };
    delete (payload as any).id;
    const { data, error } = await supabase.from("post_op_profiles" as any).upsert(payload, { onConflict: "patient_id" }).select().single();
    if (error) { toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }); return; }
    setRow(data as any);
    setEditing(false);
  };

  const startEdit = () => {
    if (row) { setDraft(row); setPrefilled(null); setEditing(true); return; }
    const pre = prefillFromAnamnesis(assessments as any, localISODate());
    setPrefilled(pre?.sourceDate ?? null);
    setDraft({
      patient_id: patientId,
      surgery_date: pre?.surgery_date ?? localISODate(),
      graft_type: pre?.graft_type ?? null,
      meniscal_repair: pre?.meniscal_repair ?? false,
      surgeon_restrictions: pre?.surgeon_restrictions ?? null,
      criteria: {},
    });
    setEditing(true);
  };

  if (!row && !editing) {
    if (!suggestActivate) return null;
    return (
      <Card id="sec-pos-operatorio" className="scroll-mt-24 border-dashed">
        <CardContent className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm"><Scissors className="h-4 w-4 text-primary" /> Caso pós-operatório? Ative a trajetória do processo. <Badge variant="outline">Beta</Badge></div>
          <Button type="button" size="sm" onClick={startEdit}>Ativar</Button>
        </CardContent>
      </Card>
    );
  }

  if (editing && draft) {
    return (
      <Card id="sec-pos-operatorio" className="scroll-mt-24">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Dados da cirurgia</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label className="text-xs">Cirurgia</Label><Input value="Reconstrução do LCA" disabled className="mt-1" /></div>
          <div><Label className="text-xs">Data da cirurgia</Label><Input type="date" max={localISODate()} value={draft.surgery_date} onChange={(e) => setDraft({ ...draft, surgery_date: e.target.value })} className="mt-1" /></div>
          <div>
            <Label className="text-xs">Enxerto</Label>
            <Select value={draft.graft_type ?? "unknown"} onValueChange={(v) => setDraft({ ...draft, graft_type: v === "unknown" ? null : v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Não informado</SelectItem>
                <SelectItem value="patellar">Tendão patelar</SelectItem>
                <SelectItem value="hamstring">Flexores (isquiotibiais)</SelectItem>
                <SelectItem value="quadriceps">Quadricipital</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm mt-6"><Checkbox checked={draft.meniscal_repair} onCheckedChange={(v) => setDraft({ ...draft, meniscal_repair: !!v })} /> Sutura meniscal associada</label>
          <div className="sm:col-span-2"><Label className="text-xs">Restrições do cirurgião</Label><Textarea rows={2} value={draft.surgeon_restrictions ?? ""} onChange={(e) => setDraft({ ...draft, surgeon_restrictions: e.target.value || null })} className="mt-1" /></div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={!draft.surgery_date} onClick={() => save(draft)}>Salvar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!row || !status) return null;
  const toggle = (id: string, v: boolean) => save({ ...row, criteria: { ...row.criteria, [id]: v } });

  return (
    <Card id="sec-pos-operatorio" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Scissors className="h-4 w-4 text-primary" /> Pós-operatório: Reconstrução do LCA <Badge variant="outline">Beta</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge>Semana {status.week} · D+{status.days}</Badge>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit} aria-label="Editar cirurgia"><Pencil className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex gap-1">
          {ACL_PHASES.map((ph, i) => (
            <div key={ph.id} title={ph.title} className={`h-2 flex-1 rounded-full ${i < status.currentPhaseIndex ? "bg-primary" : i === status.currentPhaseIndex ? "bg-primary/60" : "bg-muted"}`} />
          ))}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fase atual</p>
          <p className="font-semibold">{status.phase.title}</p>
          {status.phase.biologicalNote && <p className="text-xs text-muted-foreground mt-1">{status.phase.biologicalNote}</p>}
        </div>
        {status.behindSchedule && (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> O tempo pós-operatório já indicaria a fase "{ACL_PHASES[status.expectedPhaseIndex].title}", mas critérios desta fase ainda estão pendentes.
          </div>
        )}
        {status.caveats.length > 0 || row.surgeon_restrictions ? (
          <ul className="text-xs space-y-1 text-muted-foreground">
            {status.caveats.map((c) => <li key={c}>• {c}</li>)}
            {row.surgeon_restrictions && <li>• Cirurgião: {row.surgeon_restrictions}</li>}
          </ul>
        ) : null}
        <div>
          <p className="flex items-center gap-1 font-medium"><Target className="h-4 w-4 text-primary" /> Próximo marco: {status.phase.nextMilestone}</p>
          <div className="mt-2 space-y-1.5">
            {status.phase.exitCriteria.map((c) => (
              <label key={c.id} className="flex items-start gap-2"><Checkbox className="mt-0.5" checked={!!effective[c.id]} onCheckedChange={(v) => toggle(c.id, !!v)} />
                <span>{c.label}{auto[c.id] && row.criteria?.[c.id] === undefined && (
                  <span className="block text-[11px] text-muted-foreground">Automático · {auto[c.id].source} · {new Date(auto[c.id].date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                )}{auto[c.id] && row.criteria?.[c.id] !== undefined && row.criteria[c.id] !== auto[c.id].value && (
                  <span className="block text-[11px] text-muted-foreground">Marcação manual (medição indica: {auto[c.id].value ? "atingido" : "pendente"})</span>
                )}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2"><Progress value={(status.met / status.total) * 100} className="h-2" /><span className="text-xs text-muted-foreground">{status.met}/{status.total}</span></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div><p className="font-medium mb-1">Foco agora</p>{status.phase.focus.map((f) => <p key={f}>• {f}</p>)}</div>
          <div><p className="font-medium mb-1">Evitar nesta fase</p>{status.phase.avoid.map((f) => <p key={f}>• {f}</p>)}</div>
        </div>
        <p className="text-[11px] text-muted-foreground">Guia de raciocínio: não libera atividades automaticamente. Decisões dependem da avaliação e do cirurgião.</p>
      </CardContent>
    </Card>
  );
}
