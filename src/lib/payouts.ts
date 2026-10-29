/**
 * Team payouts (repasses) for a clinic month. Pure and deterministic.
 * Gross comes from the shared price resolver; service deductions (taxes/fees)
 * are removed before computing per-session payouts; monthly fixed amounts
 * (salary/internship stipend) and manual adjustments never depend on volume.
 */
import { isCare, type MgmtAppt, type PriceOf } from "./managementMetrics";

export type SessionMode = "none" | "percent" | "fixed";
export interface Compensation { professional_id: string; session_mode: SessionMode; session_value: number; monthly_fixed: number }
export interface ServicePayoutRule { id: string; name: string; deduction_pct: number; payout_mode: "percent" | "fixed" | null; payout_value: number | null }
export interface PayoutAdjustment { id: string; professional_id: string; label: string; amount: number }

export interface PayoutLine {
  id: string; date: string; time: string | null; patient: string; service: string;
  gross: number; deduction: number; base: number; rule: string; payout: number;
}
export interface ProfessionalPayout {
  professionalId: string; name: string; sessions: number; gross: number; deductions: number;
  sessionPayout: number; monthlyFixed: number; adjustments: PayoutAdjustment[]; adjustmentsTotal: number;
  total: number; clinicNet: number; rule: string; lines: PayoutLine[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const ruleLabel = (mode: SessionMode | "percent" | "fixed" | null | undefined, value: number) =>
  mode === "percent" ? `${value}%` : mode === "fixed" ? `${brl(value)}/sessão` : "sem repasse por sessão";

export function computePayouts(args: {
  appts: MgmtAppt[]; month: string; priceOf: PriceOf; services: ServicePayoutRule[];
  compensation: Compensation[]; adjustments: PayoutAdjustment[]; names: Record<string, string>;
  professionalIds?: string[];
}) {
  const svc = new Map(args.services.map((s) => [s.id, s]));
  const comp = new Map(args.compensation.map((c) => [c.professional_id, c]));
  const ids = new Set<string>([...(args.professionalIds || []), ...args.compensation.map((c) => c.professional_id), ...args.adjustments.map((a) => a.professional_id)]);
  const done = args.appts.filter((a) => isCare(a) && a.status === "completed" && a.professional_id && a.appointment_date.slice(0, 7) === args.month);
  done.forEach((a) => ids.add(a.professional_id!));

  const rows: ProfessionalPayout[] = [...ids].map((pid) => {
    const c = comp.get(pid);
    const lines: PayoutLine[] = done.filter((a) => a.professional_id === pid)
      .sort((x, y) => (x.appointment_date + (x.appointment_time || "")).localeCompare(y.appointment_date + (y.appointment_time || "")))
      .map((a) => {
        const s = a.service_id ? svc.get(a.service_id) : undefined;
        const gross = r2(args.priceOf(a));
        const deduction = r2(gross * (Number(s?.deduction_pct) || 0) / 100);
        const base = r2(gross - deduction);
        const mode = s?.payout_mode ? s.payout_mode : c?.session_mode ?? "none";
        const value = s?.payout_mode ? Number(s.payout_value) || 0 : Number(c?.session_value) || 0;
        const payout = mode === "percent" ? r2(base * value / 100) : mode === "fixed" ? r2(value) : 0;
        return { id: a.id, date: a.appointment_date, time: a.appointment_time ?? null, patient: a.patient_name || "—", service: s?.name || "Sessão padrão", gross, deduction, base, rule: ruleLabel(mode, value), payout };
      });
    const adjustments = args.adjustments.filter((a) => a.professional_id === pid);
    const sum = (f: (l: PayoutLine) => number) => r2(lines.reduce((t, l) => t + f(l), 0));
    const gross = sum((l) => l.gross), deductions = sum((l) => l.deduction), sessionPayout = sum((l) => l.payout);
    const monthlyFixed = r2(Number(c?.monthly_fixed) || 0);
    const adjustmentsTotal = r2(adjustments.reduce((t, a) => t + Number(a.amount), 0));
    const total = r2(sessionPayout + monthlyFixed + adjustmentsTotal);
    const rule = [c && c.session_mode !== "none" ? ruleLabel(c.session_mode, c.session_value) : null, monthlyFixed ? `fixo ${brl(monthlyFixed)}/mês` : null].filter(Boolean).join(" + ") || "não configurado";
    return { professionalId: pid, name: args.names[pid] || "Profissional", sessions: lines.length, gross, deductions, sessionPayout, monthlyFixed, adjustments, adjustmentsTotal, total, clinicNet: r2(gross - deductions - total), rule, lines };
  }).sort((a, b) => b.gross - a.gross || a.name.localeCompare(b.name));

  const t = (f: (p: ProfessionalPayout) => number) => r2(rows.reduce((s, p) => s + f(p), 0));
  return { rows, totals: { sessions: t((p) => p.sessions), gross: t((p) => p.gross), deductions: t((p) => p.deductions), payouts: t((p) => p.total), clinicNet: t((p) => p.clinicNet) } };
}
