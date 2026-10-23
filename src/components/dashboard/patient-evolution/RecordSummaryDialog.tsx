import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, HeartPulse, Brain, CalendarDays, Copy, Dumbbell, ExternalLink, FileText, Gauge, Loader2, NotebookPen, Sparkles, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchActivePlan, fetchCheckins, fetchCycles, fetchSessionsByPatient, fetchSrpe } from "@/lib/periodizationData";
import { localISODate } from "@/lib/periodization";
import { CHART_WINDOW_DAYS, recentDaysWindow } from "@/lib/loadWindows";
import { loadRecoverySeries } from "@/lib/loadRecovery";
import { createDemoPeriodization } from "@/data/demoPeriodization";
import { currentStepsPhase, effectiveHypothesis, latestByCreated, latestEvolution, summaryClinicalAlerts, summaryHealthRecord, summaryImpression, summaryPainfulTests } from "@/lib/recordSummary";
import { functionalTests } from "@/data/functionalTestsData";
import i18n from "@/i18n";
import { formatHealthConditions, formatContinuousMedication } from "@/lib/healthHistory";
import { getRedFlagQuestionText } from "@/lib/redFlags";
import { DailyConductContent } from "../periodization/DailyConductCard";
import LoadRecoveryChart from "../periodization/LoadRecoveryChart";
import MicroWeekGrid from "../periodization/MicroWeekGrid";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";

type Lang = "pt" | "en" | "es";
const tr = (l: Lang, pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  language: Lang;
  patientName: string;
  patientEmail?: string | null;
  patientId: string | null;
  assessment: any;
  assessments: any[];
  latestAssessmentId?: string | null;
  heps: any[];
  isDemo?: boolean;
  onOpenAssessmentSummary: () => void;
}

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="min-w-0 max-w-full space-y-2">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">{icon}{title}</h4>
    {children}
  </section>
);

const LONG = 420;

const LiveConduct = ({ patientId, load }: { patientId: string; load: { plan: any; entries: any[]; checkins: any[]; sessions: any[] } }) => {
  const birth = usePatientBirthDate(patientId);
  return <DailyConductContent birth={birth} plan={load.plan} entries={load.entries} checkins={load.checkins} sessions={load.sessions} />;
};

const RecordSummaryDialog = ({ open, onOpenChange, language: l, patientName, patientEmail, patientId, assessment, assessments, latestAssessmentId, heps, isDemo, onOpenAssessmentSummary }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [load, setLoad] = useState<{ plan: any; entries: any[]; checkins: any[]; sessions: any[]; cycles: any[] }>({ plan: null, entries: [], checkins: [], sessions: [], cycles: [] });
  const [hepItems, setHepItems] = useState<string[]>([]);
  const [note, setNote] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHealthRecords([]);
    setHealthError(false);
    setHealthLoading(true);
    (async () => {
      try {
        if (isDemo) {
          const { mockHealthRecords } = await import("@/data/mockProDemoExtras");
          if (!cancelled) setHealthRecords((patientEmail && mockHealthRecords[patientEmail]) || []);
        } else if (patientId || patientEmail) {
          let query = (supabase as any).from("patient_health_records").select("*");
          if (patientId && patientEmail) query = query.or(`patient_id.eq.${patientId},patient_email.eq.${patientEmail}`);
          else if (patientId) query = query.eq("patient_id", patientId);
          else query = query.eq("patient_email", patientEmail);
          const { data, error } = await query;
          if (error) throw error;
          if (!cancelled) setHealthRecords(data || []);
        }
      } catch {
        if (!cancelled) setHealthError(true);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, isDemo, patientId, patientEmail]);

  useEffect(() => {
    if (!open) return;
    setExpanded(false);
    if (isDemo) {
      const f = createDemoPeriodization(undefined, patientName ?? "patient", latestAssessmentId);
      setLoad({ plan: f.plan, entries: f.entries, checkins: f.checkins, sessions: f.sessions, cycles: f.cycles });
      setNote(null);
      setHepItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 42);
      const sinceISO = localISODate(since);
      const [plan, entries, checkins, sessions, notes] = await Promise.all([
        patientId ? fetchActivePlan(patientId).catch(() => null) : Promise.resolve(null),
        patientId ? fetchSrpe(patientId, sinceISO).catch(() => []) : Promise.resolve([]),
        patientId ? fetchCheckins(patientId, sinceISO).catch(() => []) : Promise.resolve([]),
        patientId ? fetchSessionsByPatient(patientId, sinceISO).catch(() => []) : Promise.resolve([]),
        patientEmail
          ? (supabase as any).from("session_notes").select("session_date, created_at, content, observation").eq("patient_email", patientEmail)
              .order("session_date", { ascending: false }).order("created_at", { ascending: false }).limit(10)
              .then((r: any) => r.data || [], () => [])
          : Promise.resolve([]),
      ]);
      const cycles = plan?.id ? await fetchCycles(plan.id).catch(() => []) : [];
      const hep = latestByCreated(heps);
      const items = hep?.id
        ? await (supabase as any).from("exercise_program_items")
            .select("custom_name, sort_order, exercise:exercise_library(name_pt, name_en, name_es)")
            .eq("program_id", hep.id).order("sort_order", { ascending: true })
            .then((r: any) => r.data || [], () => [])
        : [];
      if (cancelled) return;
      setLoad({ plan, entries: entries as any[], checkins: checkins as any[], sessions: sessions as any[], cycles: cycles as any[] });
      setNote(latestEvolution(notes as any[]));
      setHepItems((items as any[]).map((it: any) => it.custom_name || (l === "en" ? it.exercise?.name_en : l === "es" ? it.exercise?.name_es : null) || it.exercise?.name_pt).filter(Boolean));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, isDemo, patientId, patientEmail, patientName, latestAssessmentId]);

  const chart = useMemo(() => {
    const w = recentDaysWindow([...load.entries.map((e) => e.session_date), ...load.checkins.map((c) => c.checkin_date)], CHART_WINDOW_DAYS, localISODate());
    return loadRecoverySeries(load.entries, load.checkins, w.from, w.to);
  }, [load.entries, load.checkins]);

  const hypothesis = effectiveHypothesis(assessment);
  const alerts = summaryClinicalAlerts(assessments);
  const health = summaryHealthRecord(assessments, healthRecords);
  const impression = summaryImpression(assessment?.diagnosis?.clinicalImpression);
  const hep = latestByCreated(heps);
  const hepLink = hep ? `${window.location.origin}/hep/${hep.token}` : null;
  const hasLoad = load.entries.length > 0 || load.checkins.length > 0 || load.sessions.length > 0;
  const locale = l === "pt" ? "pt-BR" : l === "es" ? "es-ES" : "en-US";
  const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "");
  const noteText: string = note ? [note.content, note.observation].filter((x: any) => (x || "").trim()).join("\n\n") : "";
  const empty = (t: string) => <p className="text-sm text-muted-foreground">{t}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100%-1rem)] min-w-0 max-w-2xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg p-4 sm:p-6">
        <DialogHeader className="min-w-0 shrink-0 pr-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg"><Sparkles className="h-4 w-4 shrink-0 text-primary" />{tr(l, "Resumo do prontuário", "Record summary", "Resumen de la historia")}</DialogTitle>
          <DialogDescription>{patientName}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 min-w-0 max-w-full space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain [overflow-wrap:anywhere]">
          <Section icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} title={tr(l, "Alerta clínico", "Clinical alert", "Alerta clínica")}>
            {alerts.length ? <div className="space-y-2">{alerts.map((alert, index) => (
              <div key={alert.id || index} className={alert.dismissedAt ? "border-l-2 border-border pl-3 space-y-1" : "border-l-2 border-destructive pl-3 space-y-1"}>
                <p className={alert.dismissedAt ? "text-xs font-medium text-muted-foreground" : "text-xs font-semibold text-destructive"}>
                  {alert.dismissedAt ? tr(l, "Dispensado pelo profissional", "Dismissed by professional", "Dispensado por el profesional") : tr(l, "Sinal de alarme — sob ressalva", "Red flag — requires clinical review", "Señal de alarma — bajo reserva")}
                </p>
                <ul className="list-disc pl-4 text-sm text-foreground space-y-1">{alert.items.map((item) => <li key={item}>{item.startsWith("redflags.") ? getRedFlagQuestionText(item, l) : item}</li>)}</ul>
                <p className="text-xs text-muted-foreground">{tr(l, "Avaliação", "Assessment", "Evaluación")} · {fmt(alert.date)}</p>
                {alert.dismissedAt && <p className="text-xs text-muted-foreground whitespace-pre-line">{fmt(alert.dismissedAt)}{alert.dismissedBy ? ` · ${alert.dismissedBy}` : ""}{alert.reason ? ` — ${alert.reason}` : ""}</p>}
              </div>
            ))}</div> : empty(tr(l, "Nenhum sinal de alarme registrado nas avaliações disponíveis.", "No red flags recorded in the available assessments.", "Ninguna señal de alarma registrada en las evaluaciones disponibles."))}
          </Section>

          <Section icon={<HeartPulse className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Ressalvas de saúde", "Health caveats", "Salvedades de salud")}>
            {healthLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <>
              {healthError && <p className="text-xs text-destructive">{tr(l, "Não foi possível consultar os registros de saúde geral; confira a seção Saúde geral.", "Could not load general health records; check General health.", "No se pudieron consultar los registros de salud general; revise Salud general.")}</p>}
              {health ? <div className="space-y-1 text-sm text-foreground">
                {formatHealthConditions(health.data, l) && <p>{formatHealthConditions(health.data, l)}</p>}
                {formatContinuousMedication(health.data, l) && <p>{tr(l, "Medicação contínua", "Continuous medication", "Medicación continua")}: {formatContinuousMedication(health.data, l)}</p>}
                <p className="text-xs text-muted-foreground">{health.source === "manual" ? tr(l, "Saúde geral", "General health", "Salud general") : tr(l, "Avaliação", "Assessment", "Evaluación")} · {fmt(health.date)}</p>
              </div> : !healthError && empty(tr(l, "Sem ressalvas de saúde registradas.", "No health caveats recorded.", "Sin salvedades de salud registradas."))}
            </>}
          </Section>

          <Section icon={<Stethoscope className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Hipótese diagnóstica", "Diagnostic hypothesis", "Hipótesis diagnóstica")}>
            {hypothesis ? <p className="text-sm text-foreground whitespace-pre-line">{hypothesis}</p> : empty(tr(l, "Sem hipótese registrada.", "No hypothesis recorded.", "Sin hipótesis registrada."))}
          </Section>

          <Section icon={<Brain className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Impressão clínica", "Clinical impression", "Impresión clínica")}>
            {impression ? <p className="text-sm text-foreground whitespace-pre-line">{impression}</p> : empty(tr(l, "Sem impressão clínica registrada.", "No clinical impression recorded.", "Sin impresión clínica registrada."))}
          </Section>

          <Section icon={<Gauge className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Carga e periodização", "Load & periodization", "Carga y periodización")}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : !hasLoad ? empty(tr(l, "Sem registros de carga ainda.", "No load records yet.", "Sin registros de carga aún.")) : (
              <div className="min-w-0 max-w-full space-y-4">
                {!isDemo && patientId ? <LiveConduct patientId={patientId} load={load} /> : <DailyConductContent birth={null} plan={load.plan} entries={load.entries} checkins={load.checkins} sessions={load.sessions} />}
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{tr(l, "Microciclo da semana", "Weekly microcycle", "Microciclo semanal")}</p>
                  <MicroWeekGrid patientId={patientId || "demo"} planId={load.plan?.id ?? null} sessions={load.sessions} entries={load.entries} onChanged={() => {}} readOnly patientName={patientName} />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{tr(l, "Carga diária × recuperação (PSR)", "Daily load × recovery (PSR)", "Carga diaria × recuperación (PSR)")}</p>
                  <LoadRecoveryChart data={chart} />
                </div>
              </div>
            )}
          </Section>

          <Section icon={<NotebookPen className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Última evolução", "Latest progress note", "Última evolución")}>
            {loading ? null : note ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmt(note.session_date || note.created_at)}</p>
                <p className="text-sm text-foreground whitespace-pre-line">{expanded || noteText.length <= LONG ? noteText : `${noteText.slice(0, LONG).trimEnd()}…`}</p>
                {noteText.length > LONG && <button type="button" className="text-xs text-primary hover:underline" onClick={() => setExpanded((v) => !v)}>{expanded ? tr(l, "ver menos", "show less", "ver menos") : tr(l, "ver mais", "show more", "ver más")}</button>}
              </div>
            ) : empty(tr(l, "Nenhuma evolução registrada.", "No progress note recorded.", "Ninguna evolución registrada."))}
          </Section>

          {hep && hepLink && (
            <Section icon={<Dumbbell className="h-3.5 w-3.5 text-primary" />} title={tr(l, "Último programa de exercícios", "Latest exercise program", "Último programa de ejercicios")}>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{fmt(hep.created_at)}{hep.notes && <span className="text-muted-foreground ml-2">— {hep.notes}</span>}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{hepLink}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hep.expires_at && new Date(hep.expires_at) < new Date() && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">{tr(l, "Expirado", "Expired", "Expirado")}</Badge>}
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={tr(l, "Copiar link", "Copy link", "Copiar enlace")} onClick={() => { navigator.clipboard.writeText(hepLink); toast({ title: tr(l, "Link copiado!", "Link copied!", "¡Enlace copiado!") }); }}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={tr(l, "Abrir link", "Open link", "Abrir enlace")} onClick={() => window.open(hepLink, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Section>
          )}
        </div>

        {assessment && (
          <DialogFooter className="min-w-0 shrink-0">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onOpenAssessmentSummary}>
              <FileText className="h-4 w-4" />{tr(l, "Ver avaliação completa", "View full assessment", "Ver evaluación completa")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecordSummaryDialog;
