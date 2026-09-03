import professional from "./professional";
import patient from "./patient";
import academic from "./academic";
import clinic from "./clinic";
import { applyTerminology } from "../terminology";
import { ALIVIA_PATIENT_HOOKS, ALIVIA_PRO_HOOKS } from "../hookLibrary";
import { marketStatsFor } from "../marketFacts";
import { applyHookPrefs } from "../hookStore";
import { BRAND_NAME } from "../brand";
import type { WorldContent, WorldId } from "./types";

/**
 * TERMINOLOGIA DA MARCA aplicada na entrada do acervo (ver `terminology.ts`):
 * - mundo `paciente` fala de AUTOavaliação (quem responde é a própria pessoa);
 * - nenhum mundo afirma ter "protocolo" — vira método estruturado /
 *   direcionamento / raciocínio clínico, conforme o contexto da frase.
 */
/**
 * BIBLIOTECA DE GANCHOS da marca Aliv.iA: mundos profissionais usam a variante
 * clínica; o mundo do paciente usa a variante de autoavaliação (ver
 * `hookLibrary.ts`).
 */
/**
 * Getters (e não valores fixos): a curadoria de ganchos feita pelo dono
 * (`hookStore.ts` — ordem e ativação por marca) é lida a cada acesso, então
 * editar a biblioteca já reflete na próxima geração, sem recarregar o app.
 */
/**
 * PERCENTUAIS REAIS DE MERCADO (`marketFacts.ts`): entram no acervo de números
 * de cada mundo, com fonte e ano na própria nota. É o que permite ao bloco de
 * dado percentual falar de mercado sem inventar estatística — o mundo do
 * paciente recebe o recorte de quem sente dor; os demais, o de quem atende.
 */
const withMarketFacts = (content: WorldContent, patientVoice = false): WorldContent => ({
  ...content,
  stats: [...content.stats, ...marketStatsFor(BRAND_NAME, { patientVoice })],
});

export const WORLDS: Record<WorldId, WorldContent> = {
  get pro() {
    return { ...withMarketFacts(applyTerminology(professional)), hooks: applyHookPrefs(BRAND_NAME, ALIVIA_PRO_HOOKS) };
  },
  get paciente() {
    return {
      ...withMarketFacts(applyTerminology(patient, { patientVoice: true }), true),
      hooks: applyHookPrefs(BRAND_NAME, ALIVIA_PATIENT_HOOKS, { patientVoice: true }),
    };
  },
  get academico() {
    return { ...withMarketFacts(applyTerminology(academic)), hooks: applyHookPrefs(BRAND_NAME, ALIVIA_PRO_HOOKS) };
  },
  get clinica() {
    return { ...withMarketFacts(applyTerminology(clinic)), hooks: applyHookPrefs(BRAND_NAME, ALIVIA_PRO_HOOKS) };
  },
};


export const WORLD_IDS: WorldId[] = ["pro", "paciente", "academico", "clinica"];

export const isWorldId = (value: string | null): value is WorldId =>
  !!value && (WORLD_IDS as string[]).includes(value);

export type { WorldContent, WorldId };
