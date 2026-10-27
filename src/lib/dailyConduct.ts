/**
 * Conduta do dia — tradução determinística dos dados de carga em "o que fazer hoje".
 * Hierarquia: 1) segurança (teto FC, SpO₂) → 2) recuperação (prontidão; FC ao
 * acordar prioritária quando existe) → 3) estímulo de ontem/coerência PSE × FC →
 * 4) tendência (ACWR, só com histórico). Funciona já com 1 check-in ou 1 sessão.
 * Sempre sugestão ao fisioterapeuta, nunca decisão. Sem IA.
 */
import { localISODate, recoverySignal, acwr, addIsoDays as addIsoDaysSafe, trainingLoad } from "./periodization";
import { acwrZone, SPO2_ALERT } from "./cardioSafety";

export type ConductTone = "stop" | "reduce" | "hold" | "go" | "info";

export interface ConductItem {
  tone: ConductTone;
  /** Frase curta de ação. */
  action: string;
  /** Por quê, em linguagem simples. */
  why: string;
  /** Atividades previstas, para exibição em linhas separadas. */
  planned?: { label: string; minutes: number | null; rpe: number | null }[];
}

export interface ConductResult {
  headline: ConductItem;
  others: ConductItem[];
}

const TRACK_LABEL: Record<string, string> = { physio: "fisioterapia", gym: "academia", sport: "outro esporte", cardio: "cardio" };

export function dailyConduct(opts: {
  entries: any[];
  checkins: any[];
  sessions: any[];
  ceiling: number | null;
  maxHr: number | null;
  profile?: string | null;
  rhrAlert?: number;
  betaBlocker?: boolean;
  today?: string;
}): ConductResult {
  const today = opts.today ?? localISODate();
  const yesterday = addIsoDaysSafe(today, -1);
  const recent = opts.entries.filter((e) => e.session_date?.slice(0, 10) >= addIsoDaysSafe(today, -2) && e.session_date.slice(0, 10) <= today);
  const items: ConductItem[] = [];

  // 1) Segurança
  const overCeil = opts.ceiling ? recent.find((e) => typeof e.hr_max === "number" && e.hr_max > opts.ceiling!) : null;
  if (overCeil) items.push({ tone: "stop", action: "Mantenha a intensidade abaixo do teto hoje", why: `Na última sessão a FC chegou a ${overCeil.hr_max} bpm, acima do teto de ${opts.ceiling} bpm.` });
  const lowSpo2 = recent.find((e) => typeof e.spo2_min === "number" && e.spo2_min < SPO2_ALERT) ?? recent.find((e) => typeof e.spo2 === "number" && e.spo2 < SPO2_ALERT);
  if (lowSpo2) items.push({ tone: "stop", action: "Confira a saturação antes de iniciar", why: `SpO₂ abaixo de ${SPO2_ALERT}% registrada recentemente. Se repetir, considere avaliação médica.` });
  const badRecovery = recent.find((e) => typeof e.hr_recovery_1min === "number" && e.hr_recovery_1min < 12 && !opts.betaBlocker);
  if (badRecovery) items.push({ tone: "reduce", action: "Prefira estímulo leve e observe a recuperação", why: `A FC caiu só ${badRecovery.hr_recovery_1min} bpm no 1º minuto após o esforço (esperado ≥ 12).` });

  // 2) Recuperação (prontidão universal, FC ao acordar prioritária)
  const rec = recoverySignal(opts.checkins, opts.rhrAlert ?? 7);
  const lastCheckin = [...opts.checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date)).pop();
  const checkinAge = lastCheckin ? Math.round((Date.parse(today) - Date.parse(lastCheckin.checkin_date.slice(0, 10))) / 86400000) : null;
  if (rec.level === "danger") items.push({ tone: "reduce", action: "Reduza a carga hoje (cerca de metade da duração ou PSE ≤ 4)", why: rec.text });
  else if (rec.level === "caution") items.push({ tone: "hold", action: "Mantenha a dose, sem progredir hoje", why: rec.text });

  // 3) Estímulo de ontem e coerência PSE × FC
  const yLoad = opts.entries.filter((e) => e.session_date?.slice(0, 10) === yesterday).reduce((s, e) => s + trainingLoad(e.duration_min, e.rpe), 0);
  const yHigh = opts.entries.some((e) => e.session_date?.slice(0, 10) === yesterday && Number(e.rpe) >= 7);
  const todayPlan = opts.sessions.filter((s) => s.session_date?.slice(0, 10) === today && s.planned_load !== "rest");
  const todayHigh = todayPlan.some((s) => s.planned_load === "high" || Number(s.planned_rpe) >= 7);
  if (yHigh && todayHigh) items.push({ tone: "hold", action: "Evite dois dias intensos seguidos", why: `Ontem houve sessão intensa (carga ${yLoad}) e hoje também está previsto estímulo alto.` });

  const last = [...recent].filter((e) => typeof e.rpe === "number").sort((a, b) => b.session_date.localeCompare(a.session_date))[0];
  if (last && opts.maxHr && typeof last.hr_avg === "number" && !opts.betaBlocker) {
    const pct = last.hr_avg / opts.maxHr;
    if (last.rpe <= 4 && pct >= 0.8) items.push({ tone: "hold", action: "Converse sobre o esforço: a nota pode estar subestimada", why: `Nota ${last.rpe}, mas FC média em ${Math.round(pct * 100)}% da máxima estimada.` });
    else if (last.rpe >= 8 && pct < 0.65) items.push({ tone: "info", action: "Investigue cansaço fora do treino", why: `Nota ${last.rpe} com FC média baixa (${Math.round(pct * 100)}% da máxima): sono, estresse, dor ou medo podem pesar mais que o coração.` });
  }

  // 4) Tendência (só quando o histórico permite)
  const ratio = acwr(opts.entries);
  const zone = acwrZone(ratio, opts.profile);
  if (zone === "danger") items.push({ tone: "reduce", action: "Segure o volume nos próximos dias", why: `A carga da semana subiu muito acima do habitual (ACWR ${ratio!.toFixed(2)}).` });
  else if (zone === "caution") items.push({ tone: "hold", action: "Não acrescente carga nova esta semana", why: `A carga está subindo rápido (ACWR ${ratio!.toFixed(2)}).` });

  // Fallbacks positivos / falta de dado
  if (items.length === 0) {
    if (rec.level === "ok" && zone === "undertraining") items.push({ tone: "go", action: "Pode progredir até 10%", why: `Recuperação boa e carga abaixo do habitual. ${rec.text}` });
    else if (rec.level === "ok") items.push({ tone: "go", action: todayPlan.length ? "Siga o planejado para hoje" : "Liberado para o planejamento habitual", why: rec.text });
    else items.push({ tone: "info", action: "Peça um check-in rápido antes da sessão", why: "Sem check-in recente, a decisão de hoje fica sem a voz do paciente." });
  }
  if (checkinAge !== null && checkinAge > 2 && !items.some((i) => i.action.startsWith("Peça"))) {
    items.push({ tone: "info", action: "Peça um check-in atualizado", why: `O último check-in foi há ${checkinAge} dias.` });
  }
  if (todayPlan.length) {
    const planned = todayPlan.map((s) => ({ label: TRACK_LABEL[s.track] ?? s.track, minutes: s.planned_duration_min ?? null, rpe: s.planned_rpe ?? null }));
    const desc = planned.map((p) => `${p.label}${p.minutes ? ` ${p.minutes} min` : ""}${p.rpe ? ` PSE ${p.rpe}` : ""}`).join(" · ");
    items.push({ tone: "info", action: "Previsto para hoje", why: desc, planned });
  }

  const order: Record<ConductTone, number> = { stop: 0, reduce: 1, hold: 2, go: 3, info: 4 };
  const sorted = items.sort((a, b) => order[a.tone] - order[b.tone]);
  return { headline: sorted[0], others: sorted.slice(1) };
}
