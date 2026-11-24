import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoPatientScope, getDemoPatientRows, removeDemoPatient, saveDemoPatient } from "@/lib/demoPatientRegistration";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), toast: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/patientRegistration", () => ({ updatePatientRegistration: mocks.update }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "viewer" } }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "pt" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
import AddPatientModal from "@/components/dashboard/AddPatientModal";

describe("demo registration isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });
  it("separates users, solo and clinic demos", () => {
    const scope = demoPatientScope("actor-a", "pro-1");
    saveDemoPatient(scope, { full_name: "Paciente demo" });
    expect(getDemoPatientRows(scope)).toHaveLength(1);
    expect(getDemoPatientRows(demoPatientScope("actor-b", "pro-1"))).toHaveLength(0);
    expect(getDemoPatientRows(demoPatientScope("actor-a", "pro-1", "clinic-1"))).toHaveLength(0);
  });
  it("adds without UUID errors, writes, assessments or real refresh callbacks", async () => {
    const added = vi.fn();
    render(<AddPatientModal open onOpenChange={vi.fn()} professionalId="demo" demoMode onAdded={added} />);
    fireEvent.change(screen.getByPlaceholderText("Nome do paciente"), { target: { value: "Dentista fictícia" } });
    fireEvent.click(screen.getByRole("button", { name: /^Adicionar$/ }));
    await waitFor(() => expect(getDemoPatientRows(demoPatientScope("viewer", "demo"))).toHaveLength(1));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(added).not.toHaveBeenCalled();
  });
  it("edits the same demo row without changing real registration or duplicating it", () => {
    const scope = demoPatientScope("editing", "demo");
    const row = saveDemoPatient(scope, { full_name: "Original" });
    saveDemoPatient(scope, { full_name: "Corrigido", email: "demo@example.test" }, row);
    expect(getDemoPatientRows(scope)).toHaveLength(1);
    expect(getDemoPatientRows(scope)[0]).toMatchObject({ id: row.id, full_name: "Corrigido", created_at: row.created_at });
    expect(getDemoPatientRows(scope)[0].sourceKey).toBe(`demo:${row.id}`);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("removes only the selected local registration in the current demo scope", () => {
    const solo = demoPatientScope("deleting", "pro");
    const clinic = demoPatientScope("deleting", "pro", "clinic");
    const row = saveDemoPatient(solo, { full_name: "Local" });
    const other = saveDemoPatient(clinic, { full_name: "Local" });
    removeDemoPatient(solo, row.id);
    expect(getDemoPatientRows(solo)).toHaveLength(0);
    expect(getDemoPatientRows(clinic)[0].id).toBe(other.id);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([null, "clinic-real"])("preserves real patient creation in scope %s without inserting an assessment", async (clinicId) => {
    const added = vi.fn();
    render(<AddPatientModal open onOpenChange={vi.fn()} professionalId="pro-real" clinicId={clinicId} onAdded={added} />);
    fireEvent.change(screen.getByPlaceholderText("Nome do paciente"), { target: { value: "Cadastro real" } });
    fireEvent.click(screen.getByRole("button", { name: /^Adicionar$/ }));
    await waitFor(() => expect(added).toHaveBeenCalledTimes(1));
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("patients");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining(clinicId ? { clinic_id: "clinic-real", email: null } : { professional_id: "pro-real", email: null }));
    expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty(clinicId ? "professional_id" : "clinic_id");
  });
  it("keeps real save failures visible and never reports completion", async () => {
    mocks.insert.mockResolvedValue({ error: new Error("save rejected") });
    const added = vi.fn();
    render(<AddPatientModal open onOpenChange={vi.fn()} professionalId="pro-real" onAdded={added} />);
    fireEvent.change(screen.getByPlaceholderText("Nome do paciente"), { target: { value: "Cadastro" } });
    fireEvent.click(screen.getByRole("button", { name: /^Adicionar$/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", description: "save rejected" })));
    expect(added).not.toHaveBeenCalled();
  });
});