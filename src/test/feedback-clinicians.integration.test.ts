import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

// Use an isolated temporary clinic fixture; never add responses to a live clinic.
const fixture = process.env.FEEDBACK_TEST_CLINIC_ID;
describe.skipIf(!fixture)("seleção clínica validada no servidor", () => {
  const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resolve = (n: number, clinic = fixture) => client.rpc("get_feedback_clinician_name", {
    _clinic_id: clinic, _member_id: `fbbb2026-1127-4000-8000-${String(n).padStart(12, "0")}`,
  });
  for (const [n, role] of [[11,"therapist"],[12,"osteopath"],[13,"pilates_instructor"],[14,"doctor"],[15,"rpg_specialist"],[16,"massage_therapist"],[17,"intern"]] as const) {
    it(`permite ${role} ativo sem perfil PRO pessoal`, async () => {
      const result = await resolve(n);
      expect(result.error).toBeNull();
      expect(result.data).toBe("Profissional");
    });
  }
  for (const [n, role] of [[10,"owner administrativo"],[18,"secretary"],[19,"admin"]] as const) {
    it(`exclui ${role}`, async () => {
      const result = await resolve(n);
      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  }
  it("não aceita integrante de outra clínica", async () => {
    const result = await resolve(11, "fbbb2026-1127-4000-8000-000000000099");
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
  it("não expõe a lista da equipe para visitantes anônimos", async () => {
    const result = await client.rpc("get_feedback_clinicians", { _clinic_id: fixture });
    expect(result.error?.code).toBe("42501");
  });
});