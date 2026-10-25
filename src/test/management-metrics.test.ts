import { describe, it, expect } from "vitest";
import {
  emptyChairCost, availableHours, revenuePerHour, closedCycles, clinicalLtv, dischargeVsDropout, recordCompliance,
  frequencyAdherenceGap, referralMix, leakageNoNextAppointment, lateCancellations, ownerDependence, capacityBottleneck,
  buildPriceResolver, synthesizeNoteSessions, type MgmtAppt,
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
  it("só mede ativos com frequência preenchida e sem alta; real usa somente o mês decorrido", () => {
    expect(r.measured).toBe(1);
    expect(r.rows[0].actual).toBe(1.2);
    expect(r.rows[0].gap).toBe(-0.8);
    expect(r.adherence).toBe(58);
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

describe("prontuário: horário passado sem classificação", () => {
  it("slot antigo 'scheduled' sem evolução vira pendência e derruba a taxa", () => {
    const u1 = ap({ id: "u1", status: "scheduled", appointment_date: "2026-10-20", appointment_time: "10:00" });
    const r = recordCompliance([u1], [], new Date("2026-10-24T12:00:00"), 30);
    expect(r.pendingCount).toBe(1);
    expect(r.pending[0].unclassified).toBe(true);
    expect(r.rate).toBe(0);
  });
  it("sem nada para avaliar, a taxa é nula (nunca 100% falso)", () => {
    const r = recordCompliance([], [], new Date("2026-10-24T12:00:00"), 30);
    expect(r.rate).toBeNull();
    expect(r.evaluated).toBe(0);
  });
  it("slot não classificado COM evolução no dia não vira pendência", () => {
    const u1 = ap({ id: "u2", status: "scheduled", appointment_date: "2026-10-20", appointment_time: "10:00" });
    const r = recordCompliance([u1], [{ patient_email: "a@x.com", session_date: "2026-10-20", created_at: "2026-10-20T15:00:00" }], new Date("2026-10-24T12:00:00"), 30);
    expect(r.pendingCount).toBe(0);
  });
});

describe("serviços e mensalidade diluída", () => {
  const services = [
    { id: "s1", name: "Plano mensal", price: 400, billing_type: "monthly" as const },
    { id: "s2", name: "Avulso", price: 180, billing_type: "per_session" as const },
  ];
  it("mensal dilui por sessão realizada no mês; falta não gera valor", () => {
    const a1 = ap({ service_id: "s1", appointment_date: "2026-10-05" });
    const a2 = ap({ service_id: "s1", appointment_date: "2026-10-12" });
    const a3 = ap({ service_id: "s1", status: "no_show", appointment_date: "2026-10-19" });
    const priceOf = buildPriceResolver([a1, a2, a3], services, 100);
    expect(priceOf(a1)).toBe(200);
    expect(priceOf(a2)).toBe(200);
    expect(priceOf(a3)).toBe(0);
  });
  it("serviço avulso sobrepõe o preço padrão; sem serviço usa o padrão", () => {
    const a1 = ap({ service_id: "s2" });
    const a2 = ap({});
    const priceOf = buildPriceResolver([a1, a2], services, 100);
    expect(priceOf(a1)).toBe(180);
    expect(priceOf(a2)).toBe(100);
  });
});

describe("evolução registrada conta como sessão realizada", () => {
  it("nota em dia sem atendimento concluído cria sessão; mesmo dia não duplica", () => {
    const merged = synthesizeNoteSessions(
      [ap({ id: "1", appointment_date: "2026-10-20" })],
      [
        { patient_email: "a@x.com", session_date: "2026-10-20", created_at: "2026-10-20T12:00:00" },
        { patient_email: "b@x.com", session_date: "2026-10-21", created_at: "2026-10-21T12:00:00" },
      ]
    );
    expect(merged).toHaveLength(2);
    expect(merged.some((m) => m.id === "note:b@x.com|2026-10-21" && m.status === "completed")).toBe(true);
  });
});

describe("cancelamento tardio (rodada 2)", () => {
  it("slot sem hora não finge antecedência; janela segue a data do cancelamento", () => {
    const r = lateCancellations([
      ap({ status: "cancelled", appointment_date: "2026-10-20", appointment_time: null, status_changed_at: "2026-10-20T08:00:00Z" }),
      ap({ status: "cancelled", appointment_date: "2026-11-05", appointment_time: "10:00", status_changed_at: "2026-10-23T10:30:00Z" }), // cancelado na janela, slot fora
      ap({ status: "cancelled", appointment_date: "2026-10-22", appointment_time: "10:00", status_changed_at: "2026-10-22T09:00:00Z" }), // 1h antes → tardio
    ], today, 7);
    expect(r.total).toBe(3);
    expect(r.unknown).toBe(1);
    expect(r.early).toBe(1);
    expect(r.late).toBe(1);
    expect(r.lateRate).toBe(50);
  });
});

describe("sem próximo horário (rodada 2)", () => {
  it("usa o nome da sessão mais recente e resolve nome pelo cadastro quando só há evolução", () => {
    const rows = leakageNoNextAppointment([
      ap({ patient_email: "a@x.com", patient_name: "Ana A.", appointment_date: "2026-10-01" }),
      ap({ patient_email: "a@x.com", patient_name: "Ana Souza", appointment_date: "2026-10-15" }),
      ap({ patient_email: "b@x.com", patient_name: null, appointment_date: "2026-10-10" }),
    ], new Set(), today, 60, [{ id: "p1", full_name: "Bruno Lima", email: "b@x.com", created_at: "2026-01-01" }]);
    expect(rows.find((r) => r.key === "a@x.com")?.name).toBe("Ana Souza");
    expect(rows.find((r) => r.key === "b@x.com")?.name).toBe("Bruno Lima");
  });
});

describe("gargalo de capacidade (rodada 2)", () => {
  it("solo (capacidade 1) não infla saturação; ocupação usa os horários possíveis", () => {
    // 5 dias úteis na janela de 7d, 10h/dia possíveis → 50 slots; 2 usados
    const r = capacityBottleneck([
      ap({ appointment_date: "2026-10-20", appointment_time: "09:00", status: "scheduled" }),
      ap({ appointment_date: "2026-10-21", appointment_time: "10:00", status: "completed" }),
    ], 1, null, today, 7, { start: "08:00", end: "18:00", workingDays: [1, 2, 3, 4, 5] });
    expect(r.possible).toBe(50);
    expect(r.used).toBe(2);
    expect(r.occupancy).toBe(4);
  });
  it("clínica com 2 terapeutas e 1 maca satura só com 2 reservas simultâneas... capacidade = min", () => {
    const r = capacityBottleneck([
      ap({ appointment_date: "2026-10-20", appointment_time: "09:00" }),
      ap({ appointment_date: "2026-10-20", appointment_time: "09:00", patient_email: "b@x.com", professional_id: "t2" }),
    ], 2, 1, today, 7);
    expect(r.capacity).toBe(1);
    expect(r.saturated).toBe(1);
    expect(r.index).toBe(100);
  });
});


describe("frequência proporcional ao tempo", () => {
  it("4 sessões em 14 dias com prescrição de 2/semana são 100%, não 50%", () => {
    const r = frequencyAdherenceGap([1, 5, 9, 13].map((d) => ap({ appointment_date: `2026-10-${String(d).padStart(2, "0")}` })), [{ id: "1", email: "a@x.com", created_at: "2026-01-01", prescribed_weekly_frequency: 2 }], new Set(), "2026-10-14");
    expect(r.rows[0].expected).toBe(4);
    expect(r.rows[0].completed).toBe(4);
    expect(r.adherence).toBe(100);
  });
  it("não cobra dias anteriores ao início nem conta sessões futuras", () => {
    const r = frequencyAdherenceGap([ap({ appointment_date: "2026-10-08" }), ap({ appointment_date: "2026-10-12" }), ap({ appointment_date: "2026-10-21" })], [{ id: "1", email: "a@x.com", created_at: "2026-10-08", prescribed_weekly_frequency: 2 }], new Set(), "2026-10-14");
    expect(r.rows[0].elapsedDays).toBe(7);
    expect(r.rows[0].expected).toBe(2);
    expect(r.rows[0].completed).toBe(2);
    expect(r.adherence).toBe(100);
  });
});
describe("rastreabilidade financeira", () => {
  it("perdas detalhadas reconciliam com o total e excluem atendimentos realizados", () => {
    const r = emptyChairCost([ap({ id: "lost", status: "no_show", appointment_time: "14:00" }), ap({ id: "done" })], 150, today, 30);
    expect(r.details.map((a) => [a.id, a.appointment_date, a.appointment_time, a.value])).toEqual([["lost", "2026-10-20", "14:00", 150]]);
    expect(r.details.reduce((s, a) => s + a.value, 0)).toBe(r.lostValue);
  });
  it("detalhes do ciclo contêm apenas sessões realizadas até hoje", () => {
    const r = closedCycles([ap({ id: "done", appointment_date: "2026-08-01" }), ap({ id: "lost", status: "no_show" })], new Set(), today);
    expect(r[0].appointments?.map((a) => a.id)).toEqual(["done"]);
  });
});
