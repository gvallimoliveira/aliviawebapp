import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, FileText, Loader2, MessageSquareQuote, Smile } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import InsightCardShell from "./InsightCardShell";
import FeedbackResponsesDialog, { ResponseFilterChips, ResponseRow } from "./FeedbackResponsesDialog";
import {
  ATTENTION_THRESHOLD_PCT, MIN_ANSWERS_FOR_ALERT, FEEDBACK_ITEMS, areaScores, attentionPoints, byService, filterByPeriod,
  monthlyTrend, npsSummary, responseDetails, filterResponses, RESPONSE_PREVIEW, type FeedbackRow, type ItemScore, type ResponseFilter,
} from "@/lib/feedbackMetrics";
import { answerLabel, areaLabel, itemLabel, sentimentLabel, serviceLabel, type FbLang } from "@/lib/feedbackLabels";
import { downloadFeedbackCsv, printFeedbackReport } from "@/lib/feedbackExport";
import { useFeedbackClinicians } from "@/hooks/useFeedbackClinicians";
import { feedbackByClinician, feedbackClinicianKey, filterFeedbackClinician } from "@/lib/feedbackClinicians";

type Period = "30" | "90" | "365" | "all";
const SMALL_SAMPLE = 10;

/** Best → worst segments of an answer scale. */
const SEGMENT = ["bg-emerald-500", "bg-emerald-300", "bg-amber-400", "bg-red-500"];
const pctTone = (p: number | null) => (p === null ? "text-muted-foreground" : p >= 85 ? "text-emerald-700" : p >= 70 ? "text-amber-700" : "text-red-700");

const ItemRow = ({ s, l }: { s: ItemScore; l: FbLang }) => (
  <div className="space-y-1" data-testid={`feedback-item-${s.item.key}`}>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-foreground">{itemLabel(s.item.key, l)}</span>
      <span className={`text-sm font-semibold tabular-nums ${pctTone(s.positivePct)}`}>{s.positivePct === null ? "—" : `${s.positivePct}%`}</span>
    </div>
    {s.answered > 0 && (
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {s.counts.map((c, i) => (c.count ? <div key={c.value} className={SEGMENT[i]} style={{ width: `${(c.count / s.answered) * 100}%` }} /> : null))}
      </div>
    )}
    <p className="text-[11px] leading-snug text-muted-foreground">
      {s.answered === 0
        ? (l === "pt" ? "Sem respostas" : l === "es" ? "Sin respuestas" : "No answers")
        : s.counts.filter((c) => c.count).map((c) => `${answerLabel(c.value, l)} ${c.count}`).join(" · ")}
    </p>
  </div>
);

const FeedbackQualityCard = ({ clinicId }: { clinicId: string }) => {
  const l = useLanguage().language as FbLang;
  const t = (pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>("365");
  const [service, setService] = useState("all");
  const [voice, setVoice] = useState<ResponseFilter>("all");
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [professional, setProfessional] = useState("all");
  const { data: clinicians = [] } = useFeedbackClinicians(clinicId);

  const { data: all = [], isLoading, isError } = useQuery({
    queryKey: ["clinic-feedback", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_feedback_surveys")
        .select("id, created_at, service_type, professional_id, clinician_member_id, clinician_name, service_answers, professional_answers, clinic_answers, general_observations")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });

  const days = period === "all" ? null : Number(period);
  const professionalOptions = useMemo(() => {
    const options = new Map<string, string>();
    clinicians.forEach((c) => options.set(`member:${c.member_id}`, c.full_name));
    all.forEach((r) => {
      const key = feedbackClinicianKey(r);
      if (!options.has(key)) options.set(key, r.clinician_name || (key === "unassigned" ? t("Sem profissional identificado", "No identified professional", "Sin profesional identificado") : t("Profissional — registro antigo", "Professional — legacy record", "Profesional — registro antiguo")));
    });
    return [...options.entries()];
  }, [all, clinicians, l]);
  const activeProfessional = professional === "all" || professionalOptions.some(([key]) => key === professional) ? professional : "all";
  const professionalRows = useMemo(() => filterFeedbackClinician(all, activeProfessional), [all, activeProfessional]);
  const services = useMemo(() => [...new Set(all.map((r) => r.service_type))], [all]);
  const activeService = service !== "all" && !services.includes(service) ? "all" : service;
  const scoped = useMemo(() => (activeService === "all" ? professionalRows : professionalRows.filter((r) => r.service_type === activeService)), [professionalRows, activeService]);
  const rows = useMemo(() => filterByPeriod(scoped, days), [scoped, days]);
  const nps = useMemo(() => npsSummary(rows), [rows]);
  const prev = useMemo(() => (days === null ? null : npsSummary(filterByPeriod(scoped, days, new Date(), days))), [scoped, days]);
  const areas = useMemo(() => areaScores(rows), [rows]);
  const alerts = useMemo(() => attentionPoints(areas), [areas]);
  const trend = useMemo(() => monthlyTrend(rows), [rows]);
  const perService = useMemo(() => byService(filterByPeriod(professionalRows, days)), [professionalRows, days]);
  const details = useMemo(() => responseDetails(rows), [rows]);
  const perProfessional = useMemo(() => feedbackByClinician(rows), [rows]);
  const voices = useMemo(() => filterResponses(details, voice), [details, voice]);

  const delta = prev && nps.nps !== null && prev.nps !== null && nps.answered >= MIN_ANSWERS_FOR_ALERT && prev.answered >= MIN_ANSWERS_FOR_ALERT ? nps.nps - prev.nps : null;
  const periodLabel = { "30": t("Últimos 30 dias", "Last 30 days", "Últimos 30 días"), "90": t("Últimos 90 dias", "Last 90 days", "Últimos 90 días"), "365": t("Últimos 12 meses", "Last 12 months", "Últimos 12 meses"), all: t("Todo o período", "All time", "Todo el período") };
  const scopeLabel = `${periodLabel[period]} · ${activeService === "all" ? t("Todos os serviços", "All services", "Todos los servicios") : serviceLabel(activeService, l)} · ${activeProfessional === "all" ? t("Todos os profissionais", "All professionals", "Todos los profesionales") : professionalOptions.find(([key]) => key === activeProfessional)?.[1]}`;
  const openResponses = (id: string | null) => { setSelectedId(id); setResponsesOpen(true); };

  const info = (
    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
      <p className="text-sm font-semibold text-foreground">{t("Como é calculado", "How it's calculated", "Cómo se calcula")}</p>
      <p>{t("NPS = % que recomendaria − % que não recomendaria, sobre quem respondeu à pergunta \"Recomendaria o serviço?\" (Sim / Talvez / Não). É uma versão simplificada da escala tradicional de 0 a 10.", "NPS = % who would recommend − % who would not, over those who answered \"Would you recommend the service?\" (Yes / Maybe / No). It is a simplified version of the traditional 0–10 scale.", "NPS = % que recomendaría − % que no recomendaría, sobre quienes respondieron \"¿Recomendaría el servicio?\" (Sí / Tal vez / No). Es una versión simplificada de la escala tradicional de 0 a 10.")}</p>
      <p>{t("Em cada pergunta, o percentual é a parcela de respostas favoráveis (as duas melhores opções). Perguntas em branco não entram na conta.", "For each question, the percentage is the share of favourable answers (the two best options). Blank questions are left out.", "En cada pregunta, el porcentaje es la parte de respuestas favorables (las dos mejores opciones). Las preguntas en blanco no cuentan.")}</p>
      <p>{t(`Um ponto de atenção aparece quando a pergunta tem ao menos ${MIN_ANSWERS_FOR_ALERT} respostas e ${ATTENTION_THRESHOLD_PCT}% ou mais são desfavoráveis.`, `An attention point appears when a question has at least ${MIN_ANSWERS_FOR_ALERT} answers and ${ATTENTION_THRESHOLD_PCT}% or more are unfavourable.`, `Un punto de atención aparece cuando la pregunta tiene al menos ${MIN_ANSWERS_FOR_ALERT} respuestas y ${ATTENTION_THRESHOLD_PCT}% o más son desfavorables.`)}</p>
      <p>{t("A pesquisa é anônima: as respostas não identificam o paciente.", "The survey is anonymous: answers do not identify the patient.", "La encuesta es anónima: las respuestas no identifican al paciente.")}</p>
    </div>
  );

  return (
    <InsightCardShell
      id="feedback-quality"
      icon={<Smile className="h-4 w-4 text-primary" />}
      title={t("Pesquisa de satisfação", "Satisfaction survey", "Encuesta de satisfacción")}
      description={t("O que os pacientes responderam sobre o tratamento, o profissional e a clínica", "What patients answered about the treatment, the professional and the clinic", "Lo que respondieron los pacientes sobre el tratamiento, el profesional y la clínica")}
      rightSlot={!isLoading && <Badge variant="secondary" className="text-[11px] font-normal">{rows.length} {rows.length === 1 ? t("resposta", "response", "respuesta") : t("respostas", "responses", "respuestas")}</Badge>}
      infoContent={info}
    >
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : isError ? (
        <p className="py-4 text-sm text-destructive">{t("Não foi possível carregar as respostas. Recarregue a página para tentar de novo.", "Could not load the responses. Reload the page to try again.", "No se pudieron cargar las respuestas. Recargue la página para intentarlo de nuevo.")}</p>
      ) : all.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{t("Nenhuma resposta recebida ainda. Gere o link da pesquisa logo abaixo e envie aos pacientes após o atendimento.", "No responses yet. Generate the survey link just below and send it to patients after their session.", "Aún no hay respuestas. Genere el enlace de la encuesta abajo y envíelo a los pacientes después de la atención.")}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={t("Período", "Period", "Período")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(periodLabel) as Period[]).map((p) => <SelectItem key={p} value={p} className="text-xs">{periodLabel[p]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeService} onValueChange={(v) => setService(v)}>
              <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={t("Serviço", "Service", "Servicio")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{t("Todos os serviços", "All services", "Todos los servicios")}</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s} className="text-xs">{serviceLabel(s, l)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeProfessional} onValueChange={(v) => setProfessional(v)}>
              <SelectTrigger className="h-8 w-[220px] text-xs" aria-label={t("Filtrar profissional", "Filter professional", "Filtrar profesional")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Todos os profissionais", "All professionals", "Todos los profesionales")}</SelectItem>
                {professionalOptions.map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            {rows.length > 0 && (
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { downloadFeedbackCsv(rows, l); toast({ title: t("Planilha exportada", "Spreadsheet exported", "Planilla exportada") }); }}>
                  <Download className="h-3.5 w-3.5" />{t("Planilha", "Spreadsheet", "Planilla")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { if (!printFeedbackReport(rows, l, scopeLabel)) toast({ title: t("Permita pop-ups para abrir o relatório", "Allow pop-ups to open the report", "Permita ventanas emergentes para abrir el informe"), variant: "destructive" }); }}>
                  <FileText className="h-3.5 w-3.5" />{t("Relatório", "Report", "Informe")}
                </Button>
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p>{t("Nenhuma resposta nestes filtros.", "No responses for these filters.", "Ninguna respuesta con estos filtros.")}</p>
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setPeriod("all"); setService("all"); setProfessional("all"); }}>
                {t("Ver todas as respostas", "See all responses", "Ver todas las respuestas")}
              </Button>
            </div>
          ) : (
            <>
              {/* Recomendação */}
              <section className="grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
                <div className="rounded-xl border border-border bg-muted/30 px-5 py-3 text-center">
                  <p className={`text-4xl font-semibold tabular-nums ${nps.nps === null ? "text-muted-foreground" : nps.nps >= 50 ? "text-emerald-700" : nps.nps >= 0 ? "text-amber-700" : "text-red-700"}`} data-testid="feedback-nps">{nps.nps === null ? "—" : nps.nps}</p>
                  <p className="text-[11px] text-muted-foreground">NPS</p>
                  {delta !== null && (
                    <p className={`text-[11px] ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-muted-foreground"}`}>
                      {delta > 0 ? "+" : ""}{delta} {t("vs período anterior", "vs previous period", "vs período anterior")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {nps.answered > 0 && (
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${(nps.promoters / nps.answered) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(nps.passives / nps.answered) * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${(nps.detractors / nps.answered) * 100}%` }} />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {([["promoter", nps.promoters, nps.promoterPct, "text-emerald-700"], ["passive", nps.passives, nps.passivePct, "text-amber-700"], ["detractor", nps.detractors, nps.detractorPct, "text-red-700"]] as const).map(([k, n, p, tone]) => (
                      <div key={k}>
                        <p className={`text-base font-semibold tabular-nums ${tone}`}>{n}{p !== null && <span className="ml-1 text-xs font-normal text-muted-foreground">{p}%</span>}</p>
                        <p className="text-[11px] leading-tight text-muted-foreground">{sentimentLabel(k, l)}</p>
                      </div>
                    ))}
                  </div>
                  {nps.answered < SMALL_SAMPLE && (
                    <p className="text-[11px] text-muted-foreground">
                      {t(`Amostra pequena (${nps.answered} ${nps.answered === 1 ? "resposta" : "respostas"}): leia os percentuais como indício, não como tendência.`, `Small sample (${nps.answered}): read the percentages as a hint, not a trend.`, `Muestra pequeña (${nps.answered}): lea los porcentajes como indicio, no como tendencia.`)}
                    </p>
                  )}
                </div>
              </section>

              {/* Pontos de atenção */}
              {alerts.length > 0 && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle className="h-3.5 w-3.5" />{t("Pontos de atenção", "Attention points", "Puntos de atención")}</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-900 dark:text-amber-100">
                    {alerts.map((a) => (
                      <li key={a.item.key}>
                        <span className="font-medium">{itemLabel(a.item.key, l)}</span> · {areaLabel(a.item.area, l)}: {a.negative} {t("de", "of", "de")} {a.answered} {t("respostas desfavoráveis", "unfavourable answers", "respuestas desfavorables")} ({a.negativePct}%)
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Dimensões */}
              <section className="grid gap-3 md:grid-cols-3">
                {areas.map((a) => (
                  <div key={a.area} className="space-y-3 rounded-xl border border-border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{areaLabel(a.area, l)}</h4>
                      <span className={`text-sm font-semibold tabular-nums ${pctTone(a.positivePct)}`}>{a.positivePct === null ? "—" : `${a.positivePct}%`}</span>
                    </div>
                    {a.items.map((s) => <ItemRow key={s.item.key} s={s} l={l} />)}
                  </div>
                ))}
              </section>

              {activeProfessional === "all" && perProfessional.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">{t("Por profissional", "By professional", "Por profesional")}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-normal">{t("Profissional", "Professional", "Profesional")}</th>
                        <th className="py-2 pr-3 font-normal">{t("Respostas", "Responses", "Respuestas")}</th>
                        {FEEDBACK_ITEMS.filter((i) => i.area === "professional").map((i) => <th key={i.key} className="py-2 pr-3 font-normal">{itemLabel(i.key, l)}</th>)}
                      </tr></thead>
                      <tbody>{perProfessional.map((p) => <tr key={p.key} className="border-t border-border">
                        <td className="py-2 pr-3">{professionalOptions.find(([key]) => key === p.key)?.[1]}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.responses}</td>
                        {p.items.map((i) => <td key={i.item.key} className="py-2 pr-3 tabular-nums">{i.positivePct === null ? "—" : `${i.positivePct}%`} <span className="text-muted-foreground">(n={i.answered})</span></td>)}
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("Percentuais favoráveis por pergunta. Poucas respostas não sustentam um ranking. Respostas sem profissional identificado ficam fora desta comparação.", "Favourable percentages by question. Few responses do not support a ranking. Unassigned responses are excluded from this comparison.", "Porcentajes favorables por pregunta. Pocas respuestas no sustentan un ranking. Las respuestas sin profesional identificado quedan fuera de esta comparación.")}</p>
                </section>
              )}

              {/* Por serviço */}
              {activeService === "all" && perService.length >= 2 && (
                <section className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">{t("Por serviço", "By service", "Por servicio")}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-3 font-normal">{t("Serviço", "Service", "Servicio")}</th>
                        <th className="py-1 pr-3 font-normal">{t("Respostas", "Responses", "Respuestas")}</th>
                        <th className="py-1 pr-3 font-normal">NPS</th>
                        <th className="py-1 pr-3 font-normal">{t("Qualidade", "Quality", "Calidad")}</th>
                        <th className="py-1 font-normal">{t("Resultado", "Result", "Resultado")}</th>
                      </tr></thead>
                      <tbody>
                        {perService.map((s) => (
                          <tr key={s.service} className="border-t border-border/60">
                            <td className="py-1.5 pr-3 font-medium text-foreground">{serviceLabel(s.service, l)}</td>
                            <td className="py-1.5 pr-3 tabular-nums">{s.responses}</td>
                            <td className="py-1.5 pr-3 tabular-nums">{s.nps ?? "—"}</td>
                            <td className={`py-1.5 pr-3 tabular-nums ${pctTone(s.satisfaction)}`}>{s.satisfaction === null ? "—" : `${s.satisfaction}%`}</td>
                            <td className={`py-1.5 tabular-nums ${pctTone(s.result)}`}>{s.result === null ? "—" : `${s.result}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Tendência */}
              {trend.length >= 2 && (
                <section className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">{t("Evolução mensal", "Monthly trend", "Evolución mensual")}</h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[-100, 100]} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                          formatter={(value: number, name: string, item: { payload?: { responses?: number } }) => [name === "nps" ? `${value}` : `${value}%`, `${name === "nps" ? "NPS" : t("Qualidade favorável", "Favourable quality", "Calidad favorable")} (${item?.payload?.responses ?? 0} ${t("resp.", "resp.", "resp.")})`]} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === "nps" ? "NPS" : t("Qualidade favorável", "Favourable quality", "Calidad favorable"))} />
                        <Line type="monotone" dataKey="nps" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="satisfaction" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Respostas individuais: resumo curto; a avaliação completa abre sob demanda */}
              <section className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><MessageSquareQuote className="h-4 w-4 text-primary" />{t("Respostas individuais", "Individual responses", "Respuestas individuales")}</h4>
                  <ResponseFilterChips details={details} value={voice} onChange={setVoice} l={l} />
                </div>
                {voices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("Nenhuma resposta neste filtro.", "No responses for this filter.", "Ninguna respuesta en este filtro.")}</p>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground">{t("Toque em uma avaliação para ver todas as notas e comentários dela.", "Tap a response to see all of its ratings and comments.", "Toque una evaluación para ver todas sus notas y comentarios.")}</p>
                    <ul className="space-y-1.5">
                      {voices.slice(0, RESPONSE_PREVIEW).map((d) => <ResponseRow key={d.id} d={d} l={l} onOpen={() => openResponses(d.id)} />)}
                    </ul>
                  </>
                )}
                {voices.length > RESPONSE_PREVIEW && (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => openResponses(null)}>
                    {t("Ver todas as respostas", "See all responses", "Ver todas las respuestas")} ({voices.length})
                  </Button>
                )}
              </section>
              <FeedbackResponsesDialog open={responsesOpen} onOpenChange={setResponsesOpen} details={details} filter={voice} onFilterChange={setVoice}
                selectedId={selectedId} onSelect={setSelectedId} scopeLabel={scopeLabel} l={l} />
            </>
          )}
        </div>
      )}
    </InsightCardShell>
  );
};

export default FeedbackQualityCard;
