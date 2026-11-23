import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionNotesSection from "@/components/dashboard/SessionNotesSection";

const mocks = vi.hoisted(() => ({ from: vi.fn(), templateEq: vi.fn(), user: { id: "actor-user" } as { id: string } | null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key, language: "pt" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DictationBar", () => ({ default: () => null }));
beforeEach(() => {
  mocks.user = { id: "actor-user" };
  mocks.templateEq.mockReset();
  mocks.from.mockReset().mockImplementation((table: string) => {
    const chain: Record<string, any> = {};
    for (const method of ["select", "order", "is", "eq"]) chain[method] = (...args: unknown[]) => {
      if (table === "session_note_templates" && method === "eq") mocks.templateEq(...args);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  });
});
afterEach(cleanup);
describe("session note templates use their existing owner_user_id column", () => {
  it.each([null, "clinic-a"])("reads the current user's templates in scope %s, not by professional_id", async (clinicId) => {
    render(<SessionNotesSection professionalId="different-professional" patientEmail="patient-key" clinicId={clinicId} />);
    await waitFor(() => expect(mocks.templateEq).toHaveBeenCalledWith("owner_user_id", "actor-user"));
    expect(mocks.templateEq).not.toHaveBeenCalledWith("professional_id", expect.anything());
  });
  it("never attempts a template read without an authenticated owner", async () => {
    mocks.user = null;
    render(<SessionNotesSection professionalId="professional" patientEmail="patient-key" />);
    await waitFor(() => expect(mocks.from).toHaveBeenCalledWith("session_notes"));
    expect(mocks.from).not.toHaveBeenCalledWith("session_note_templates");
  });
});