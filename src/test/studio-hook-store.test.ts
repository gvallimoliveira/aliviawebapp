import { describe, expect, it, beforeEach } from "vitest";
import {
  ALIVIA_PATIENT_HOOKS,
  ALIVIA_PRO_HOOKS,
  STUDIO_SELF_HOOKS,
  VALLIM_HOOKS,
} from "@/pages/studio/hookLibrary";
import {
  applyHookPrefs,
  clearHookPrefs,
  hookKey,
  readHookPrefs,
  saveHookPrefs,
} from "@/pages/studio/hookStore";

describe("acervo curado ampliado", () => {
  it("cada marca tem pelo menos 25 ganchos", () => {
    for (const list of [STUDIO_SELF_HOOKS, ALIVIA_PRO_HOOKS, ALIVIA_PATIENT_HOOKS, VALLIM_HOOKS]) {
      expect(list.length).toBeGreaterThanOrEqual(25);
      const keys = new Set(list.map(hookKey));
      expect(keys.size).toBe(list.length);
      for (const hook of list) expect(hook.strong.length).toBeGreaterThan(12);
    }
  });

  it("voz de paciente não afirma protocolo", () => {
    const text = ALIVIA_PATIENT_HOOKS.map((h) => `${h.strong} ${h.rest} ${h.sub ?? ""}`).join(" ");
    expect(text.toLowerCase()).not.toContain("protocolo");
  });
});

describe("curadoria por marca", () => {
  beforeEach(() => clearHookPrefs("Marca Teste"));

  it("sem preferência, devolve o acervo intacto", () => {
    expect(applyHookPrefs("Marca Teste", VALLIM_HOOKS)).toBe(VALLIM_HOOKS);
  });

  it("desativa e reordena conforme salvo", () => {
    const [a, b, c] = VALLIM_HOOKS;
    saveHookPrefs("Marca Teste", { off: [hookKey(b)], order: [hookKey(c), hookKey(a)] });
    const out = applyHookPrefs("Marca Teste", [a, b, c]);
    expect(out).toEqual([c, a]);
    expect(readHookPrefs("Marca Teste").off).toEqual([hookKey(b)]);
  });

  it("voz de paciente tem curadoria independente", () => {
    saveHookPrefs("Marca Teste", { off: [hookKey(ALIVIA_PRO_HOOKS[0])], order: [] });
    expect(readHookPrefs("Marca Teste", { patientVoice: true }).off).toEqual([]);
  });
});
