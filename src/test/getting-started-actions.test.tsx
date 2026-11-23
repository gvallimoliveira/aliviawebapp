import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GettingStarted from "@/components/onboarding/GettingStarted";
import { gettingStartedKey, readGettingStartedPreferences, type GettingStartedFacts } from "@/lib/gettingStarted";
import pt from "@/locales/pt.json";

const { navigate, fetchFacts, fetchPatients } = vi.hoisted(() => ({ navigate: vi.fn(), fetchFacts: vi.fn(), fetchPatients: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => (pt as Record<string, string>)[key] ?? key }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/gettingStartedData", () => ({ fetchGettingStartedFacts: fetchFacts, fetchGettingStartedPatients: fetchPatients }));

const empty: GettingStartedFacts = { patients: 0, assessments: 0, notes: 0, heps: 0, loads: 0, conversations: 0, appointments: 0 };
const scope = { userId: "signed-in-user", professionalId: "solo-pro" };
const clients: QueryClient[] = [];

function show(clinicId: string | null, clinical = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><GettingStarted {...scope} clinicId={clinicId} clinical={clinical} canSchedule hasAgent /></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  fetchFacts.mockResolvedValue({ ...empty, patients: 1 });
  fetchPatients.mockResolvedValue([{ id: "patient-1", full_name: "Ana sem e-mail", email: null }]);
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.resetAllMocks(); });

describe("first steps visit/manual choice", () => {
  for (const clinicId of [null, "selected-clinic"]) {
    for (const [label, action] of [["Registrar atendimento", "record"], ["Avaliação manual", "manual-assessment"]]) {
      it(`opens the ${action} patient destination in ${clinicId ? "clinic" : "solo"} without completing the milestone`, async () => {
        show(clinicId);
        fireEvent.click(await screen.findByRole("button", { name: label }));
        fireEvent.click(await screen.findByRole("button", { name: "Ana sem e-mail" }));
        await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
        const destination = new URL(navigate.mock.calls[0][0], "https://example.test");
        expect(destination.searchParams.get("gettingStarted")).toBe(action);
        expect(destination.searchParams.get("tab")).toBe(clinicId ? "patients" : "professional");
        expect(destination.searchParams.get("patient")).toBe("Ana sem e-mail");
        expect(fetchPatients).toHaveBeenCalledWith({ ...scope, clinicId }, "");
        expect(readGettingStartedPreferences(gettingStartedKey({ ...scope, clinicId }))).toEqual({ copiedLink: false, dismissed: false, review: false });
      });
    }
  }

  it("requires patient registration from an empty selector rather than opening a patientless assessment", async () => {
    fetchFacts.mockResolvedValue(empty);
    fetchPatients.mockResolvedValue([]);
    show("selected-clinic");
    fireEvent.click(await screen.findByRole("button", { name: "Avaliação manual" }));
    await waitFor(() => expect(fetchPatients).toHaveBeenCalled());
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Cadastrar$/ }));
    const destination = new URL(navigate.mock.calls[0][0], "https://example.test");
    expect(destination.searchParams.get("gettingStarted")).toBe("patient");
    expect(destination.searchParams.has("patient")).toBe(false);
  });

  it("never offers clinical shortcuts to the reception checklist", async () => {
    show("selected-clinic", false);
    await waitFor(() => expect(fetchFacts).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Registrar atendimento" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Avaliação manual" })).toBeNull();
  });
});