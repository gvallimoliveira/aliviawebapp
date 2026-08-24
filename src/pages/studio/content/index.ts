import professional from "./professional";
import patient from "./patient";
import academic from "./academic";
import clinic from "./clinic";
import type { WorldContent, WorldId } from "./types";

export const WORLDS: Record<WorldId, WorldContent> = {
  pro: professional,
  paciente: patient,
  academico: academic,
  clinica: clinic,
};

export const WORLD_IDS: WorldId[] = ["pro", "paciente", "academico", "clinica"];

export const isWorldId = (value: string | null): value is WorldId =>
  !!value && (WORLD_IDS as string[]).includes(value);

export type { WorldContent, WorldId };
