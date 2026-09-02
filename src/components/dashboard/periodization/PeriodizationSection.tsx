import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ClearanceItem,
  PeriodizationCycle,
  PeriodizationLink,
  PeriodizationPlan,
  PeriodizationSession,
  PlanRestriction,
  ReadinessCheckin,
  SrpeEntry,
  createPlanWithTemplate,
  fetchActivePlan,
  fetchCheckins,
  fetchClearance,
  fetchCycles,
  fetchLinks,
  fetchRestrictions,
  fetchSessions,
  fetchSrpe,
} from "@/lib/periodizationData";
import LoadMonitorCard from "./LoadMonitorCard";
import MacroTimeline from "./MacroTimeline";
import MicroWeekGrid from "./MicroWeekGrid";
import ClearanceChecklistCard from "./ClearanceChecklistCard";
import BridgeCard from "./BridgeCard";

interface Props {
  /** Id do registro em `patients`, quando o prontuário já o conhece. */
  patientId?: string | null;
  /** Fallbacks para resolver (ou criar) o registro do paciente. */
  patientName?: string | null;
  patientEmail?: string | null;
  professionalId?: string | null;
  clinicId?: string | null;
  latestAssessmentId?: string | null;
  readOnly?: boolean;
  isDemo?: boolean;
}

const PeriodizationSection = ({
  patientId: patientIdProp,
  patientName,
  patientEmail,
  professionalId,
  clinicId,
  latestAssessmentId,
  readOnly,
  isDemo,
}: Props) => {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState<string | null>(patientIdProp ?? null);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plan, setPlan] = useState<PeriodizationPlan | null>(null);
  const [cycles, setCycles] = useState<PeriodizationCycle[]>([]);
  const [sessions, setSessions] = useState<PeriodizationSession[]>([]);
  const [entries, setEntries] = useState<SrpeEntry[]>([]);
  const [checkins, setCheckins] = useState<ReadinessCheckin[]>([]);
  const [clearance, setClearance] = useState<ClearanceItem[]>([]);
  const [restrictions, setRestrictions] = useState<PlanRestriction[]>([]);
  const [links, setLinks] = useState<PeriodizationLink[]>([]);
  const [sport, setSport] = useState("");


  // Resolve o registro em `patients` quando o prontuário não passa o id
  // (pacientes agrupados por e-mail podem não ter registro carregado).
  useEffect(() => {
    if (patientIdProp) { setPatientId(patientIdProp); return; }
    if (isDemo || (!patientEmail && !patientName)) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const sb = supabase as any;
      let q = sb.from("patients").select("id").limit(1);
      q = patientEmail ? q.eq("email", patientEmail) : q.eq("full_name", patientName);
      if (clinicId) q = q.eq("clinic_id", clinicId);
      else if (professionalId) q = q.eq("professional_id", professionalId);
      const { data } = await q.maybeSingle();
      if (!cancelled) {
        setPatientId(data?.id ?? null);
        if (!data?.id) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientIdProp, patientEmail, patientName, clinicId, professionalId, isDemo]);

  const ensurePatientRecord = async (): Promise<string | null> => {
    if (patientId) return patientId;
    setResolving(true);
    try {
      const sb = supabase as any;
      const payload: Record<string, any> = { full_name: patientName || patientEmail || "Paciente" };
      if (patientEmail) payload.email = patientEmail;
      if (clinicId) payload.clinic_id = clinicId;
      else if (professionalId) payload.professional_id = professionalId;
      const { data, error } = await sb.from("patients").insert(payload).select("id").single();
      if (error) throw error;
      setPatientId(data.id);
      return data.id as string;
    } catch (e: any) {
      toast({ title: "Não foi possível ativar", description: e?.message, variant: "destructive" });
      return null;
    } finally {
      setResolving(false);
    }
  };

  const load = useCallback(async () => {
    if (!patientId || isDemo) { setLoading(false); return; }

    setLoading(true);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 90);
    const sinceISO = since.toISOString().slice(0, 10);

    const [activePlan, srpe, checks, linkRows] = await Promise.all([
      fetchActivePlan(patientId),
      fetchSrpe(patientId, sinceISO),
      fetchCheckins(patientId, sinceISO),
      fetchLinks(patientId),
    ]);
    setPlan(activePlan);
    setEntries(srpe);
    setCheckins(checks);
    setLinks(linkRows);

    if (activePlan) {
      const [cy, se, cl, re] = await Promise.all([
        fetchCycles(activePlan.id),
        fetchSessions(activePlan.id),
        fetchClearance(activePlan.id),
        fetchRestrictions(activePlan.id),
      ]);
      setCycles(cy);
      setSessions(se);
      setClearance(cl);
      setRestrictions(re);
    } else {
      setCycles([]); setSessions([]); setClearance([]); setRestrictions([]);
    }
    setLoading(false);
  }, [patientId, isDemo]);

  useEffect(() => { load(); }, [load]);

  const createPlan = async () => {
    const id = await ensurePatientRecord();
    if (!id) return;
    setCreating(true);
    try {
      await createPlanWithTemplate({
        patientId: id,
        professionalId,
        clinicId,
        assessmentId: latestAssessmentId,
        sport: sport.trim() || null,
      });
      await load();
      toast({ title: "Periodização criada", description: "Fases do STEPS e checklist de liberação já pré-preenchidos." });
    } catch (e: any) {
      toast({ title: "Não foi possível criar", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (isDemo) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Gauge className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No ambiente simulado a periodização de carga fica apenas ilustrativa.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activateAndCreateLink = async () => {
    const id = await ensurePatientRecord();
    if (!id) return;
    try {
      const link = await createLink({ patientId: id, planId: null, audience: "patient" });
      const url = `${getPublicOrigin()}/carga/${link.token}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      await load();
      toast({ title: "Link de check-in criado", description: "Link copiado para a área de transferência." });
    } catch (e: any) {
      toast({ title: "Não foi possível criar o link", description: e?.message, variant: "destructive" });
    }
  };

  if (!patientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 space-y-3 text-center">
          <Gauge className="h-6 w-6 text-primary/60 mx-auto" />
          <p className="text-sm font-medium text-foreground">Monitorar carga e prontidão</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Registre sRPE e check-ins diários (sono, dor, fadiga, estresse, prontidão) e acompanhe o ACWR.
            O paciente responde por um link próprio (como o link de adendo), sem precisar de conta.
          </p>
          {!readOnly && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button className="rounded-xl gap-1" onClick={activateAndCreateLink} disabled={resolving}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Gerar link de check-in
              </Button>
              <Button variant="outline" className="rounded-xl gap-1" onClick={async () => { const id = await ensurePatientRecord(); if (id) load(); }} disabled={resolving}>
                <Plus className="h-4 w-4" />
                Ativar sem link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }


  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando periodização…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Monitoramento funciona mesmo sem plano estruturado. */}
      <LoadMonitorCard
        patientId={patientId}
        planId={plan?.id ?? null}
        entries={entries}
        checkins={checkins}
        onChanged={load}
        readOnly={readOnly}
      />

      <BridgeCard
        patientId={patientId}
        planId={plan?.id ?? null}
        restrictions={restrictions}
        links={links}
        onChanged={load}
        readOnly={readOnly}
      />

      {plan ? (
        <>
          <MacroTimeline cycles={cycles} />
          <MicroWeekGrid planId={plan.id} sessions={sessions} onChanged={load} readOnly={readOnly} />
          <ClearanceChecklistCard items={clearance} onChanged={load} readOnly={readOnly} />
        </>
      ) : !readOnly ? (
        <Card className="border-dashed">
          <CardContent className="py-6 space-y-3 text-center">
            <Gauge className="h-6 w-6 text-primary/60 mx-auto" />
            <p className="text-sm text-foreground font-medium">Estruturar periodização</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Cria o macrociclo a partir das fases do STEPS (cicatrização → força → potência → retorno ao esporte),
              os mesociclos do primeiro bloco e o checklist de liberação.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <Input
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="Esporte ou atividade (opcional)"
                className="text-sm"
              />
              <Button className="rounded-xl gap-1 shrink-0" onClick={createPlan} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default PeriodizationSection;
