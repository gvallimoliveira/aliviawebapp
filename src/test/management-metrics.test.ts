import { describe, it, expect } from "vitest";
import {
  emptyChairCost, availableHours, revenuePerHour, closedCycles, clinicalLtv, dischargeVsDropout, recordCompliance,
  frequencyAdherenceGap, referralMix, leakageNoNextAppointment, lateCancellations, ownerDependence, capacityBottleneck, type MgmtAppt,
} from "@/lib/managementMetrics";

const ap = (o: Partial<MgmtAppt>): MgmtAppt => ({ id: Math.random().toString(36), appointment_date: "2026-10-20", status: "completed", patient_email: "a@x.com", patient_name: "Ana", professional_id: "t1", ...o });
const today = "2026-10-24";

describe("custo da cadeira vazia", () => {
  it("faltas + cancelamentos × preço; compromissos não contam", () => {
    const r = emptyChairCost([
      ap({ status: "no_show" }), ap({ status: "cancelled" }), ap({ status: "completed" }),
      ap({ status: "no_show", service_type: "compromisso" }),
    ], 150, today, 30);
    expect(r.lostCount).toBe(2);
    expect(r.lostValue).toBe(300);
    expect(r.lossRate).toBe(67);
  });
});

describe("receita por hora clínica", () => {
  it("divide receita pelas horas disponíveis e trabalhadas", () => {
    const hrs = availableHours({ today, days: 7, start: "08:00", end: "18:00", workingDays: [1, 2, 3, 4, 5] });
    expect(hrs).toBe(50);
    const r = revenuePerHour([ap({ duration_minutes: 60 }), ap({ duration_minutes: 60 })], 100, today, 7, hrs);
    expect(r.revenue).toBe(200);
    expect(r.perAvailableHour).toBe(4);
    expect(r.perWorkedHour).toBe(100);
  });
});

describe("LTV e alta x evasão", () => {
  const appts = [
    ap({ patient_email: "a@x.com", appointment_date: "2026-08-01" }), ap({ patient_email: "a@x.com", appointment_date: "2026-08-08" }),
    ap({ patient_email: "b@x.com", appointment_date: "2026-08-01" }), // sem retorno há 30d+ → evasão
    ap({ patient_email: "c@x.com", appointment_date: "2026-10-20" }), // ativo recente → fora
    ap({ patient_email: "d@x.com", appointment_date: "2026-08-01" }), ap({ patient_email: "d@x.com", status: "scheduled", appointment_date: "2026-10-30" }), // agendado → fora
  ];
  const cycles = closedCycles(appts, new Set(["a@x.com"]), today);
  it("considera encerrado só alta registrada ou 30 dias sem retorno nem agendamento", () => {
    expect(cycles.map((c) => `${c.key}:${c.outcome}`).sort()).toEqual(["a@x.com:discharge", "b@x.com:dropout"]);
  });
  it("LTV = sessões realizadas × preço", () => {
    const l = clinicalLtv(cycles, 100);
    expect(l.avgValue).toBe(150);
    expect(l.discharge.avgValue).toBe(200);
    expect(l.dropout.avgValue).toBe(100);
  });
  it("taxa de alta e mínimo de 3 casos por terapeuta", () => {
    const r = dischargeVsDropout(cycles, today, 180);
    expect(r.dischargeRate).toBe(50);
    expect(r.byTherapist[0].enough).toBe(false);
  });
});

describe("prontuário em dia (48h)", () => {
  it("nota até 48h = em dia; depois = atrasada; sem nota após 48h = pendente", () => {
    const a1 = ap({ id: "1", appointment_date: "2026-10-20", appointment_time: "10:00" });
    const a2 = ap({ id: "2", appointment_date: "2026-10-20", appointment_time: "10:00", patient_email: "b@x.com" });
    const a3 = ap({ id: "3", appointment_date: "2026-10-20", appointment_time: "10:00", patient_email: "c@x.com" });
    const a4 = ap({ id: "4", appointment_date: "2026-10-24", appointment_time: "08:00", patient_email: "d@x.com" }); // ainda no prazo
    const r = recordCompliance([a1, a2, a3, a4], [
      { appointment_id: "1", created_at: "2026-10-21T10:00:00" },
      { patient_email: "b@x.com", session_date: "2026-10-20", created_at: "2026-10-23T10:00:00" },
    ], new Date("2026-10-24T12:00:00"), 30);
    expect(r.onTime).toBe(1);
    expect(r.late).toBe(1);
    expect(r.pendingCount).toBe(1);
    expect(r.evaluated).toBe(3);
    expect(r.rate).toBe(33);
  });
});

describe("frequência real vs prescrita", () => {
  const patients = [
    { id: "1", full_name: "Ana", email: "a@x.com", created_at: "2026-01-01", prescribed_weekly_frequency: 2 },
    { id: "2", full_name: "Ina", email: "i@x.com", created_at: "2026-01-01", prescribed_weekly_frequency: 3 },
    { id: "3", full_name: "SemFreq", email: "s@x.com", created_at: "2026-01-01" },
    { id: "4", full_name: "Alta", email: "d@x.com", created_at: "2026-01-01", prescribed_weekly_frequency: 2 },
  ];
  const appts = [
    ap({ patient_email: "a@x.com", appointment_date: "2026-10-01" }), ap({ patient_email: "a@x.com", appointment_date: "2026-10-08" }),
    ap({ patient_email: "a@x.com", appointment_date: "2026-10-15" }), ap({ patient_email: "a@x.com", appointment_date: "2026-10-22" }),
    ap({ patient_email: "i@x.com", appointment_date: "2026-08-01" }), // inativa (60d+)
    ap({ patient_email: "d@x.com", appointment_date: "2026-10-20" }), // alta → fora
  ];
  const r = frequencyAdherenceGap(appts, patients as any, new Set(["d@x.com"]), today);
  it("só mede ativos com frequência preenchida e sem alta; real = sessões/4 semanas", () => {
    expect(r.measured).toBe(1);
    expect(r.rows[0].actual).toBe(1);
    expect(r.rows[0].gap).toBe(-1);
    expect(r.adherence).toBe(50);
  });
});

describe("indicação orgânica", () => {
  it("taxa considera só quem tem origem preenchida", () => {
    const r = referralMix([
      { id: "1", created_at: "2026-10-01", referral_source: "patient" },
      { id: "2", created_at: "2026-10-02", referral_source: "patient" },
      { id: "3", created_at: "2026-09-10", referral_source: "doctor" },
      { id: "4", created_at: "2026-10-03" },
    ] as any, today);
    expect(r.known).toBe(3);
    expect(r.referralRate).toBe(67);
    expect(r.months.at(-1)).toEqual({ month: "2026-10", total: 3, referral: 2 });
  });
});

describe("pacientes sem próximo horário", () => {
  it("lista ativo sem retorno; ignora alta, agendado e inativo", () => {
    const rows = leakageNoNextAppointment([
      ap({ patient_email: "a@x.com", patient_name: "Alta", appointment_date: "2026-10-20" }),
      ap({ patient_email: "b@x.com", patient_name: "Bet", appointment_date: "2026-10-20" }),
      ap({ patient_email: "c@x.com", patient_name: "Cat", appointment_date: "2026-10-20" }), ap({ patient_email: "c@x.com", status: "scheduled", appointment_date: "2026-10-30" }),
      ap({ patient_email: "old@x.com", patient_name: "Old", appointment_date: "2026-07-01" }),
    ], new Set(["a@x.com"]), today);
    expect(rows.map((r) => r.key)).toEqual(["b@x.com"]);
    expect(rows[0].daysSince).toBe(4);
  });
});

describe("cancelamento tardio", () => {
  it("<2h antes é tardio; exato 2h é antecipado; sem carimbo é desconhecido", () => {
    const r = lateCancellations([
      ap({ status: "cancelled", appointment_time: "10:00", status_changed_at: "2026-10-20T08:30:00Z" }),
      ap({ status: "cancelled", appointment_time: "10:00", status_changed_at: "2026-10-20T08:00:00Z" }),
      ap({ status: "cancelled", appointment_time: "10:00", status_changed_at: null }),
      ap({ status: "no_show" }),
    ], today, 30);
    expect(r.late).toBe(1);
    expect(r.early).toBe(1);
    expect(r.unknown).toBe(1);
    expect(r.lateRate).toBe(50);
  });
});

describe("dependência do titular e gargalo de capacidade", () => {
  it("share do titular sobre as sessões realizadas", () => {
    const r = ownerDependence([ap({ professional_id: "t1" }), ap({ professional_id: "t1" }), ap({ professional_id: "t2" })], "t1", today, 30, 100);
    expect(r.share).toBe(67);
    expect(r.revenueShare).toBe(67);
  });
  it("horário travado quando reservas simultâneas atingem a capacidade", () => {
    const r = capacityBottleneck([
      ap({ appointment_date: "2026-10-20", appointment_time: "09:00", status: "scheduled" }),
      ap({ appointment_date: "2026-10-20", appointment_time: "09:00", status: "completed", patient_email: "b@x.com" }),
      ap({ appointment_date: "2026-10-21", appointment_time: "09:00", patient_email: "c@x.com" }),
    ], 2, null, today, 30);
    expect(r.capacity).toBe(2);
    expect(r.used).toBe(2);
    expect(r.saturated).toBe(1);
    expect(r.index).toBe(50);
    expect(r.top[0]).toMatchObject({ weekday: 2, hour: "09", hits: 1 });
  });
});
