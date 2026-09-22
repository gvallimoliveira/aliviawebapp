import { describe, expect, it } from "vitest";
import { composeHooks, HOOK_FRAMES } from "@/pages/studio/hooks";
import {
  ALIVIA_PATIENT_HOOKS,
  ALIVIA_PRO_HOOKS,
  ALINE_VET_HOOKS,
  STUDIO_SELF_HOOKS,
  VALLIM_HOOKS,
  curatedHooksFor,
} from "@/pages/studio/hookLibrary";
import { STUDIO_MODELS, kindsForModels } from "@/pages/studio/models";

describe("biblioteca de ganchos", () => {
  it("entrega o acervo curado da marca correspondente", () => {
    expect(curatedHooksFor("Aliv.iA Studio")).toBe(STUDIO_SELF_HOOKS);
    expect(curatedHooksFor("Aliv.iA")).toBe(ALIVIA_PRO_HOOKS);
    expect(curatedHooksFor("Aliv.iA", { patientVoice: true })).toBe(ALIVIA_PATIENT_HOOKS);
    expect(curatedHooksFor("Guilherme Vallim Fisioterapia")).toBe(VALLIM_HOOKS);
    expect(curatedHooksFor("Aline Furtado Vet")).toBe(ALINE_VET_HOOKS);
    expect(ALINE_VET_HOOKS).toHaveLength(10);
    expect(JSON.stringify(ALINE_VET_HOOKS)).toMatch(/cachorro|pet|animal/);
    expect(JSON.stringify(ALINE_VET_HOOKS)).not.toMatch(/você (se coça|lambe|tem otite)/i);
  });

  it("não vaza gancho de marca do dono para marca de cliente", () => {
    expect(curatedHooksFor("PerformaPro")).toEqual([]);
    expect(curatedHooksFor("Salão Bela Vista")).toEqual([]);
  });

  it("mecanismo escreve ganchos com os ingredientes da marca", () => {
    const hooks = composeHooks({
      brand: "PerformaPro",
      niche: "consultoria de vendas",
      audience: "pequenas empresas",
      pain: "perder proposta por falta de follow-up",
      desire: "previsibilidade de faturamento",
      offer: "um processo comercial escrito e revisado toda semana",
      belief: "venda é rotina, não talento",
      cta: "Falar com a equipe",
    });
    expect(hooks.length).toBeGreaterThanOrEqual(8);
    expect(hooks.length).toBeLessThanOrEqual(HOOK_FRAMES.length);
    hooks.forEach((h) => {
      expect(h.strong.length).toBeGreaterThanOrEqual(12);
      expect(`${h.strong} ${h.rest}`).not.toMatch(/aliv|vallim/i);
    });
  });

  it("kit sem insumo não produz gancho vazio", () => {
    expect(composeHooks({ brand: "Marca Nova" })).toEqual([]);
  });

  it("modelo 'Ganchos' está disponível globalmente", () => {
    const model = STUDIO_MODELS.find((m) => m.id === "ganchos");
    expect(model).toBeTruthy();
    expect(model?.needsPhoto).toBeFalsy();
    expect(model?.needsBrand).toBeFalsy();
    expect(kindsForModels(["ganchos"])).toEqual(["hook"]);
  });
});
