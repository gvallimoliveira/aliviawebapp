import { describe, expect, it, beforeEach } from "vitest";
import {
  ALIVIA_PATIENT_HOOKS,
  ALIVIA_PRO_HOOKS,
  STUDIO_SELF_HOOKS,
  VALLIM_HOOKS,
} from "@/pages/studio/hookLibrary";
import { tightenHook } from "@/pages/studio/hooks";
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
    expect(applyHookPrefs("Marca Teste", VALLIM_HOOKS)).toEqual(VALLIM_HOOKS.map(tightenHook));
  });

  it("desativa e reordena conforme salvo", () => {
    const [a, b, c] = VALLIM_HOOKS;
    saveHookPrefs("Marca Teste", { off: [hookKey(b)], order: [hookKey(c), hookKey(a)] });
    const out = applyHookPrefs("Marca Teste", [a, b, c]);
    expect(out).toEqual([c, a].map(tightenHook));
    expect(readHookPrefs("Marca Teste").off).toEqual([hookKey(b)]);
  });

  it("gancho longo é encurtado e o excedente desce para o apoio", () => {
    const long = {
      hook: "Teste",
      strong:
        "O jeito mais fácil de subir o nível: um método estruturado do início ao fim, com tudo",
      rest: ".",
    };
    const tight = tightenHook(long);
    expect(`${tight.strong}${tight.rest}`.length).toBeLessThanOrEqual(66);
    expect(tight.sub).toBeTruthy();
  });

  it("voz de paciente tem curadoria independente", () => {
    saveHookPrefs("Marca Teste", { off: [hookKey(ALIVIA_PRO_HOOKS[0])], order: [] });
    expect(readHookPrefs("Marca Teste", { patientVoice: true }).off).toEqual([]);
  });
});
