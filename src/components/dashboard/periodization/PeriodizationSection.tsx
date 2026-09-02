import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  patientId?: string | null;
  professionalId?: string | null;
  clinicId?: string | null;
  latestAssessmentId?: string | null;
  readOnly?: boolean;
  isDemo?: boolean;
}

const PeriodizationSection = ({
  patientId,
  professionalId,
  clinicId,
  latestAssessmentId,
  readOnly,
  isDemo,
}: Props) => {
  const { toast } = useToast();
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
    if (!patientId) return;
    setCreating(true);
    try {
      await createPlanWithTemplate({
        patientId,
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

  if (isDemo || !patientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Gauge className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            A periodização de carga fica disponível para pacientes cadastrados.
          </p>
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
