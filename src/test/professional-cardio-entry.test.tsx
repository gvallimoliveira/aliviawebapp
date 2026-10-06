import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfessionalCardioEntry from "@/components/dashboard/periodization/ProfessionalCardioEntry";
import CardioSafetyCard from "@/components/dashboard/periodization/CardioSafetyCard";

const patient = vi.hoisted(() => ({ birth: null as string | null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { birth_date: patient.birth }, error: null }) }) }) }) },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/periodizationData", () => ({ saveProfessionalSession: vi.fn() }));

describe("monitor session demographics", () => {
  beforeEach(() => { patient.birth = null; });
  it("uses a birth date added later without losing session inputs", async () => {
    render(<ProfessionalCardioEntry patientId="patient" plan={null} entries={[]} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lançar sessão monitorada" }));
    fireEvent.change(screen.getByLabelText("Duração (min)"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("FC média (bpm)"), { target: { value: "120" } });
    await screen.findByText("precisa de zonas (sem idade cadastrada)");
    patient.birth = "1960-01-01";
    act(() => { window.dispatchEvent(new CustomEvent("reload-pro-patients")); });
    await screen.findByText("estimada pela FC média");
    expect(screen.getByLabelText("Duração (min)")).toHaveValue("30");
    expect(screen.getByLabelText("FC média (bpm)")).toHaveValue("120");
    expect(screen.queryByText("precisa de zonas (sem idade cadastrada)")).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) expect(button).toHaveAttribute("type", "button");
  });
  it("updates the cardiovascular ceiling too, preserving a manual override", async () => {
    render(<CardioSafetyCard patientId="patient" plan={{ id: "plan", cardio_profile: "healthy", hr_ceiling_override: 125 } as any} checkins={[]} entries={[]} onChanged={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("125 bpm")).toBeInTheDocument());
    patient.birth = "1960-01-01";
    act(() => { window.dispatchEvent(new CustomEvent("reload-pro-patients")); });
    await waitFor(() => expect(screen.getByText("125 bpm")).toBeInTheDocument());
    expect(screen.getByText("(manual)")).toBeInTheDocument();
  });
});