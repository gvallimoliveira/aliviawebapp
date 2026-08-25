import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen, fireEvent, within } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AssessmentSummaryView from "@/components/assessment/AssessmentSummaryView";

const renderView = (assessment: any) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <AssessmentSummaryView
          assessment={assessment}
          onDownloadPdf={vi.fn()}
          onShareWhatsApp={vi.fn()}
          professionalContext
        />
      </LanguageProvider>
    </MemoryRouter>
  );

const base = {
  id: "a1",
  type: "premium",
  status: "completed",
  created_at: new Date().toISOString(),
  patient_name: "Ana Beatriz",
  pain_regions: ["right_knee"],
  pain_score: 7,
  diagnosis: { hypothesis: "Lesão meniscal medial", confidence: "moderate" },
  test_results: [],
  anamnesis_data: {},
  treatment_plan: null,
};

describe("AssessmentSummaryView — respostas da triagem de red flags", () => {
  it("shape legado ({key:bool}): lista positivas e expande Q&A completo", () => {
    renderView({
      ...base,
      red_flags: {
        "redflags.fever": false,
        "redflags.cancer": false,
        "redflags.trauma": true,
        "redflags.sphincter": false,
        "redflags.night_pain": true,
        "redflags.weight_loss": false,
        "redflags.recent_surgery": false,
        "redflags.numbness_progressive": true,
      },
    });

    // Card sinaliza red flags detectadas
    expect(screen.getByText(/sinais de alerta identificados/i)).toBeTruthy();

    // Q&A fica recolhido por padrão
    const toggle = screen.getByText(/Respostas da triagem de segurança/i);
    expect(screen.queryAllByText(/^Sim$/).length).toBe(0);

    fireEvent.click(toggle);

    // 8 perguntas: 3 Sim + 5 Não
    const list = toggle.parentElement!.querySelector("ul")!;
    const items = within(list as HTMLElement).getAllByRole("listitem");
    expect(items.length).toBe(8);
    expect(within(list as HTMLElement).getAllByText("Sim").length).toBe(3);
    expect(within(list as HTMLElement).getAllByText("Não").length).toBe(5);
  });

  it("shape v1 (payload probatório): usa o texto da pergunta armazenado", () => {
    renderView({
      ...base,
      red_flags: {
        version: 1,
        answered_at: new Date().toISOString(),
        language: "pt",
        answers: [
          { key: "redflags.trauma", question: "Sofreu acidente ou impacto?", answer: "yes" },
          { key: "redflags.fever", question: "Teve febre?", answer: "no" },
        ],
        detected: ["redflags.trauma"],
        any_positive: true,
        outcome: "continued_under_reservation",
      },
    });

    // detected com chave i18n é traduzido, não renderizado cru
    expect(screen.queryByText("redflags.trauma")).toBeNull();

    fireEvent.click(screen.getByText(/Respostas da triagem de segurança/i));
    expect(screen.getByText("Sofreu acidente ou impacto?")).toBeTruthy();
    expect(screen.getByText("Teve febre?")).toBeTruthy();
    expect(screen.getByText("Sim")).toBeTruthy();
    expect(screen.getByText("Não")).toBeTruthy();
  });

  it("sem red flags: mostra liberação e ainda expõe a triagem (tudo 'Não')", () => {
    renderView({
      ...base,
      red_flags: { "redflags.trauma": false, "redflags.fever": false },
    });
    expect(screen.getByText(/nenhuma detectada/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Respostas da triagem de segurança/i));
    expect(screen.getAllByText("Não").length).toBe(2);
  });
});
