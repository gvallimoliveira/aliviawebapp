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
          {prefilled && (
            <p className="sm:col-span-2 flex gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2 text-xs">
              <Info className="h-4 w-4 text-primary shrink-0" /> Pré-preenchido a partir da anamnese de {new Date(prefilled + "T12:00:00").toLocaleDateString("pt-BR")}. Confira e edite antes de salvar; o que não estava escrito ficou em branco.
            </p>
          )}
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
        {(() => {
          const cur = status.currentPhaseIndex;
          const idx = viewIdx ?? cur;
          const ph = ACL_PHASES[idx];
          const fmt = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
          const isCurrent = idx === cur;
          const allMet = status.met === status.total;
          const nextIdx = cur + 1;
          const timeLocked = isCurrent && allMet && nextIdx < ACL_PHASES.length && nextIdx > status.expectedPhaseIndex;
          return (
            <>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ACL_PHASES.length}, minmax(0,1fr))` }}>
                {ACL_PHASES.map((p, i) => (
                  <button type="button" key={p.id} onClick={() => setViewIdx(i === cur ? null : i)} className="text-left group" aria-label={`Ver fase ${p.title}`}>
                    <div className={`h-2 rounded-full ${i < cur ? "bg-primary" : i === cur ? "bg-primary/60" : "bg-muted"} ${i === idx ? "ring-2 ring-primary/40 ring-offset-1" : ""}`} />
                    <p className={`mt-1 text-[10px] leading-tight ${i === idx ? "font-semibold text-foreground" : "text-muted-foreground"} hidden sm:block`}>{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">sem. {p.fromWeek || 1}+</p>
                  </button>
                ))}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{isCurrent ? "Fase atual" : idx < cur ? "Fase anterior (concluída)" : `Próxima etapa · a partir de ${fmt(phaseUnlockDate(row.surgery_date, idx))}`}</p>
                  <p className="font-semibold">{ph.title}</p>
                  {ph.biologicalNote && <p className="text-xs text-muted-foreground mt-1">{ph.biologicalNote}</p>}
                </div>
                {!isCurrent && <Button type="button" variant="outline" size="sm" onClick={() => setViewIdx(null)}>Voltar à fase atual</Button>}
              </div>
              {isCurrent && status.behindSchedule && (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> O tempo pós-operatório já indicaria a fase "{ACL_PHASES[status.expectedPhaseIndex].title}", mas critérios desta fase ainda estão pendentes.
                </div>
              )}
              {timeLocked && (
                <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
                  <Lock className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <b>Critérios cumpridos — paciente pronto para avançar.</b> A fase "{ACL_PHASES[nextIdx].title}" fica disponível a partir de {fmt(phaseUnlockDate(row.surgery_date, nextIdx))} (semana {ACL_PHASES[nextIdx].fromWeek}), respeitando o tempo de proteção biológica do enxerto. Até lá: manter as conquistas desta fase e preparar a transição.{" "}
                    <button type="button" className="underline" onClick={() => setViewIdx(nextIdx)}>Ver próxima etapa</button>
                  </span>
                </div>
              )}
              {isCurrent && (status.caveats.length > 0 || row.surgeon_restrictions) ? (
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {status.caveats.map((c) => <li key={c}>• {c}</li>)}
                  {row.surgeon_restrictions && <li>• Cirurgião: {row.surgeon_restrictions}</li>}
                </ul>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div><p className="font-medium mb-1">{isCurrent ? "O que trabalhar agora" : "O que se trabalha nesta fase"}</p>{ph.focus.map((f) => <p key={f}>• {f}</p>)}</div>
                <div><p className="font-medium mb-1">Evitar nesta fase</p>{ph.avoid.map((f) => <p key={f}>• {f}</p>)}</div>
              </div>
              <div className="rounded-md border border-dashed p-3">
                <p className="flex items-center gap-1 font-medium"><Target className="h-4 w-4 text-primary" /> Metas para liberar a etapa seguinte</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">São construídas ao longo desta fase — não são exigidas no início. Próximo marco: {ph.nextMilestone}.</p>
                <div className="mt-2 space-y-1.5">
                  {ph.exitCriteria.map((c) => isCurrent ? (
                    <label key={c.id} className="flex items-start gap-2"><Checkbox className="mt-0.5" checked={!!effective[c.id]} onCheckedChange={(v) => toggle(c.id, !!v)} />
                      <span>{c.label}{auto[c.id] && row.criteria?.[c.id] === undefined && (
                        <span className="block text-[11px] text-muted-foreground">Automático · {auto[c.id].source} · {fmt(auto[c.id].date)}</span>
                      )}{auto[c.id] && row.criteria?.[c.id] !== undefined && row.criteria[c.id] !== auto[c.id].value && (
                        <span className="block text-[11px] text-muted-foreground">Marcação manual (medição indica: {auto[c.id].value ? "atingido" : "pendente"})</span>
                      )}</span>
                    </label>
                  ) : (
                    <p key={c.id} className="flex items-start gap-2 text-muted-foreground">
                      {effective[c.id] ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> : <span className="h-4 w-4 mt-0.5 shrink-0 rounded-full border" />} {c.label}
                    </p>
                  ))}
                </div>
                {isCurrent && <div className="mt-2 flex items-center gap-2"><Progress value={(status.met / status.total) * 100} className="h-2" /><span className="text-xs text-muted-foreground">{status.met}/{status.total} metas</span></div>}
              </div>
            </>
          );
        })()}
        <p className="text-[11px] text-muted-foreground">Guia de raciocínio: toque nas etapas para ver objetivos anteriores e seguintes. Não libera atividades automaticamente; decisões dependem da avaliação e do cirurgião.</p>
      </CardContent>
    </Card>
  );
}
