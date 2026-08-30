import professional from "./professional";
import patient from "./patient";
import academic from "./academic";
import clinic from "./clinic";
import { applyTerminology } from "../terminology";
import { ALIVIA_PATIENT_HOOKS, ALIVIA_PRO_HOOKS } from "../hookLibrary";
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
export const WORLDS: Record<WorldId, WorldContent> = {
  pro: { ...applyTerminology(professional), hooks: ALIVIA_PRO_HOOKS },
  paciente: { ...applyTerminology(patient, { patientVoice: true }), hooks: ALIVIA_PATIENT_HOOKS },
  academico: { ...applyTerminology(academic), hooks: ALIVIA_PRO_HOOKS },
  clinica: { ...applyTerminology(clinic), hooks: ALIVIA_PRO_HOOKS },
};

export const WORLD_IDS: WorldId[] = ["pro", "paciente", "academico", "clinica"];

export const isWorldId = (value: string | null): value is WorldId =>
  !!value && (WORLD_IDS as string[]).includes(value);

export type { WorldContent, WorldId };
