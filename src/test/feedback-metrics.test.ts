import { describe, it, expect } from "vitest";
import {
  npsSummary, areaScores, attentionPoints, filterByPeriod, responseDetails, byService, monthlyTrend,
  itemScore, FEEDBACK_ITEMS, type FeedbackRow,
} from "@/lib/feedbackMetrics";

let n = 0;
const row = (o: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: `r${++n}`, created_at: "2026-11-20T12:00:00Z", service_type: "fisioterapia",
  service_answers: {}, professional_answers: {}, clinic_answers: {}, general_observations: null, ...o,
});
const rec = (v: string) => row({ service_answers: { recommend: v } });

describe("NPS da pesquisa", () => {
  it("promotores − detratores sobre quem respondeu; neutros contam na base", () => {
    const s = npsSummary([rec("sim"), rec("sim"), rec("talvez"), rec("nao")]);
    expect(s).toMatchObject({ answered: 4, promoters: 2, passives: 1, detractors: 1, nps: 25, passivePct: 25 });
  });

  it("resposta em branco não dilui a nota", () => {
    const s = npsSummary([rec("sim"), row()]);
    expect(s.responses).toBe(2);
    expect(s.answered).toBe(1);
    expect(s.nps).toBe(100);
  });

  it("sem resposta de recomendação não inventa nota", () => {
    expect(npsSummary([row()]).nps).toBeNull();
    expect(npsSummary([]).nps).toBeNull();
  });
});

describe("dimensões da pesquisa", () => {
  it("todas as perguntas do formulário entram: serviço, profissional e clínica", () => {
    const areas = areaScores([row({
      service_answers: { quality: "excelente", result: "parcialmente" },
      professional_answers: { communication: "bom", punctuality: "as_vezes", empathy: "excelente" },
      clinic_answers: { cleanliness: "regular", scheduling: "muito_facil", environment: "bom" },
    })]);
    expect(areas.map((a) => a.area)).toEqual(["service", "professional", "clinic"]);
    expect(areas.map((a) => a.items.map((i) => i.item.key))).toEqual([
      ["quality", "result"], ["communication", "punctuality", "empathy"], ["cleanliness", "scheduling", "environment"],
    ]);
    expect(areas[0].positivePct).toBe(50);
    expect(areas[1].positivePct).toBe(67);
    expect(areas[2].positivePct).toBe(67);
  });

  it("pergunta sem resposta fica sem percentual, nunca 0%", () => {
    const s = itemScore([row()], FEEDBACK_ITEMS[0]);
    expect(s.answered).toBe(0);
    expect(s.positivePct).toBeNull();
  });

  it("ponto de atenção exige 5 respostas e 15% desfavoráveis", () => {
    const late = (v: string) => row({ professional_answers: { punctuality: v } });
    const few = areaScores([late("frequentemente"), late("as_vezes")]);
    expect(attentionPoints(few)).toHaveLength(0);

    const enough = areaScores([late("sempre"), late("sempre"), late("geralmente"), late("sempre"), late("as_vezes")]);
    const pts = attentionPoints(enough);
    expect(pts.map((p) => p.item.key)).toEqual(["punctuality"]);
    expect(pts[0].negativePct).toBe(20);

    const fine = areaScores([...Array(9)].map(() => late("sempre")).concat(late("as_vezes")));
    expect(attentionPoints(fine)).toHaveLength(0);
  });
});

describe("período, serviço e tendência", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  const rows = [
    row({ created_at: "2026-11-20T12:00:00Z", service_type: "pilates", service_answers: { recommend: "sim", quality: "bom" } }),
    row({ created_at: "2026-10-01T12:00:00Z", service_answers: { recommend: "nao", quality: "ruim" } }),
    row({ created_at: "2026-04-17T12:00:00Z", service_answers: { recommend: "sim", quality: "excelente" } }),
  ];

  it("filtra a janela atual e a anterior", () => {
    expect(filterByPeriod(rows, 30, now)).toHaveLength(1);
    expect(filterByPeriod(rows, 30, now, 30).map((r) => r.created_at)).toEqual(["2026-10-01T12:00:00Z"]);
    expect(filterByPeriod(rows, 90, now)).toHaveLength(2);
    expect(filterByPeriod(rows, null, now)).toHaveLength(3);
  });

  it("separa por serviço e por mês", () => {
    const svc = byService(rows);
    expect(svc.find((s) => s.service === "pilates")).toMatchObject({ responses: 1, nps: 100, satisfaction: 100 });
    expect(svc.find((s) => s.service === "fisioterapia")).toMatchObject({ responses: 2, nps: 0, satisfaction: 50 });
    expect(monthlyTrend(rows).map((t) => t.key)).toEqual(["2026-04", "2026-10", "2026-11"]);
  });
});

describe("voz do paciente", () => {
  it("mantém os quatro comentários inteiros e marca nota baixa", () => {
    const long = "Atendimento ótimo, mas esperei quarenta minutos na recepção sem aviso e ninguém explicou o motivo do atraso.";
    const [d] = responseDetails([row({
      service_answers: { recommend: "talvez", quality: "bom", observations: "Melhorei da dor." },
      professional_answers: { punctuality: "frequentemente", observations: long },
      clinic_answers: { observations: "  " },
      general_observations: "Voltaria.",
    })]);
    expect(d.sentiment).toBe("passive");
    expect(d.comments).toEqual([
      { area: "service", text: "Melhorei da dor." },
      { area: "professional", text: long },
      { area: "general", text: "Voltaria." },
    ]);
    expect(d.hasLowRating).toBe(true);
    expect(d.ratings.map((r) => [r.item.key, r.positive])).toEqual([["quality", true], ["punctuality", false]]);
  });

  it("resposta só com notas boas não é nota baixa", () => {
    const [d] = responseDetails([row({ service_answers: { recommend: "sim", quality: "excelente" } })]);
    expect(d.hasLowRating).toBe(false);
    expect(d.comments).toHaveLength(0);
  });
});
