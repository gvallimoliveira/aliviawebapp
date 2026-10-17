import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClinicalImpressionCard } from "@/components/dashboard/patient-evolution/shared";
import { savedClinicalImpression } from "@/lib/clinicalImpression";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, from: vi.fn() } }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "pt", t: (key: string) => key }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("manual clinical impression reuse", () => {
  const generated = { overview: "Impressão inicial", therapeuticObjectives: ["Recuperar mobilidade"] };

  it("saves the professional's edited text with the generated objectives", () => {
    expect(savedClinicalImpression("Impressão revisada em consulta", generated)).toEqual({
      overview: "Impressão revisada em consulta", therapeuticObjectives: ["Recuperar mobilidade"],
    });
  });

  it("updates the mounted record after a manual assessment save without calling AI", () => {
    const assessment = { id: "patient-assessment", diagnosis: {} };
    const { rerender } = render(<ClinicalImpressionCard assessment={assessment} />);
    const saved = savedClinicalImpression("Impressão salva em consulta", generated);
    rerender(<ClinicalImpressionCard assessment={{ ...assessment, diagnosis: { clinicalImpression: saved } }} existingImpression={saved} />);
    expect(screen.getByText("Impressão salva em consulta")).toBeTruthy();
    expect(screen.getByText("Recuperar mobilidade")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("preserves a saved impression even with new questionnaire data, with zero AI calls", () => {
    render(<ClinicalImpressionCard assessment={{ id: "assessment", needs_reimpression: true }} existingImpression={generated} />);
    expect(screen.getByText("Impressão inicial")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not show another patient's impression when the assessment changes", () => {
    const { rerender } = render(<ClinicalImpressionCard assessment={{ id: "first" }} existingImpression={generated} />);
    rerender(<ClinicalImpressionCard assessment={{ id: "second" }} />);
    expect(screen.queryByText("Impressão inicial")).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});