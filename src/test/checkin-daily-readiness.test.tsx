import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PeriodizationCheckin from "@/pages/PeriodizationCheckin";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("react-router-dom", () => ({ useParams: () => ({}) }));
vi.mock("@/lib/seo", () => ({ setSeo: vi.fn() }));
vi.mock("@/components/periodization/CardioPrintReader", () => ({ default: () => null }));
vi.mock("@/components/periodization/ExternalWorkoutImport", () => ({ default: () => null }));
vi.mock("@/components/ClinicBrandHeader", () => ({ default: () => null }));
vi.mock("@/components/ui/slider", () => ({ Slider: ({ onValueChange }: any) => <button onClick={() => onValueChange([8])}>Set scale</button> }));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>, TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>, TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

const info = {
  audience: "patient", today: "2026-10-23", restrictions: [],
  today_checkin: { soreness: 2, sleep: 7, stress: 3, fatigue: 3, readiness: 7, pain: 2, note: "Saved note" },
  today_targets: [{ id: "running-today", track: "cardio", planned_duration_min: 0, planned_rpe: 6, title: "Corrida", already_reported: false }],
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("daily readiness independent of session load", () => {
  it("reuses today's readiness over three activity submissions without sending new readiness", async () => {
    invoke.mockImplementation(async (_: string, { body }: any) => ({ data: body.action === "load" ? { info } : { ok: true } }));
    render(<PeriodizationCheckin token="patient-token" embedded />);
    await screen.findByRole("button", { name: "Ajustar respostas de hoje" });
    expect(screen.getAllByText("Set scale")).toHaveLength(1); // session effort only; daily scales are locked
    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByPlaceholderText("Ex.: 50"), { target: { value: "40" } });
      fireEvent.click(screen.getByRole("button", { name: "Registrar sessão" }));
      await screen.findByRole("button", { name: "Registrar outra sessão" });
      fireEvent.click(screen.getByRole("button", { name: "Registrar outra sessão" }));
    }
    const actions = invoke.mock.calls.map((c) => c[1].body.action);
    expect(actions.filter((a) => a === "submit_srpe")).toHaveLength(3);
    expect(actions.filter((a) => a === "submit_checkin")).toHaveLength(0);
    expect(invoke.mock.calls.find((c) => c[1].body.action === "submit_srpe")?.[1].body.entry.session_id).toBe("running-today");
  });
  it("edits the same daily response only after explicitly unlocking it", async () => {
    invoke.mockImplementation(async (_: string, { body }: any) => ({ data: body.action === "load" ? { info: { ...info, today_targets: [] } } : { ok: true } }));
    render(<PeriodizationCheckin token="patient-token" embedded />);
    fireEvent.click(await screen.findByRole("button", { name: "Ajustar respostas de hoje" }));
    fireEvent.click(screen.getAllByText("Set scale")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Enviar check-in" }));
    await waitFor(() => expect(invoke.mock.calls.filter((c) => c[1].body.action === "submit_checkin")).toHaveLength(1));
    const request = invoke.mock.calls.find((c) => c[1].body.action === "submit_checkin")?.[1].body;
    expect(request.values.readiness).toBe(8);
    expect(request.values.note).toBe("Saved note");
    await screen.findByRole("button", { name: "Ajustar respostas de hoje" });
  });
});