import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileDown, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";
import { fetchCheckins, fetchSrpe, type PeriodizationPlan, type ReadinessCheckin, type SrpeEntry } from "@/lib/periodizationData";
import { acwr, localISODate, restingHrStatus } from "@/lib/periodization";
import { DEFAULT_CARDIO_PROFILE, ageFromBirth, cardioMatrix, hrCeiling, profileRule } from "@/lib/cardioSafety";
import {
  CARDIO_REFERENCES, WHO_MODERATE_MIN, addIsoDays, analyzePeriod, fmtNum, patientReadings, periodReadings, profileGoal, shortDate,
  type AnalysisContext,
} from "@/lib/cardioAnalysis";
import { cardioReportFileName, generateCardioReportPdfBlob, type BrandLogo } from "@/utils/generateCardioReportPdf";
import CardioSessionAnalysis from "./CardioSessionAnalysis";
import { TRACK_LABEL } from "./scales";

interface Props {
  patientId: string;
  plan: PeriodizationPlan | null;
  /** Muda quando o prontuário recarrega: refaz a busca do período. */
  entries: SrpeEntry[];
  patientName?: string | null;
  professionalName?: string | null;
  clinicId?: string | null;
}

const PERIODS = [4, 8, 12] as const;
const tooltipStyle = { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 };

async function loadLogo(url: string | null | undefined): Promise<BrandLogo | null> {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const dataUrl = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    const dims = await new Promise<{ natW: number; natH: number }>((res) => { const img = new Image(); img.onload = () => res({ natW: img.naturalWidth, natH: img.naturalHeight }); img.onerror = () => res({ natW: 1, natH: 1 }); img.src = dataUrl; });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

/** Painel de análise cardiovascular do prontuário + relatório especial (técnico e do paciente). */
const CardioAnalysisPanel = ({ patientId, plan, entries, patientName, professionalName, clinicId }: Props) => {
  const { toast } = useToast();
  const birth = usePatientBirthDate(patientId);
  const [weeks, setWeeks] = useState<number>(4);
  const [data, setData] = useState<{ srpe: SrpeEntry[]; checkins: ReadinessCheckin[] } | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [busy, setBusy] = useState<"technical" | "patient" | null>(null);
  const today = localISODate();

  useEffect(() => {
    let off = false;
    const since = addIsoDays(today, -(weeks * 7 + 28));
    Promise.all([fetchSrpe(patientId, since), fetchCheckins(patientId, since)]).then(([srpe, checkins]) => {
      if (!off) setData({ srpe, checkins });
    });
    return () => { off = true; };
  }, [patientId, weeks, entries, today]);

  const profile = plan?.cardio_profile ?? DEFAULT_CARDIO_PROFILE;
  const age = ageFromBirth(birth);
  const ctx: AnalysisContext = useMemo(() => ({
    profile: profileRule(profile).key,
    betaBlocker: !!plan?.beta_blocker,
    ceiling: hrCeiling({ profile, age, override: plan?.hr_ceiling_override ?? null }),
  }), [profile, age, plan?.beta_blocker, plan?.hr_ceiling_override]);

  const analysis = useMemo(() => data ? analyzePeriod({ entries: data.srpe, checkins: data.checkins, ctx, weeks, today }) : null, [data, ctx, weeks, today]);
  const matrixText = useMemo(() => {
    if (!data) return null;
    const ratio = acwr(data.srpe.filter((e) => e.track === "cardio") as any);
    return ratio === null ? null : cardioMatrix(ratio, restingHrStatus(data.checkins).delta, profile).text;
  }, [data, profile]);
  const readings = useMemo(() => analysis ? periodReadings(analysis, ctx, { matrixText }) : [], [analysis, ctx, matrixText]);
  const monitored = useMemo(() => analysis ? [...analysis.sessions].reverse().filter((s) => s.hrAvg !== null || s.hrMax !== null || s.zones !== null) : [], [analysis]);
  const selected = monitored.find((s) => s.id === sessionId) ?? monitored[0] ?? null;
  const goal = profileGoal(profile);

  const weekly = analysis?.weeks.map((w) => ({ semana: w.label, moderado: w.moderate, vigoroso: w.vigorous * 2, trimp: w.trimp, fcr: w.restingHr })) ?? [];
  const recovery = analysis?.recoverySeries.map((p) => ({ dia: shortDate(p.date), v: p.value })) ?? [];
  const efficiency = analysis?.efficiencySeries.map((p) => ({ dia: shortDate(p.date), v: p.value })) ?? [];
  const hasRhr = weekly.some((w) => w.fcr !== null);

  const report = async (variant: "technical" | "patient", share = false) => {
    if (!analysis) return;
    setBusy(variant);
    try {
      let logoUrl: string | null = null;
      if (clinicId) {
        const { data: c } = await supabase.from("clinics").select("logo_url").eq("id", clinicId).maybeSingle();
        logoUrl = c?.logo_url ?? null;
      }
      if (!logoUrl) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user?.id) {
          const { data: pro } = await supabase.from("professionals").select("logo_url").eq("user_id", auth.user.id).maybeSingle();
          logoUrl = (pro as { logo_url?: string | null } | null)?.logo_url ?? null;
        }
      }
      const opts = {
        variant, period: analysis, ceiling: ctx.ceiling, profile, betaBlocker: ctx.betaBlocker, age,
        readings: variant === "technical" ? readings : patientReadings(analysis, ctx),
        patientName, professionalName, logo: await loadLogo(logoUrl),
      };
      const blob = await generateCardioReportPdfBlob(opts);
      const name = cardioReportFileName(opts);
      const file = new File([blob], name, { type: "application/pdf" });
      if (share && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Relatório do coração" }).catch(() => undefined);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (share) toast({ title: "PDF baixado", description: "Anexe o arquivo na conversa do WhatsApp com o paciente." });
      }
    } catch {
      toast({ title: "Não foi possível gerar o relatório", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-muted-foreground">
          Perfil <strong className="text-foreground">{profileRule(profile).label}</strong>
          {ctx.ceiling.ceiling ? <> · teto <strong className="text-foreground">{ctx.ceiling.ceiling} bpm</strong></> : " · sem teto (cadastre a data de nascimento)"}
          {ctx.betaBlocker && " · betabloqueador"}
        </p>
        <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Período da análise">
          {PERIODS.map((w) => (
            <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)}
              className={`rounded-md px-2.5 py-1 text-xs transition ${weeks === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {w} sem.
            </button>
          ))}
        </div>
      </div>

      {!analysis ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando análise…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["Meta OMS atingida", `${analysis.whoWeeksMet}/${analysis.weeks.length} sem.`, false],
              ["Média semanal", `${analysis.avgEquivalent} min eq.`, false],
              ["Acima do teto", `${analysis.counts.aboveCeiling} de ${analysis.monitoredSessions}`, analysis.counts.aboveCeiling > 0],
              ["Recuperação 1º min", analysis.avgRecovery !== null ? `${analysis.avgRecovery} bpm` : "—", analysis.avgRecovery !== null && analysis.avgRecovery <= 12],
            ] as Array<[string, string, boolean]>).map(([l, v, warn]) => (
              <div key={l} className={`min-w-0 rounded-lg p-2 ${warn ? "bg-destructive/10" : "bg-muted/50"}`}>
                <div className="truncate text-[11px] text-muted-foreground">{l}</div>
                <div className={`truncate text-sm font-semibold ${warn ? "text-destructive" : "text-foreground"}`}>{v}</div>
              </div>
            ))}
          </div>

          {analysis.aerobicSessions === 0 ? (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Ainda não há sessões aeróbias neste período. Os gráficos aparecem quando houver sessão de cardio/corrida, outro esporte ou qualquer sessão com FC do monitor. Tente um período maior ou lance uma sessão monitorada.
            </p>
          ) : (<>
          <div>
            <p className="text-xs font-medium text-foreground">Minutos aeróbios por semana × meta da OMS</p>
            <p className="mb-1 text-[11px] text-muted-foreground">Vigoroso conta em dobro (1 min vigoroso = 2 moderados). Semanas móveis de 7 dias.</p>
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={34} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, k: string) => [`${v} min`, k === "vigoroso" ? "vigoroso (×2)" : k]} />
                  <ReferenceLine y={WHO_MODERATE_MIN} stroke="hsl(var(--chart-3))" strokeDasharray="4 3" label={{ value: "meta 150", fontSize: 10, position: "insideTopRight", fill: "hsl(var(--muted-foreground))" }} />
                  <Bar dataKey="moderado" stackId="a" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="vigoroso" stackId="a" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {analysis.distribution && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Distribuição de intensidade (modelo polarizado ~80/20)</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div style={{ width: `${100 - analysis.distribution.pctHigh}%`, backgroundColor: "hsl(var(--chart-2))" }} />
                <div style={{ width: `${analysis.distribution.pctHigh}%`, backgroundColor: analysis.distribution.status === "excess" ? "hsl(var(--destructive))" : "hsl(var(--chart-1))" }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{100 - analysis.distribution.pctHigh}% leve/moderado (Z1–Z3) · {analysis.distribution.pctHigh}% intenso (Z4–Z5)</p>
            </div>
          )}
          {analysis.prescribed && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Sessões dentro da zona prescrita</p>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full" style={{ width: `${analysis.prescribed.pct}%`, backgroundColor: analysis.prescribed.pct >= 80 ? "hsl(var(--chart-1))" : "hsl(var(--destructive))" }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{analysis.prescribed.inZone} de {analysis.prescribed.total} ({analysis.prescribed.pct}%) · {goal.intensity}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium text-foreground">Carga por FC (TRIMP) semanal{hasRhr ? " e FC ao acordar" : ""}</p>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="semana" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis yAxisId="t" tick={{ fontSize: 10 }} width={34} className="fill-muted-foreground" />
                    {hasRhr && <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={30} className="fill-muted-foreground" domain={["dataMin - 3", "dataMax + 3"]} />}
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, k: string) => [k === "fcr" ? `${v} bpm` : v, k === "fcr" ? "FC ao acordar" : "TRIMP"]} />
                    <Line yAxisId="t" dataKey="trimp" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    {hasRhr && <Line yAxisId="r" dataKey="fcr" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 2 }} connectNulls />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {recovery.length >= 2 && (
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-foreground">Recuperação da FC no 1º minuto (bpm)</p>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recovery}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={30} className="fill-muted-foreground" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} bpm`, "Recuperação"]} />
                      <ReferenceLine y={12} stroke="hsl(var(--destructive))" strokeDasharray="4 3" />
                      <Line dataKey="v" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {efficiency.length >= 2 && (
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-foreground">Eficiência cardíaca (metros por batimento)</p>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={efficiency}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={34} className="fill-muted-foreground" domain={["auto", "auto"]} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtNum(v), "m/batimento"]} />
                      <Line dataKey="v" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          </>)}

          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Leituras do período</p>
            <ul className="space-y-1">
              {readings.map((r) => <li key={r} className="flex gap-1.5 text-xs text-foreground"><span className="shrink-0 text-primary">•</span><span>{r}</span></li>)}
            </ul>
            <p className="text-[11px] text-muted-foreground">Sugestão de acompanhamento, não diagnóstico.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">Análise por sessão</p>
              {monitored.length > 0 && (
                <Select value={selected?.id ?? ""} onValueChange={setSessionId}>
                  <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-64 [&>span]:truncate"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monitored.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{shortDate(s.date)} · {TRACK_LABEL[s.track] ?? s.track} · {s.durationMin} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selected ? <CardioSessionAnalysis s={selected} ctx={ctx} /> : <p className="text-xs text-muted-foreground">Nenhuma sessão com dados do monitor neste período.</p>}
          </div>

          <details className="rounded-xl border border-border p-3 text-xs">
            <summary className="cursor-pointer font-medium text-foreground">Metas do perfil e referências</summary>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">{goal.title}:</strong> {goal.intensity}. {goal.weekly}. Fonte: {goal.source}.</p>
              <ul className="list-disc space-y-0.5 pl-4">{CARDIO_REFERENCES.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </details>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-xl" disabled={!!busy} onClick={() => report("technical")}>
              {busy === "technical" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}Relatório técnico (PDF)
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={!!busy} onClick={() => report("patient")}>
              {busy === "patient" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}Versão do paciente (PDF)
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-xl" disabled={!!busy} onClick={() => report("patient", true)}>
              <Share2 className="mr-1 h-4 w-4" />Enviar ao paciente
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CardioAnalysisPanel;
