export interface ClinicalImpression {
  overview: string;
  therapeuticObjectives: string[];
}

/** Save the edited overview while retaining generated objectives. */
export function savedClinicalImpression(overview: string, generated?: ClinicalImpression | null): ClinicalImpression | undefined {
  if (!overview.trim()) return undefined;
  return { ...generated, overview, therapeuticObjectives: generated?.therapeuticObjectives ?? [] };
}