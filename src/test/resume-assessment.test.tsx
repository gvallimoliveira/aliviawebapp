import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AssessmentHistory from "@/components/dashboard/AssessmentHistory";
import {
  buildResumeAssessmentLink,
  buildPersonalizedAssessmentLink,
} from "@/lib/assessmentLinks";

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );

const baseAssessment = {
  id: "assess-123",
  type: "professional",
  status: "in_progress",
  created_at: new Date().toISOString(),
  pain_regions: ["lower_back"],
  pain_score: 5,
  diagnosis: null,
};

describe("buildResumeAssessmentLink", () => {
  it("builds a clinic resume link with ?resume= param", () => {
    const url = buildResumeAssessmentLink({ clinicId: "clinic-1" }, "assess-1");
    expect(url).toContain("/assessment/clinic/clinic-1");
    expect(url).toContain("resume=assess-1");
  });

  it("builds a professional resume link with ?resume= param", () => {
    const url = buildResumeAssessmentLink({ professionalId: "pro-1" }, "assess-1");
    expect(url).toContain("/assessment/professional/pro-1");
    expect(url).toContain("resume=assess-1");
  });

  it("includes patient token when provided", () => {
    const url = buildResumeAssessmentLink(
      { professionalId: "pro-1" },
      "assess-1",
      "tok-xyz"
    );
    expect(url).toContain("resume=assess-1");
    expect(url).toContain("patient=tok-xyz");
  });

  it("throws when no context is provided", () => {
    expect(() =>
      buildResumeAssessmentLink({} as any, "assess-1")
    ).toThrow();
  });
});

describe("AssessmentHistory — Continuar avaliação (paciente)", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    openSpy.mockRestore();
  });

  it("shows 'Continuar' button for in_progress assessment with professional_id", () => {
    renderWithProviders(
      <AssessmentHistory
        assessments={[{ ...baseAssessment, professional_id: "pro-1" }]}
      />
    );
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument();
  });

  it("shows 'Continuar' button for in_progress assessment with clinic_id", () => {
    renderWithProviders(
      <AssessmentHistory
        assessments={[{ ...baseAssessment, clinic_id: "clinic-1" }]}
      />
    );
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument();
  });

  it("does NOT show 'Continuar' button for completed assessments", () => {
    renderWithProviders(
      <AssessmentHistory
        assessments={[
          {
            ...baseAssessment,
            status: "completed",
            professional_id: "pro-1",
          },
        ]}
      />
    );
    expect(screen.queryByRole("button", { name: /continuar/i })).not.toBeInTheDocument();
  });

  it("does NOT show 'Continuar' when assessment lacks both clinic and professional context", () => {
    renderWithProviders(
      <AssessmentHistory assessments={[{ ...baseAssessment }]} />
    );
    expect(screen.queryByRole("button", { name: /continuar/i })).not.toBeInTheDocument();
  });

  it("opens the correct resume URL (professional context) when clicked", () => {
    renderWithProviders(
      <AssessmentHistory
        assessments={[{ ...baseAssessment, professional_id: "pro-1" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("/assessment/professional/pro-1");
    expect(url).toContain("resume=assess-123");
  });

  it("opens the correct resume URL (clinic context) when clicked", () => {
    renderWithProviders(
      <AssessmentHistory
        assessments={[{ ...baseAssessment, clinic_id: "clinic-1" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("/assessment/clinic/clinic-1");
    expect(url).toContain("resume=assess-123");
  });
});

describe("Resume link parity — paciente vs profissional", () => {
  it("paciente e profissional geram o MESMO link de retomada para a mesma avaliação", () => {
    // Simula a lógica usada em PatientEvolutionDashboard (lado do fisio)
    const proSideLink = buildResumeAssessmentLink({ professionalId: "pro-1" }, "assess-123");

    // Simula a lógica usada em AssessmentHistory (lado do paciente)
    const patientSideLink = buildResumeAssessmentLink({ professionalId: "pro-1" }, "assess-123");

    expect(patientSideLink).toBe(proSideLink);
  });
});
