import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Pencil, Target, CalendarClock } from "lucide-react";
import { ACL_PREOP_PHASES, computePreOpStatus, prefillAclPreoperative, type SurgicalAssessment } from "@/lib/aclPreoperative";
import { localISODate } from "@/lib/periodization";
import { useToast } from "@/hooks/use-toast";

interface Preparation {
  patient_id: string;
  planned_surgery_date: string | null;
  surgeon_restrictions: string | null;
  criteria: Record<string, boolean>;
}

export default function AclPreoperativeCard({ patientId, assessments }: { patientId: string; assessments: SurgicalAssessment[] }) {
  const { toast } = useToast();
  const [allowed, setAllowed] = useState(false);
  const [row, setRow] = useState<Preparation | null>(null);
  const [draft, setDraft] = useState<Preparation | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const prefill = prefillAclPreoperative(assessments);

  useEffect(() => {
    let cancelled = false;
    setAllowed(false); setRow(null); setDraft(null); setView(null);
    (async () => {
      const { data: ok } = await supabase.rpc("can_use_post_op_beta");
      if (!ok || cancelled) return;
      const { data } = await supabase.from("pre_op_profiles").select("patient_id, planned_surgery_date, surgeon_restrictions, criteria").eq("patient_id", patientId).maybeSingle();
      if (!cancelled) { setRow(data as Preparation | null); setAllowed(true); }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const save = async (next: Preparation) => {
    setBusy(true);
    const { data, error } = await supabase.from("pre_op_profiles").upsert({ ...next, surgery_type: "acl_reconstruction" }, { onConflict: "patient_id" }).select("patient_id, planned_surgery_date, surgeon_restrictions, criteria").single();
    setBusy(false);
    if (error) { toast({ title: "Não foi possível salvar a preparação", description: error.message, variant: "destructive" }); return; }
    setRow(data as Preparation); setDraft(null);
  };
  if (!allowed || (!row && !prefill)) return null;

  const edit = () => setDraft(row ?? { patient_id: patientId, planned_surgery_date: prefill?.planned_surgery_date ?? null, surgeon_restrictions: prefill?.surgeon_restrictions ?? null, criteria: {} });
  const status = row ? computePreOpStatus(row, localISODate()) : null;
  const index = view ?? status?.currentPhaseIndex ?? 0;
  const phase = ACL_PREOP_PHASES[index];
  const current = index === status?.currentPhaseIndex;
  const countdown = status?.daysUntilSurgery;

  return <Card id="sec-pre-operatorio" className="scroll-mt-24">
    <CardHeader className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Pré-operatório: Reconstrução do LCA <Badge variant="outline">Beta</Badge></CardTitle>
        {row && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={edit} aria-label="Editar preparação cirúrgica"><Pencil className="h-3.5 w-3.5" /></Button>}
      </div>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
      {draft ? <div className="space-y-3">
        {!row && prefill && <p className="text-xs text-muted-foreground">Dados da avaliação de {prefill.sourceDate.split("-").reverse().join("/")}. Confira antes de salvar.</p>}
        <div><Label htmlFor="preop-date">Data marcada da cirurgia (opcional)</Label><Input id="preop-date" type="date" value={draft.planned_surgery_date ?? ""} onChange={(e) => setDraft({ ...draft, planned_surgery_date: e.target.value || null })} /></div>
        <div><Label htmlFor="preop-restrictions">Restrições e orientações do cirurgião</Label><Textarea id="preop-restrictions" rows={3} value={draft.surgeon_restrictions ?? ""} onChange={(e) => setDraft({ ...draft, surgeon_restrictions: e.target.value || null })} /></div>
        <div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>Cancelar</Button><Button disabled={busy} onClick={() => save(draft)}>Salvar preparação</Button></div>
      </div> : !row ? <div className="flex flex-wrap items-center justify-between gap-3"><p>Preparação de LCA registrada na avaliação.</p><Button onClick={edit}>Ativar preparação</Button></div> : status ? <>
        <p className="text-xs text-muted-foreground">{countdown == null ? "Cirurgia sem data marcada informada." : countdown > 0 ? `Faltam ${countdown} dias para a cirurgia planejada.` : countdown === 0 ? "Cirurgia planejada para hoje — confirme se foi realizada." : "A data planejada passou — confirme realização ou reagendamento."} Nenhuma contagem pós-cirurgia é iniciada.</p>
        <div className="grid grid-cols-3 gap-2">{ACL_PREOP_PHASES.map((item, i) => <Button key={item.id} variant={i === index ? "default" : "outline"} className="h-auto min-h-12 whitespace-normal text-xs px-2" onClick={() => setView(i === status.currentPhaseIndex ? null : i)}>{i + 1}. {item.title}</Button>)}</div>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{current ? "Etapa atual" : index < status.currentPhaseIndex ? "Etapa anterior" : "Etapa seguinte · metas construídas progressivamente"}</p><p className="font-semibold">{phase.title}</p></div>{!current && <Button variant="ghost" size="sm" onClick={() => setView(null)}>Voltar à etapa atual</Button>}</div>
        {row.surgeon_restrictions && <p className="text-xs text-muted-foreground">Cirurgião: {row.surgeon_restrictions}</p>}
        <div className="grid gap-3 sm:grid-cols-2 text-xs"><div><p className="font-medium mb-1">{current ? "O que trabalhar agora" : "Objetivos desta etapa"}</p>{phase.focus.map((item) => <p key={item}>• {item}</p>)}</div><div><p className="font-medium mb-1">Evitar nesta etapa</p>{phase.avoid.map((item) => <p key={item}>• {item}</p>)}</div></div>
        <div className="border-t pt-3 space-y-2"><p className="flex items-center gap-1 font-medium"><Target className="h-4 w-4 text-primary" />{index === 2 ? "Metas de preparação para a cirurgia" : "Metas para a etapa seguinte"}</p><p className="text-xs text-muted-foreground">Construídas ao longo da etapa, não exigidas no início. Próximo marco: {phase.nextMilestone}.</p>{phase.exitCriteria.map((goal) => <label key={goal.id} className="flex items-start gap-2"><Checkbox className="mt-0.5" disabled={!current || busy} checked={!!row.criteria[goal.id]} onCheckedChange={(checked) => save({ ...row, criteria: { ...row.criteria, [goal.id]: checked === true } })} /><span>{goal.label}</span></label>)}{current && <div className="flex items-center gap-2"><Progress value={100 * status.met / status.total} className="h-2" /><span className="text-xs whitespace-nowrap">{status.met}/{status.total} metas</span></div>}</div>
        {status.preparationComplete && <p className="text-xs text-primary">Metas de preparação registradas. Mantenha as conquistas e confirme a conduta com a equipe cirúrgica. Isso não autoriza cirurgia nem ativa o pós-operatório automaticamente.</p>}
        <p className="text-xs text-muted-foreground">Bloqueio, falseio novo ou piora importante exigem reavaliação. As etapas organizam a preparação individual; o cirurgião define indicação e momento da cirurgia.</p>
      </> : null}
    </CardContent>
  </Card>;
}