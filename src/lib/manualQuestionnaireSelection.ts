/** A catalog is not a recommendation: painless assessments require an explicit
 * professional choice. Preserve existing answers; never fabricate/modify items. */
export function manualQuestionnaireSelection<T extends { id: string }>(catalog: T[], requestedId: string | null, appliedIds: string[]): T[] {
  if (!requestedId) return [];
  return catalog.filter(q => q.id === requestedId && !appliedIds.includes(q.id));
}