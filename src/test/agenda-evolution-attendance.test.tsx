import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentEditorDialog, { type AptInput } from "@/components/dashboard/AppointmentEditorDialog";

const mocks = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn(), failNote: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/dashboard/DictationBar", () => ({ default: () => null }));
vi.mock("@/components/dashboard/RecurrencePicker", () => ({ default: () => null }));

const appointment: AptInput = {
  id: "apt-1", professional_id: "pro-1", patient_email: "patient@example.com",
  patient_name: "Paciente teste", appointment_date: "2026-11-11", appointment_time: "14:00",
  duration_minutes: 50, notes: null, type: "in_person", status: "scheduled", created_at: "2026-11-11",
};

function open(status = "scheduled", onSetStatus = vi.fn().mockResolvedValue(undefined), isSimulated = false) {
  render(<AppointmentEditorDialog open onClose={vi.fn()} initialApt={{ ...appointment, status }}
    defaultDate={new Date("2026-11-11T12:00:00")} defaultTime="14:00" professionalId="pro-1"
    isSimulated={isSimulated} isClinicOnlyMode={false} clinicProfessionals={[]}
    knownPatients={[{ name: appointment.patient_name, email: "patient@example.com" }]}
    language="pt" isPt t={k => k} serviceMaps={{ labels: { fisioterapia: { pt: "Fisioterapia" } }, dot: {} }}
    onSubmit={vi.fn()} onRequestDelete={vi.fn()} onSetStatus={onSetStatus} />);
  return onSetStatus;
}

beforeEach(() => {
  mocks.failNote = false;
  mocks.toast.mockReset();
  mocks.from.mockReset().mockImplementation((table: string) => {
    const result = table === "assessments" ? { data: [{ id: "assessment-1" }], error: null }
      : { data: [], error: null };
    const chain: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "gte", "lte", "order", "limit"]) chain[method] = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    chain.upsert = vi.fn(async () => ({ error: mocks.failNote ? new Error("note failed") : null }));
    chain.insert = vi.fn(async () => ({ error: null }));
    return chain;
  });
});
afterEach(cleanup);

async function saveNote() {
  const field = await screen.findByPlaceholderText("Descreva o que foi feito neste atendimento...");
  fireEvent.change(field, { target: { value: "Mobilização realizada, paciente tolerou bem." } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar evolução" }));
  return field;
}

describe("evolution confirms attendance in open appointments", () => {
  it("saves evolution while scheduled and only then marks completed", async () => {
    const setStatus = open();
    await saveNote();
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith("apt-1", "completed"));
    expect(mocks.from.mock.calls.some(([table]) => table === "professional_notes")).toBe(true);
  });
  it("empty/whitespace evolution never changes attendance", async () => {
    const setStatus = open();
    const field = await screen.findByPlaceholderText("Descreva o que foi feito neste atendimento...");
    fireEvent.change(field, { target: { value: "  \n " } });
    expect(screen.getByRole("button", { name: "Salvar evolução" })).toBeDisabled();
    expect(setStatus).not.toHaveBeenCalled();
  });
  it("typing a draft does not mark attendance", async () => {
    const setStatus = open();
    fireEvent.change(await screen.findByPlaceholderText("Descreva o que foi feito neste atendimento..."), { target: { value: "Rascunho" } });
    expect(setStatus).not.toHaveBeenCalled();
  });
  it("failed evolution save never marks attendance and preserves draft", async () => {
    const setStatus = open();
    mocks.failNote = true;
    const field = await saveNote();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro ao salvar evolução" })));
    expect(setStatus).not.toHaveBeenCalled();
    expect(field).toHaveValue("Mobilização realizada, paciente tolerou bem.");
  });
  it("attendance failure keeps the saved note, clears draft and gives an explicit warning", async () => {
    open("scheduled", vi.fn().mockRejectedValue(new Error("status failed")));
    const field = await saveNote();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Evolução salva; comparecimento não atualizado" })));
    expect(field).toHaveValue("");
  });
  it.each(["completed", "no_show", "no_show_justified"])("preserves explicitly classified status %s", async status => {
    const setStatus = open(status);
    await saveNote();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: "Evolução registrada" }));
    expect(setStatus).not.toHaveBeenCalled();
  });
  it("PRO demo agenda saves evolution locally and marks attended", async () => {
    const setStatus = open("scheduled", vi.fn().mockResolvedValue(undefined), true);
    await saveNote();
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith("apt-1", "completed"));
    expect(mocks.from.mock.calls.some(([table]) => table === "professional_notes" || table === "session_notes")).toBe(false);
  });
});