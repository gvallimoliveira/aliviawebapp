import { useMemo, useState } from "react";
import { Armchair, Clock3, Gem, GraduationCap, FileCheck2, Loader2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightDismissals } from "./useInsightDismissals";
import type { ManagementData } from "./useManagementData";
import {
  emptyChairCost, availableHours, revenuePerHour, closedCycles, clinicalLtv, dischargeVsDropout, recordCompliance, MIN_CASES_PER_THERAPIST,
  leakageNoNextAppointment, buildPriceResolver,
} from "@/lib/managementMetrics";

/** Service-aware price resolver for the loaded scope (monthly plans diluted per realized session). */
export function usePriceOf(d: ManagementData) {
  return useMemo(() => buildPriceResolver(d.appts, d.services, d.price), [d]);
}

type L = "pt" | "en" | "es";
const useL = () => useLanguage().language as L;
const tr = (l: L, pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const PERIODS = [30, 90, 180];
export function PeriodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]" onClick={(e) => e.stopPropagation()}>
      {PERIODS.map((p) => (
        <button key={p} type="button" onClick={() => onChange(p)}
          className={`px-2 py-0.5 ${value === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{p}d</button>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-lg font-semibold ${tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function Wrap({ d, needsPrice, children }: { d: ManagementData; needsPrice?: boolean; children: React.ReactNode }) {
  const l = useL();
  if (d.loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (needsPrice && !d.price && !d.services.length)
    return <p className="text-sm text-muted-foreground">{tr(l, "Cadastre o preço padrão da sessão ou serviços com valores nas configurações para ver valores em R$.", "Set the default session price or catalog services to see currency values.", "Registre el precio estándar o servicios con valores para ver importes.")}</p>;
  return <>{children}</>;
}

export const Info = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-muted-foreground space-y-1.5">{children}</div>;

/* ---------- LTV ---------- */
export function LtvCard({ d }: { d: ManagementData }) {
  const l = useL();
  const priceOf = usePriceOf(d);
  const r = useMemo(() => clinicalLtv(closedCycles(d.appts, d.dischargedKeys, d.today, priceOf), d.price), [d, priceOf]);
  return (
    <InsightCardShell id="mgmt-ltv" icon={<Gem className="h-4 w-4 text-primary" />} title={tr(l, "LTV clínico", "Clinical LTV", "LTV clínico")}
      description={tr(l, "Valor médio gerado por paciente em ciclos encerrados (12 meses)", "Average value per patient in closed cycles (12 months)", "Valor medio por paciente en ciclos cerrados (12 meses)")}
      infoContent={<Info><p>{tr(l, "Ciclo encerrado = alta registrada ou 30 dias sem atendimento e sem agendamento futuro.", "Closed cycle = recorded discharge or 30 days with no session and nothing scheduled.", "Ciclo cerrado = alta registrada o 30 días sin atención ni agenda futura.")}</p><p>{tr(l, "Sessão realizada conta pela agenda concluída ou pela evolução registrada no dia. Valor = preço do serviço do agendamento (mensalidades diluídas por sessão feita) ou o preço padrão.", "A realized session counts from a completed slot or a same-day note. Value = the slot's service price (monthly plans diluted per session) or the default price.", "Sesión realizada = turno concluido o evolución del día. Valor = precio del servicio (planes mensuales diluidos) o precio estándar.")}</p></Info>}>
      <Wrap d={d} needsPrice>
        {r.patients === 0 ? <p className="text-sm text-muted-foreground">{tr(l, "Ainda não há ciclos encerrados.", "No closed cycles yet.", "Aún no hay ciclos cerrados.")}</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Média", "Average", "Media")} value={brl(r.avgValue)} />
              <Stat label={tr(l, "Mediana", "Median", "Mediana")} value={brl(r.medianValue)} />
              <Stat label={tr(l, "Sessões/paciente", "Sessions/patient", "Sesiones/paciente")} value={String(r.avgSessions)} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border p-2"><p className="text-muted-foreground">{tr(l, "Com alta", "Discharged", "Con alta")} · {r.discharge.patients}</p><p className="font-semibold text-primary">{brl(r.discharge.avgValue)} · {r.discharge.avgSessions} {tr(l, "sessões", "sessions", "sesiones")}</p></div>
              <div className="rounded-lg border border-border p-2"><p className="text-muted-foreground">{tr(l, "Evasão", "Dropout", "Abandono")} · {r.dropout.patients}</p><p className="font-semibold text-destructive">{brl(r.dropout.avgValue)} · {r.dropout.avgSessions} {tr(l, "sessões", "sessions", "sesiones")}</p></div>
            </div>
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Cadeira vazia ---------- */
const WD = { pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] };
export function EmptyChairCard({ d }: { d: ManagementData }) {
  const l = useL();
  const [days, setDays] = useState(90);
  const priceOf = usePriceOf(d);
  const r = useMemo(() => emptyChairCost(d.appts, d.price, d.today, days, priceOf), [d, days, priceOf]);
  const maxM = Math.max(1, ...r.byMonth.map((m) => m.value));
  const worstDay = r.byWeekday.indexOf(Math.max(...r.byWeekday));
  return (
    <InsightCardShell id="mgmt-empty-chair" icon={<Armchair className="h-4 w-4 text-destructive" />} title={tr(l, "Custo da cadeira vazia", "Empty-chair cost", "Costo de la silla vacía")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Receita perdida com faltas e cancelamentos", "Revenue lost to no-shows and cancellations", "Ingresos perdidos por faltas y cancelaciones")}
      infoContent={<Info><p>{tr(l, "Faltas (inclusive justificadas) + cancelamentos × preço padrão. Compromissos pessoais não entram.", "No-shows (incl. justified) + cancellations × default price. Personal commitments excluded.", "Faltas + cancelaciones × precio estándar. Compromisos personales excluidos.")}</p></Info>}>
      <Wrap d={d} needsPrice>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={tr(l, "Receita perdida", "Lost revenue", "Ingreso perdido")} value={brl(r.lostValue)} tone={r.lostValue ? "bad" : undefined} />
            <Stat label={tr(l, "Faltas / cancel.", "No-shows / canc.", "Faltas / canc.")} value={`${r.noShow} / ${r.cancelled}`} />
            <Stat label={tr(l, "% da agenda", "% of schedule", "% de la agenda")} value={`${r.lossRate}%`} />
          </div>
          {r.byMonth.length > 0 && (
            <div className="space-y-1">
              {r.byMonth.map((m) => (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-14 text-muted-foreground">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
                  <div className="flex-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-destructive/70" style={{ width: `${(m.value / maxM) * 100}%` }} /></div>
                  <span className="w-20 text-right">{brl(m.value)}</span>
                </div>
              ))}
            </div>
          )}
          {r.lostCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {tr(l, "Mais perdas:", "Most losses:", "Más pérdidas:")} <b className="text-foreground">{WD[l][worstDay]}</b>
              {r.topHours.length > 0 && <> · {r.topHours.map((h) => `${h.hour} (${h.count})`).join(", ")}</>}
            </p>
          )}
        </div>
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Receita por hora ---------- */
export function RevenuePerHourCard({ d, showTeam }: { d: ManagementData; showTeam?: boolean }) {
  const l = useL();
  const [days, setDays] = useState(30);
  const priceOf = usePriceOf(d);
  const r = useMemo(() => {
    const avail = availableHours({ today: d.today, days, start: d.hours.start, end: d.hours.end, workingDays: d.hours.workingDays, therapists: d.therapists });
    return revenuePerHour(d.appts, d.price, d.today, days, avail, priceOf);
  }, [d, days, priceOf]);
  return (
    <InsightCardShell id="mgmt-rev-hour" icon={<Clock3 className="h-4 w-4 text-primary" />} title={tr(l, "Receita por hora clínica", "Revenue per clinical hour", "Ingreso por hora clínica")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Quanto cada hora aberta e cada hora atendida rende", "What each open and each worked hour yields", "Cuánto rinde cada hora abierta y atendida")}
      infoContent={<Info><p>{tr(l, "Hora disponível = horário de funcionamento × dias úteis × terapeutas ativos (padrão 08–18h, seg–sex).", "Available hour = opening hours × workdays × active therapists (default 8–18h Mon–Fri).", "Hora disponible = horario × días hábiles × terapeutas activos.")}</p><p>{tr(l, "Hora atendida = duração das sessões realizadas (50 min se não informada). Receita usa o preço do serviço de cada agendamento; mensalidades são diluídas por sessão feita no mês.", "Worked hour = completed session duration (50 min default). Revenue uses each slot's service price; monthly plans are diluted per session done that month.", "Hora atendida = duración de sesiones. Los ingresos usan el precio del servicio; planes mensuales diluidos por sesión.")}</p></Info>}>
      <Wrap d={d} needsPrice>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={tr(l, "R$/hora disponível", "per open hour", "por hora disponible")} value={brl(r.perAvailableHour)} />
            <Stat label={tr(l, "R$/hora atendida", "per worked hour", "por hora atendida")} value={brl(r.perWorkedHour)} tone="good" />
            <Stat label={tr(l, "Horas usadas", "Hours used", "Horas usadas")} value={`${r.workedHours}/${r.availableHours}h`} />
          </div>
          {showTeam && r.byTherapist.length > 1 && (
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {r.byTherapist.map((t) => (
                <div key={t.id} className="flex justify-between text-xs border-b border-border/50 py-1">
                  <span className="truncate">{d.names[t.id] || "—"}</span>
                  <span className="text-muted-foreground">{t.sessions} · {brl(t.revenue)} · <b className="text-foreground">{brl(t.perWorkedHour)}/h</b></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Alta x evasão ---------- */
export function DischargeVsDropoutCard({ d }: { d: ManagementData }) {
  const l = useL();
  const [days, setDays] = useState(180);
  const r = useMemo(() => dischargeVsDropout(closedCycles(d.appts, d.dischargedKeys, d.today), d.today, days), [d, days]);
  return (
    <InsightCardShell id="mgmt-discharge-dropout" icon={<GraduationCap className="h-4 w-4 text-primary" />} title={tr(l, "Alta efetiva vs evasão", "Discharge vs dropout", "Alta efectiva vs abandono")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Como os tratamentos terminam, por terapeuta", "How treatments end, per therapist", "Cómo terminan los tratamientos, por terapeuta")}
      infoContent={<Info><p>{tr(l, "Alta = plano encerrado com Alta no STEPS. Evasão = 30 dias sem atendimento, sem agendamento futuro e sem alta.", "Discharge = plan closed with STEPS discharge. Dropout = 30 days without session, nothing scheduled, no discharge.", "Alta = plan cerrado con alta STEPS. Abandono = 30 días sin atención ni agenda ni alta.")}</p><p>{tr(l, `O terapeuta é quem mais atendeu o paciente. Taxas com menos de ${MIN_CASES_PER_THERAPIST} casos aparecem esmaecidas.`, `Therapist = who saw the patient most. Under ${MIN_CASES_PER_THERAPIST} cases is shown faded.`, `Terapeuta = quien más atendió. Menos de ${MIN_CASES_PER_THERAPIST} casos aparece atenuado.`)}</p></Info>}>
      <Wrap d={d}>
        {r.total === 0 ? <p className="text-sm text-muted-foreground">{tr(l, "Nenhum tratamento encerrado no período.", "No treatments ended in the period.", "Ningún tratamiento terminado.")}</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Taxa de alta", "Discharge rate", "Tasa de alta")} value={`${r.dischargeRate}%`} tone={r.dischargeRate >= 50 ? "good" : "bad"} />
              <Stat label={tr(l, "Altas", "Discharges", "Altas")} value={String(r.discharges)} />
              <Stat label={tr(l, "Evasões", "Dropouts", "Abandonos")} value={String(r.dropouts)} />
            </div>
            <div className="max-h-[220px] overflow-y-auto space-y-1.5">
              {r.byTherapist.map((t) => (
                <div key={t.id} className={`text-xs ${t.enough ? "" : "opacity-50"}`}>
                  <div className="flex justify-between"><span className="truncate">{d.names[t.id] || "—"}</span><span>{t.rate}% · {t.discharge}/{t.total}</span></div>
                  <div className="h-1.5 rounded bg-destructive/30"><div className="h-1.5 rounded bg-primary" style={{ width: `${t.rate}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Prontuário em dia ---------- */
export function RecordComplianceCard({ d, scopeKey, dismissForTeam, showTeam }: { d: ManagementData; scopeKey?: string; dismissForTeam?: boolean; showTeam?: boolean }) {
  const l = useL();
  const [days, setDays] = useState(30);
  const r = useMemo(() => recordCompliance(d.appts, d.notes, new Date(), days), [d, days]);
  const { dismissed, dismiss, restoreAll } = useInsightDismissals("record_pending", scopeKey, dismissForTeam);
  const visible = r.pending.filter((p) => !dismissed.has(p.id));
  const hidden = r.pending.length - visible.length;
  return (
    <InsightCardShell id="mgmt-records" icon={<FileCheck2 className="h-4 w-4 text-primary" />} title={tr(l, "Prontuário em dia", "Records up to date", "Historia al día")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Sessões realizadas com evolução registrada em até 48h", "Completed sessions with a note within 48h", "Sesiones con evolución registrada en 48h")}
      infoContent={<Info><p>{tr(l, "Conta a evolução ligada ao atendimento ou ao mesmo paciente no mesmo dia. Sessões com menos de 48h ainda não entram.", "Counts the note linked to the appointment or the same patient/day. Sessions under 48h are not yet counted.", "Cuenta la evolución del turno o del mismo paciente/día. Sesiones con menos de 48h aún no cuentan.")}</p><p>{tr(l, "Use o X para tirar da lista o que já foi resolvido fora do sistema.", "Use X to clear items handled outside the system.", "Use X para quitar lo resuelto fuera del sistema.")}</p></Info>}>
      <Wrap d={d}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={tr(l, "Em dia", "On time", "Al día")} value={`${r.rate}%`} tone={r.rate >= 80 ? "good" : "bad"} />
            <Stat label={tr(l, "Atrasadas", "Late", "Atrasadas")} value={String(r.late)} />
            <Stat label={tr(l, "Sem evolução", "Missing", "Sin evolución")} value={String(visible.length)} tone={visible.length ? "bad" : undefined} />
          </div>
          {showTeam && r.byTherapist.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {r.byTherapist.map((t) => <span key={t.id} className="text-[11px] rounded-full bg-muted px-2 py-0.5">{d.names[t.id] || "—"}: <b>{t.rate}%</b></span>)}
            </div>
          )}
          {visible.length > 0 && (
            <div className="max-h-[240px] overflow-y-auto divide-y divide-border/60">
              {visible.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <div className="flex-1 min-w-0"><p className="truncate">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.date.split("-").reverse().join("/")}{showTeam && p.therapistId ? ` · ${d.names[p.therapistId] || ""}` : ""} · {Math.floor(p.hoursSince / 24)}d</p></div>
                  <button type="button" onClick={() => dismiss(p.id)} className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label={dismissForTeam ? tr(l, "Remover para toda a equipe", "Remove for the whole team", "Quitar para todo el equipo") : tr(l, "Remover da lista", "Remove from list", "Quitar de la lista")}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {hidden > 0 && <button type="button" onClick={restoreAll} className="text-[11px] text-muted-foreground underline">{hidden} {tr(l, "oculto(s) · restaurar", "hidden · restore", "oculto(s) · restaurar")}</button>}
        </div>
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Resumo ---------- */
export function useSummaryTiles(d: ManagementData, showMoney: boolean) {
  return useMemo(() => {
    if (d.loading) return null;
    const chair = emptyChairCost(d.appts, d.price, d.today, 30);
    const cycles = closedCycles(d.appts, d.dischargedKeys, d.today);
    const ltv = clinicalLtv(cycles, d.price);
    const dd = dischargeVsDropout(cycles, d.today, 180);
    const rec = recordCompliance(d.appts, d.notes, new Date(), 30);
    const leak = leakageNoNextAppointment(d.appts, d.dischargedKeys, d.today).length;
    return { chair, ltv, dd, rec, leak, showMoney: showMoney && d.price > 0 };
  }, [d, showMoney]);
}
