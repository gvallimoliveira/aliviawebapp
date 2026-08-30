import professional from "./professional";
import patient from "./patient";
import academic from "./academic";
import clinic from "./clinic";
import { applyTerminology } from "../terminology";
import type { WorldContent, WorldId } from "./types";

/**
 * TERMINOLOGIA DA MARCA aplicada na entrada do acervo (ver `terminology.ts`):
 * - mundo `paciente` fala de AUTOavaliação (quem responde é a própria pessoa);
 * - nenhum mundo afirma ter "protocolo" — vira método estruturado /
 *   direcionamento / raciocínio clínico, conforme o contexto da frase.
 */
export const WORLDS: Record<WorldId, WorldContent> = {
  pro: applyTerminology(professional),
  paciente: applyTerminology(patient, { patientVoice: true }),
  academico: applyTerminology(academic),
  clinica: applyTerminology(clinic),
};

export const WORLD_IDS: WorldId[] = ["pro", "paciente", "academico", "clinica"];

export const isWorldId = (value: string | null): value is WorldId =>
  !!value && (WORLD_IDS as string[]).includes(value);

export type { WorldContent, WorldId };
