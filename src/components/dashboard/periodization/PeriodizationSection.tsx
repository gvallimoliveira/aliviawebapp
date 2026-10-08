import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, Link2, Loader2, Plus } from "lucide-react";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useToast } from "@/hooks/use-toast";
import { anchorScroll } from "@/hooks/useScrollAnchor";
import { supabase } from "@/integrations/supabase/client";
import {
  PeriodizationCycle,
  PeriodizationLink,
  PeriodizationPlan,
  PeriodizationSession,
  PlanRestriction,
  ReadinessCheckin,
  SrpeEntry,
  createLink,
  createPlanWithTemplate,
  fetchActivePlan,
  fetchCheckins,
  fetchCycles,
  fetchLinks,
  fetchRestrictions,
  fetchSessionsByPatient,
  fetchSrpe,
} from "@/lib/periodizationData";
import LoadMonitorCard from "./LoadMonitorCard";
import DoseAdherenceCard from "./DoseAdherenceCard";
import MacroTimeline from "./MacroTimeline";
import MicroWeekGrid from "./MicroWeekGrid";
// Critérios de liberação desativados por ora (componente mantido no projeto).
import BridgeCard from "./BridgeCard";
import CardioSafetyCard from "./CardioSafetyCard";
import ProfessionalCardioEntry from "./ProfessionalCardioEntry";
import CardioFunctionalTestsCard from "./CardioFunctionalTestsCard";
import CardioAnalysisDialog from "./CardioAnalysisDialog";
import AutoPlanCard from "./AutoPlanCard";
import DailyConductCard from "./DailyConductCard";
import { HeartPulse } from "lucide-react";
import PeriodizationCollapsible from "./PeriodizationCollapsible";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  // Planejamento automático: restrito ao admin por ora.
  const isAdmin = user?.email === "gvallimoliveira@gmail.com";
  const [patientId, setPatientId] = useState<string | null>(patientIdProp ?? null);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plan, setPlan] = useState<PeriodizationPlan | null>(null);
  const [cycles, setCycles] = useState<PeriodizationCycle[]>([]);
  const [sessions, setSessions] = useState<PeriodizationSession[]>([]);
  const [entries, setEntries] = useState<SrpeEntry[]>([]);
  const [checkins, setCheckins] = useState<ReadinessCheckin[]>([]);
  const [restrictions, setRestrictions] = useState<PlanRestriction[]>([]);
  const [links, setLinks] = useState<PeriodizationLink[]>([]);
  const [sport, setSport] = useState("");
  const [proName, setProName] = useState<string | null>(null);

  // Nome de quem assina o PDF da semana: profissional logado; na clínica, a
  // clínica entra como fallback quando o perfil não tem nome preenchido.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        let name: string | null = null;
        if (auth?.user?.id) {
          const { data: me } = await supabase
            .from("professionals")
            .select("full_name")
            .eq("user_id", auth.user.id)
            .maybeSingle();
          name = me?.full_name ?? null;
        }
        if (!name && clinicId) {
          const { data: clinic } = await supabase.from("clinics").select("name").eq("id", clinicId).maybeSingle();
          name = clinic?.name ?? null;
        }
        if (!cancelled) setProName(name);
      } catch {
        /* nome é opcional no PDF */
      }
    })();
    return () => { cancelled = true; };
  }, [clinicId]);




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

  const loadedOnceRef = useRef(false);
  const lastTouchedRef = useRef<HTMLElement | null>(null);
  const viewAnchorRef = useRef<HTMLElement | null>(null);
  // Elemento estável perto do centro da tela, usado quando o botão tocado
  // desaparece após salvar (ex.: "Link do paciente" some quando o link existe).
  const pickViewportAnchor = (): HTMLElement | null => {
    const section = document.getElementById("sec-periodizacao");
    if (!section) return null;
    const mid = window.innerHeight / 2;
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    section.querySelectorAll<HTMLElement>("h3, h4, [data-periodization-block], .rounded-xl").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.height > window.innerHeight) return;
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = el; }
    });
    return best;
  };
  const anchorTarget = useCallback((): HTMLElement | null => {
    const el = lastTouchedRef.current;
    if (el && el.isConnected) return el;
    const v = viewAnchorRef.current;
    if (v && v.isConnected) return v;
    return document.getElementById("sec-periodizacao");
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!patientId || isDemo) { setLoading(false); return; }

    // Recarregar depois de um registro não deve colapsar a seção em um spinner
    // nem mover a página: guardamos a rolagem e restauramos após o re-render.
    // Só a PRIMEIRA carga mostra o spinner. Qualquer recarga posterior (links,
    // macrociclo, realtime) é silenciosa e ancorada no último ponto tocado, para
    // a página nunca "pular para o topo".
    const silent = opts?.silent || loadedOnceRef.current;
    const keepAnchored = silent ? anchorScroll(anchorTarget, 2200) : null;
    keepAnchored?.();
    if (!silent) setLoading(true);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 90);
    const sinceISO = since.toISOString().slice(0, 10);



    const [activePlan, srpe, checks, linkRows, plannedSessions] = await Promise.all([
      fetchActivePlan(patientId),
      fetchSrpe(patientId, sinceISO),
      fetchCheckins(patientId, sinceISO),
      fetchLinks(patientId),
      fetchSessionsByPatient(patientId, sinceISO),
    ]);
    setPlan(activePlan);
    setEntries(srpe);
    setCheckins(checks);
    setLinks(linkRows);
    setSessions(plannedSessions);

    if (activePlan) {
      const [cy, re] = await Promise.all([
        fetchCycles(activePlan.id),
        fetchRestrictions(activePlan.id),
      ]);
      setCycles(cy);
      setRestrictions(re);
    } else {
    }
    loadedOnceRef.current = true;
    setLoading(false);

  }, [patientId, isDemo, anchorTarget]);

  useEffect(() => { load(); }, [load]);

  // Atualização automática: quando o paciente/preparador registra check-in ou
  // sessão (inclusive pelo link público), a seção recarrega em silêncio.
  useEffect(() => {
    if (!patientId || isDemo) return;
    const channel = supabase
      .channel(`periodization:${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "readiness_checkins", filter: `patient_id=eq.${patientId}` }, () => load({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "srpe_entries", filter: `patient_id=eq.${patientId}` }, () => load({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "periodization_sessions", filter: `patient_id=eq.${patientId}` }, () => load({ silent: true }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [patientId, isDemo, load]);

  /**
   * Recarrega preservando a rolagem (sem spinner de página inteira). Ancoramos
   * na seção do prontuário: quando um card colapsa e volta, o navegador não
   * empurra mais a página para o topo.
   */
  const refresh = useCallback(() => {
    void load({ silent: true });
  }, [load]);

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
      await load({ silent: true });
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
              <Button type="button" className="rounded-xl gap-1" onClick={activateAndCreateLink} disabled={resolving}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Gerar link de check-in
              </Button>
              <Button type="button" variant="outline" className="rounded-xl gap-1" onClick={async () => { const id = await ensurePatientRecord(); if (id) load(); }} disabled={resolving}>
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
    <div
      className="space-y-3"
      onPointerDownCapture={(e) => {
        const t = e.target as HTMLElement;
        // Toques dentro de diálogos (portal) não servem de âncora: somem ao fechar.
        if (t.closest("[role='dialog'],[role='alertdialog']")) return;
        lastTouchedRef.current =
          (t.closest("[data-periodization-block]") as HTMLElement | null) ?? t.closest("button,a,[role='button']") ?? t;
        viewAnchorRef.current = pickViewportAnchor();
      }}
    >
      {/* Ordem do fluxo: macrociclo → links → sessão monitorada → carga+teto FC → dose+planejamento automático → microciclo. */}
      <DailyConductCard patientId={patientId} plan={plan} entries={entries} checkins={checkins} sessions={sessions} />

      {plan ? (
        <PeriodizationCollapsible title="Macrociclo (fases do STEPS)" icon={<Gauge className="h-4 w-4 text-primary" />} defaultOpen={false}>
          <MacroTimeline cycles={cycles} planId={plan.id} onChanged={refresh} readOnly={readOnly} />
        </PeriodizationCollapsible>
      ) : !readOnly && (
        <Card className="border-dashed">
          <CardContent className="py-6 space-y-3 text-center">
            <Gauge className="h-6 w-6 text-primary/60 mx-auto" />
            <p className="text-sm text-foreground font-medium">Estruturar periodização</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Cria o macrociclo a partir das fases do STEPS (cicatrização → força → potência → retorno ao esporte)
              e os mesociclos do primeiro bloco. O teto de FC e a carga já funcionam sem isso.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <Input
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="Esporte ou atividade (opcional)"
                className="text-sm"
              />
              <Button type="button" className="rounded-xl gap-1 shrink-0" onClick={createPlan} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PeriodizationCollapsible title="Links de check-in" icon={<Link2 className="h-4 w-4 text-primary" />}>
        <BridgeCard
          patientId={patientId}
          planId={plan?.id ?? null}
          restrictions={restrictions}
          links={links}
          onChanged={refresh}
          readOnly={readOnly}
        />
      </PeriodizationCollapsible>

      {!readOnly && (<>
        <PeriodizationCollapsible title="Sessão monitorada" icon={<HeartPulse className="h-4 w-4 text-primary" />}>
          <ProfessionalCardioEntry patientId={patientId} plan={plan} entries={entries} onChanged={refresh} />
        </PeriodizationCollapsible>
        <PeriodizationCollapsible title="Avaliação cardiorrespiratória (testes funcionais)" icon={<HeartPulse className="h-4 w-4 text-primary" />} defaultOpen={false}>
          <CardioFunctionalTestsCard patientId={patientId} entries={entries} />
        </PeriodizationCollapsible>
      </>)}

      <PeriodizationCollapsible title="Carga, prontidão e teto de FC" icon={<Gauge className="h-4 w-4 text-primary" />}>
        <LoadMonitorCard
          patientId={patientId}
          planId={plan?.id ?? null}
          entries={entries}
          checkins={checkins}
          onChanged={refresh}
          readOnly={readOnly}
        />
        <div className="mt-3">
          <CardioSafetyCard patientId={patientId} plan={plan} checkins={checkins} entries={entries} onChanged={refresh} readOnly={readOnly} />
        </div>
      </PeriodizationCollapsible>

      {entries.some((e: any) => e.hr_avg || e.hr_max || e.zone_minutes || e.trimp) && <CardioAnalysisDialog patientId={patientId} plan={plan} entries={entries} patientName={patientName} professionalName={proName} clinicId={clinicId} />}

      <PeriodizationCollapsible title={isAdmin ? "Dose planejada e percebida · Planejamento automático de dose de trabalho (sRPE)" : "Dose planejada e percebida"} icon={<Gauge className="h-4 w-4 text-primary" />}>
        <DoseAdherenceCard
          patientId={patientId}
          planId={plan?.id ?? null}
          sessions={sessions}
          entries={entries}
          onChanged={refresh}
          readOnly={readOnly}
        />
        {plan && isAdmin && (
          <div className="mt-3">
            <AutoPlanCard patientId={patientId} plan={plan} entries={entries} checkins={checkins} sessions={sessions} onChanged={refresh} readOnly={readOnly} />
          </div>
        )}
      </PeriodizationCollapsible>

      {(
        <PeriodizationCollapsible title="Microciclo da semana" icon={<Plus className="h-4 w-4 text-primary" />}>
          <MicroWeekGrid
            planId={plan?.id ?? null}
            patientId={patientId}
            sessions={sessions}
            entries={entries}
            onChanged={refresh}
            readOnly={readOnly}
            patientName={patientName}
            professionalName={proName}
            sport={plan?.sport ?? null}
            currentPhase={cycles.find((c) => c.level === "macro" && c.is_current)?.name ?? null}
          />
        </PeriodizationCollapsible>
      )}
    </div>
  );
};

export default PeriodizationSection;
