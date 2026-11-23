type AssessmentNotificationRow = {
  id?: string;
  status?: string;
  anamnesis_data?: Record<string, unknown> | null;
};

/** Missing old payloads never prove completion; use the scoped baseline instead. */
export function isNewAssessmentCompletion(
  row: AssessmentNotificationRow,
  previousStatus: string | undefined,
): boolean {
  const ad = row.anamnesis_data;
  return Boolean(row.id && row.status === "completed" && previousStatus &&
    previousStatus !== "completed" &&
    !(ad?.externalPatient || ad?.quickEvolutionOnly || ad?.placeholder));
}