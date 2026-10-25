import { useMemo, useState } from "react";
import { CalendarX2, Gauge, Timer, UserCheck, Users, X, DoorOpen, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightDismissals } from "./useInsightDismissals";
import { Info, PeriodPicker, Stat, Wrap } from "./ManagementCards";
import type { ManagementData } from "./useManagementData";
import {
  frequencyAdherenceGap, referralMix, leakageNoNextAppointment, lateCancellations, ownerDependence, capacityBottleneck,
  FREQ_GAP_WEEKS, REFERRAL_SOURCES, LATE_CANCEL_HOURS, buildPriceResolver,
} from "@/lib/managementMetrics";

type L = "pt" | "en" | "es";
const useL = () => useLanguage().language as L;
const tr = (l: L, pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const SRC_LABEL: Record<string, { pt: string; en: string; es: string }> = {
  patient: { pt: "Outro cliente", en: "Another client", es: "Otro cliente" },
  social: { pt: "Redes sociais", en: "Social media", es: "Redes sociales" },
  doctor: { pt: "Médico", en: "Doctor", es: "Médico" },
  other: { pt: "Outra", en: "Other", es: "Otra" },
};
const WD = { pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] };

/* ---------- Frequência real vs prescrita ---------- */
export function FrequencyGapCard({ d }: { d: ManagementData }) {
  const l = useL();
  const r = useMemo(() => frequencyAdherenceGap(d.appts, d.patients, d.dischargedKeys, d.today), [d]);
  return (
    <InsightCardShell id="mgmt-freq-gap" icon={<Gauge className="h-4 w-4 text-primary" />} title={tr(l, "Frequência real vs prescrita", "Real vs prescribed frequency", "Frecuencia real vs prescrita")}
      description={tr(l, `Compare a frequência semanal sugerida com a real (últimas ${FREQ_GAP_WEEKS} semanas)`, `Compares the suggested weekly frequency with the real one (last ${FREQ_GAP_WEEKS} weeks)`, `Compara la frecuencia semanal sugerida con la real (últimas ${FREQ_GAP_WEEKS} semanas)`)}
      infoContent={<Info><p>{tr(l, "A frequência prescrita vem do cadastro do paciente (campo Frequência sugerida). A real é a média de sessões realizadas por semana.", "The prescribed frequency comes from the patient record. The real one is the average of completed sessions per week.", "La frecuencia prescrita viene del registro del paciente. La real es el promedio de sesiones por semana.")}</p><p>{tr(l, "Só entram pacientes ativos com frequência preenchida; inativos aparecem nos insights de reativação.", "Only active patients with the field filled in count; inactive ones appear in reactivation insights.", "Solo cuentan pacientes activos con el campo lleno; inactivos aparecen en reactivación.")}</p></Info>}>
      <Wrap d={d}>
        {r.measured === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Preencha a Frequência sugerida no cadastro dos pacientes para medir este gap.", "Fill in the suggested frequency in the patient record to measure this gap.", "Complete la frecuencia sugerida en el registro del paciente para medir esta brecha.")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Adesão média", "Avg adherence", "Adhesión media")} value={`${r.adherence}%`} tone={r.adherence >= 80 ? "good" : "bad"} />
              <Stat label={tr(l, "Abaixo do prescrito", "Below prescribed", "Debajo de lo prescrito")} value={String(r.below.length)} tone={r.below.length ? "bad" : "good"} />
              <Stat label={tr(l, "Monitorados", "Tracked", "Monitoreados")} value={String(r.measured)} />
            </div>
            {r.below.length > 0 && (
              <div className="max-h-[220px] overflow-y-auto divide-y divide-border/60">
                {r.below.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 py-1.5 text-sm">
                    <p className="flex-1 truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">{tr(l, "real", "real", "real")} <b className="text-destructive">{fmt(p.actual)}x</b> / {tr(l, "prescrito", "prescribed", "prescrito")} {p.prescribed}x</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Indicação orgânica ---------- */
export function ReferralRateCard({ d }: { d: ManagementData }) {
  const l = useL();
  const r = useMemo(() => referralMix(d.patients, d.today), [d]);
  const maxSrc = Math.max(1, ...Object.values(r.bySource));
  const last6 = r.months.reduce((s, m) => s + m.total, 0);
  const ref6 = r.months.reduce((s, m) => s + m.referral, 0);
  return (
    <InsightCardShell id="mgmt-referral" icon={<Share2 className="h-4 w-4 text-primary" />} title={tr(l, "Indicação orgânica", "Organic referral", "Recomendación orgánica")}
      description={tr(l, "Quanto da carteira chega por indicação de clientes", "How much of the base arrives by client referral", "Cuánto de la cartera llega por recomendación de clientes")}
      infoContent={<Info><p>{tr(l, "Usa o campo Origem da indicação do cadastro do paciente (outro cliente, redes sociais, médico, outra). A taxa considera apenas quem tem a origem preenchida.", "Uses the referral source field in the patient record (another client, social media, doctor, other). The rate considers only filled records.", "Usa el campo Origen de recomendación del registro (otro cliente, redes sociales, médico, otra). La tasa considera solo registros llenos.")}</p></Info>}>
      <Wrap d={d}>
        {r.known === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Preencha a Origem da indicação no cadastro dos pacientes para medir este canal.", "Fill in the referral source in the patient record to measure this channel.", "Complete el origen de recomendación en el registro del paciente.")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Taxa de indicação", "Referral rate", "Tasa de recomendación")} value={`${r.referralRate}%`} tone={r.referralRate >= 30 ? "good" : undefined} />
              <Stat label={tr(l, "Indicados", "Referred", "Recomendados")} value={String(r.referralCount)} />
              <Stat label={tr(l, "Sem origem", "No source", "Sin origen")} value={String(r.total - r.known)} />
            </div>
            <div className="space-y-1">
              {REFERRAL_SOURCES.filter((s) => r.bySource[s]).map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-muted-foreground truncate">{SRC_LABEL[s][l]}</span>
                  <div className="flex-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary/70" style={{ width: `${((r.bySource[s] || 0) / maxSrc) * 100}%` }} /></div>
                  <span className="w-8 text-right">{r.bySource[s]}</span>
                </div>
              ))}
            </div>
            {last6 > 0 && <p className="text-xs text-muted-foreground">{tr(l, "Últimos 6 meses:", "Last 6 months:", "Últimos 6 meses:")} <b className="text-foreground">{ref6}</b> {tr(l, "de", "of", "de")} {last6} {tr(l, "novos vieram por indicação", "new patients came by referral", "nuevos llegaron por recomendación")}</p>}
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Pacientes sem próximo horário ---------- */
export function LeakageCard({ d, scopeKey, dismissForTeam }: { d: ManagementData; scopeKey?: string; dismissForTeam?: boolean }) {
  const l = useL();
  const rows = useMemo(() => leakageNoNextAppointment(d.appts, d.dischargedKeys, d.today, undefined, d.patients), [d]);
  const { dismissed, dismiss, restoreAll } = useInsightDismissals("leakage_no_next", scopeKey, dismissForTeam);
  const visible = rows.filter((p) => !dismissed.has(p.key));
  const hidden = rows.length - visible.length;
  return (
    <InsightCardShell id="mgmt-leakage" icon={<CalendarX2 className="h-4 w-4 text-destructive" />} title={tr(l, "Sem próximo horário", "No next appointment", "Sin próximo turno")}
      description={tr(l, "Pacientes ativos que saíram da última sessão sem agendar o retorno", "Active patients who left the last session without booking the next one", "Pacientes activos que salieron sin agendar el retorno")}
      infoContent={<Info><p>{tr(l, "Ativo = sessão realizada nos últimos 60 dias, sem alta registrada e sem nenhum horário futuro marcado. Agendar na saída é a principal barreira contra o abandono.", "Active = session in the last 60 days, no recorded discharge and nothing scheduled ahead. Booking at checkout is the main barrier against dropout.", "Activo = sesión en los últimos 60 días, sin alta y sin turno futuro. Agendar al salir es la principal barrera contra el abandono.")}</p><p>{tr(l, "Use o X para tirar da lista o que já foi resolvido.", "Use X to clear items already handled.", "Use X para quitar lo ya resuelto.")}</p></Info>}>
      <Wrap d={d}>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Todos os pacientes ativos têm retorno agendado. 🎉", "Every active patient has a return booked. 🎉", "Todos los pacientes activos tienen retorno agendado. 🎉")}</p>
        ) : (
          <div className="space-y-2">
            <Stat label={tr(l, "Pacientes sem retorno marcado", "Patients without a booked return", "Pacientes sin retorno agendado")} value={String(visible.length)} tone="bad" />
            <div className="max-h-[240px] overflow-y-auto divide-y divide-border/60">
              {visible.map((p) => (
                <div key={p.key} className="flex items-center gap-2 py-1.5 text-sm">
                  <div className="flex-1 min-w-0"><p className="truncate">{p.name}</p><p className="text-[11px] text-muted-foreground">{tr(l, "última sessão", "last session", "última sesión")} {p.lastDate.split("-").reverse().join("/")} · {p.daysSince}d</p></div>
                  <button type="button" onClick={() => dismiss(p.key)} className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label={dismissForTeam ? tr(l, "Remover para toda a equipe", "Remove for the whole team", "Quitar para todo el equipo") : tr(l, "Remover da lista", "Remove from list", "Quitar de la lista")}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            {hidden > 0 && <button type="button" onClick={restoreAll} className="text-[11px] text-muted-foreground underline">{hidden} {tr(l, "oculto(s) · restaurar", "hidden · restore", "oculto(s) · restaurar")}</button>}
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Cancelamento tardio vs antecipado ---------- */
export function LateCancellationCard({ d, showTeam }: { d: ManagementData; showTeam?: boolean }) {
  const l = useL();
  const [days, setDays] = useState(90);
  const r = useMemo(() => lateCancellations(d.appts, d.today, days), [d, days]);
  return (
    <InsightCardShell id="mgmt-late-cancel" icon={<Timer className="h-4 w-4 text-destructive" />} title={tr(l, "Cancelamento tardio", "Late cancellation", "Cancelación tardía")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, `Cancelamentos a menos de ${LATE_CANCEL_HOURS}h do horário vs antecipados`, `Cancellations under ${LATE_CANCEL_HOURS}h before the slot vs early ones`, `Cancelaciones a menos de ${LATE_CANCEL_HOURS}h del turno vs anticipadas`)}
      infoContent={<Info><p>{tr(l, "O horário exato da mudança de status passou a ser registrado agora; cancelamentos antigos e horários sem hora marcada aparecem como 'sem horário registrado' e não entram na taxa. O período considera a data do cancelamento, não a do horário vago.", "The exact status-change time started being recorded now; older cancellations and slots without a time show as 'no recorded time' and are excluded from the rate. The window follows the cancellation date, not the empty slot's date.", "El horario exacto del cambio de estado se registra desde ahora; cancelaciones antiguas y turnos sin hora aparecen como 'sin horario' y no entran en la tasa. El período sigue la fecha de la cancelación.")}</p><p>{tr(l, "Cancelamento tardio quase sempre vira cadeira vazia: vale cobrar política de aviso ou lista de espera.", "Late cancellations almost always become empty chairs: consider a notice policy or waitlist.", "La cancelación tardía casi siempre se vuelve silla vacía: considere política de aviso o lista de espera.")}</p></Info>}>
      <Wrap d={d}>
        {r.total === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Nenhum cancelamento no período.", "No cancellations in the period.", "Ninguna cancelación en el período.")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, `Tardios (<${LATE_CANCEL_HOURS}h)`, `Late (<${LATE_CANCEL_HOURS}h)`, `Tardías (<${LATE_CANCEL_HOURS}h)`)} value={`${r.lateRate}%`} tone={r.known ? (r.lateRate >= 40 ? "bad" : "good") : undefined} />
              <Stat label={tr(l, "Tardios / antecipados", "Late / early", "Tardías / anticipadas")} value={`${r.late} / ${r.early}`} />
              <Stat label={tr(l, "Sem horário registrado", "No recorded time", "Sin horario")} value={String(r.unknown)} />
            </div>
            {showTeam && r.byTherapist.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {r.byTherapist.map((t) => <span key={t.id} className="text-[11px] rounded-full bg-muted px-2 py-0.5">{d.names[t.id] || "—"}: <b>{t.lateRate}%</b> {tr(l, "tardios", "late", "tardías")}</span>)}
              </div>
            )}
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Dependência do titular ---------- */
export function OwnerDependenceCard({ d }: { d: ManagementData }) {
  const l = useL();
  const [days, setDays] = useState(90);
  const r = useMemo(() => ownerDependence(d.appts, d.ownerProfessionalId, d.today, days, d.price, buildPriceResolver(d.appts, d.services, d.price)), [d, days]);
  const ownerName = d.ownerProfessionalId ? d.names[d.ownerProfessionalId] : null;
  return (
    <InsightCardShell id="mgmt-owner-dep" icon={<UserCheck className="h-4 w-4 text-primary" />} title={tr(l, "Dependência do titular", "Owner dependence", "Dependencia del titular")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Quanto da produção da clínica está nas mãos do dono", "How much of the clinic's output sits with the owner", "Cuánto de la producción está en manos del dueño")}
      infoContent={<Info><p>{tr(l, "Sessões realizadas pelo titular ÷ total da clínica no período. Acima de ~70% indica risco de escala: a receita depende da agenda de uma pessoa.", "Owner's completed sessions ÷ clinic total in the period. Above ~70% signals scaling risk: revenue depends on one person's schedule.", "Sesiones del titular ÷ total de la clínica. Por encima de ~70% indica riesgo de escala.")}</p></Info>}>
      <Wrap d={d}>
        {!d.ownerProfessionalId ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Não foi possível identificar o perfil profissional do titular.", "The owner's professional profile could not be identified.", "No se pudo identificar el perfil profesional del titular.")}</p>
        ) : r.sessions === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Nenhuma sessão realizada no período.", "No completed sessions in the period.", "Ninguna sesión realizada en el período.")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Titular", "Owner", "Titular")} value={`${r.share}%`} tone={r.share >= 70 ? "bad" : "good"} />
              <Stat label={tr(l, "Sessões titular/equipe", "Owner/team sessions", "Sesiones titular/equipo")} value={`${r.ownerSessions}/${r.teamSessions}`} />
              {d.price > 0 ? <Stat label={tr(l, "Receita via titular", "Revenue via owner", "Ingreso vía titular")} value={`${r.revenueShare}%`} /> : <Stat label={tr(l, "Sessões totais", "Total sessions", "Sesiones totales")} value={String(r.sessions)} />}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="truncate">{ownerName || tr(l, "Titular", "Owner", "Titular")}</span><span className="text-muted-foreground">{tr(l, "equipe", "team", "equipo")}</span></div>
              <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-2 bg-primary" style={{ width: `${r.share}%` }} /></div>
            </div>
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/* ---------- Gargalo operacional ---------- */
export function BottleneckCard({ d, isClinic }: { d: ManagementData; isClinic: boolean }) {
  const l = useL();
  const [days, setDays] = useState(30);
  const r = useMemo(() => capacityBottleneck(d.appts, d.therapists, d.rooms, d.today, days, d.hours), [d, days]);
  return (
    <InsightCardShell id="mgmt-bottleneck" icon={<DoorOpen className="h-4 w-4 text-primary" />} title={tr(l, "Gargalo de capacidade", "Capacity bottleneck", "Cuello de botella de capacidad")}
      rightSlot={<PeriodPicker value={days} onChange={setDays} />}
      description={tr(l, "Quando a agenda trava no limite de terapeutas e macas", "When the schedule hits the therapist/room limit", "Cuándo la agenda llega al límite de terapeutas y camillas")}
      infoContent={<Info><p>{tr(l, "Capacidade = menor entre terapeutas ativos e macas cadastradas (configurações da clínica). Um horário 'travado' tem reservas simultâneas no limite; o índice é a % de horários usados nesse estado.", "Capacity = the lower of active therapists and registered rooms (clinic settings). A 'locked' slot has simultaneous bookings at the limit; the index is the % of used slots in that state.", "Capacidad = el menor entre terapeutas activos y camillas registradas. Un turno 'bloqueado' tiene reservas simultáneas en el límite.")}</p><p>{isClinic && !d.rooms ? tr(l, "Cadastre o número de macas/boxes nas configurações da clínica para refinar a capacidade.", "Register the number of rooms in the clinic settings to refine capacity.", "Registre el número de camillas en la configuración de la clínica.") : tr(l, "Índice alto = vale abrir novos horários, outro terapeuta ou mais um box.", "High index = consider new slots, another therapist or one more room.", "Índice alto = considere nuevos turnos, otro terapeuta o una camilla más.")}</p></Info>}>
      <Wrap d={d}>
        {r.used === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(l, "Sem agendamentos no período.", "No appointments in the period.", "Sin turnos en el período.")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={tr(l, "Ocupação da agenda", "Schedule occupancy", "Ocupación de la agenda")} value={`${r.occupancy}%`} tone={r.occupancy >= 80 ? "bad" : "good"} />
              <Stat label={tr(l, "Capacidade simultânea", "Simultaneous capacity", "Capacidad simultánea")} value={String(r.capacity)} />
              {r.capacity > 1
                ? <Stat label={tr(l, "Horários travados", "Locked slots", "Turnos bloqueados")} value={`${r.saturated}/${r.used}`} tone={r.index >= 40 ? "bad" : "good"} />
                : <Stat label={tr(l, "Horários usados", "Used slots", "Turnos usados")} value={`${r.used}/${r.possible}`} />}
            </div>
            {r.top.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.top.map((s) => (
                  <span key={`${s.weekday}-${s.hour}`} className="text-[11px] rounded-full bg-muted px-2 py-0.5">
                    {WD[l][s.weekday]} {s.hour}h · <b>{s.hits}x</b> {tr(l, "travado", "locked", "bloqueado")}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Wrap>
    </InsightCardShell>
  );
}

/** Extra summary tile: active patients with nothing scheduled ahead. */
export function leakageCount(d: ManagementData): number {
  return leakageNoNextAppointment(d.appts, d.dischargedKeys, d.today).length;
}
