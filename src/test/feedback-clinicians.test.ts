import { describe, it, expect } from "vitest";
import { feedbackByClinician, feedbackLink, filterFeedbackClinician } from "@/lib/feedbackClinicians";
import { npsSummary, responseDetails, type FeedbackRow } from "@/lib/feedbackMetrics";
import { feedbackCsv } from "@/lib/feedbackExport";

const rows: FeedbackRow[] = [
  { id: "1", created_at: "2026-11-27T12:00:00Z", service_type: "pilates", clinician_member_id: "a", clinician_name: "Ana", service_answers: { recommend: "sim" } },
  { id: "2", created_at: "2026-11-27T12:00:00Z", service_type: "pilates", clinician_member_id: "b", clinician_name: "Ana", service_answers: { recommend: "nao" } },
  { id: "3", created_at: "2026-11-27T12:00:00Z", service_type: "fisioterapia", professional_id: "old", service_answers: { recommend: "talvez" } },
  { id: "4", created_at: "2026-11-27T12:00:00Z", service_type: "fisioterapia" },
];
describe("vínculo da pesquisa ao integrante", () => {
  it("mantém serviço e integrante no mesmo link", () => {
    const link = new URL(feedbackLink("https://example.com", "clinic", "pilates", "a"));
    expect(link.searchParams.get("member_id")).toBe("a");
    expect(link.searchParams.get("service")).toBe("pilates");
    expect(feedbackLink("https://example.com", "clinic", "all", "all")).toBe("https://example.com/feedback/clinic/clinic");
  });
  it("não mistura homônimos e calcula só o profissional escolhido", () => {
    const filtered = filterFeedbackClinician(rows, "member:a");
    expect(filtered.map((r) => r.id)).toEqual(["1"]);
    expect(npsSummary(filtered).nps).toBe(100);
    expect(npsSummary(filterFeedbackClinician(rows, "member:b")).nps).toBe(-100);
  });
  it("preserva registros antigos e sem profissional, sem atribuição inventada", () => {
    expect(filterFeedbackClinician(rows, "legacy:old").map((r) => r.id)).toEqual(["3"]);
    expect(filterFeedbackClinician(rows, "unassigned").map((r) => r.id)).toEqual(["4"]);
    expect(filterFeedbackClinician(rows, "all")).toHaveLength(4);
  });
  it("mantém nome do avaliado nas respostas e planilha filtrada", () => {
    const filtered = filterFeedbackClinician(rows, "member:a");
    expect(responseDetails(filtered)[0].clinician_name).toBe("Ana");
    const csv = feedbackCsv(filtered, "pt");
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"Ana"');
  });
  it("compara perguntas profissionais sem atribuir NPS do serviço ou respostas anônimas à equipe", () => {
    const scores = feedbackByClinician([
      { ...rows[0], professional_answers: { communication: "bom", empathy: "ruim" } },
      rows[3],
    ]);
    expect(scores).toHaveLength(1);
    expect(scores[0].items.map((i) => [i.item.key, i.positivePct, i.answered])).toEqual([
      ["communication", 100, 1], ["punctuality", null, 0], ["empathy", 0, 1],
    ]);
  });
});