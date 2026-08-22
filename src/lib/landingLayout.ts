/**
 * Landing layout switch.
 *
 * "cinematic" → novo layout com scroll cinematográfico (padrão atual).
 * "classic"   → layout original preservado em `src/pages/legacy/*Classic.tsx`.
 *
 * Para restaurar o padrão antigo em todas as landings, basta trocar o valor
 * abaixo para "classic" (comando: "restaurar landing pages ao layout original").
 */
export type LandingLayout = "cinematic" | "classic";

export const LANDING_LAYOUT: LandingLayout = "cinematic";
