import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MicroWeekGrid from "@/components/dashboard/periodization/MicroWeekGrid";
import { localISODate, pairSessionsWithSrpe } from "@/lib/periodization";
import { savePlannedDose, saveProfessionalSession, deleteSession, type PeriodizationSession, type SrpeEntry } from "@/lib/periodizationData";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/periodizationData", () => ({ savePlannedDose: vi.fn().mockResolvedValue(undefined), saveProfessionalSession: vi.fn(), deleteSession: vi.fn() }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const session: PeriodizationSession = { id: "run", patient_id: "patient", plan_id: "plan", cycle_id: "cycle", session_date: localISODate(), track: "cardio", planned_load: "moderate", title: "Corrida", exercise_program_id: "hep", notes: "Preservar", planned_duration_min: 0, planned_rpe: 6, planned_target_load: 0, created_source: "professional" };
const entry: SrpeEntry = { id: "performed", patient_id: "patient", plan_id: "plan", session_date: session.session_date, track: "cardio", duration_min: 40, rpe: 7, training_load: 280, source: "patient", notes: null, session_id: "run" };

describe("planned dose edits", () => {
  it("updates the existing run, refreshes comparisons and keeps performed load at 280", async () => {
    const changed = vi.fn();
    const view = render(<MicroWeekGrid patientId="patient" planId="plan" sessions={[session]} entries={[entry]} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar dose planejada: Corrida" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Duração planejada (min)" }), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dose planejada" }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(savePlannedDose).toHaveBeenCalledWith(expect.objectContaining({ id: "run", patientId: "patient", planId: "plan", sessionDate: session.session_date, track: "cardio", plannedDurationMin: 40, plannedRpe: 6, notes: "Preservar", source: "professional" }));
    expect(deleteSession).not.toHaveBeenCalled();
    expect(saveProfessionalSession).not.toHaveBeenCalled();
    const updated = { ...session, planned_duration_min: 40, planned_target_load: 240 };
    view.rerender(<MicroWeekGrid patientId="patient" planId="plan" sessions={[updated]} entries={[entry]} onChanged={changed} />);
    expect(pairSessionsWithSrpe([updated], [entry])[0]).toMatchObject({ plannedLoad: 240, realLoad: 280 });
    expect(screen.getByText("Percebido: 280")).toBeTruthy();
  });

  it("does not report a successful edit when saving fails", async () => {
    vi.mocked(savePlannedDose).mockRejectedValueOnce(new Error("Falha"));
    const changed = vi.fn();
    render(<MicroWeekGrid patientId="patient" sessions={[session]} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar dose planejada: Corrida" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar dose planejada" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar dose planejada" }).hasAttribute("disabled")).toBe(false));
    expect(changed).not.toHaveBeenCalled();
  });
});