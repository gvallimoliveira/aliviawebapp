// Pure retention rule for never-paid clinic trials (shared by the daily job and tests).
export const TRIAL_DAYS = 15;
export const GRACE_DAYS = 7;
const DAY = 86_400_000;

export type TrialRetentionStage = "reminder_day14" | "ended" | "purge" | null;

/** Day index 13 = 14th trial day, 15 = trial just ended, >= 22 = data must be deleted. */
export function trialRetentionStage(trialStartMs: number, nowMs: number): TrialRetentionStage {
  const day = Math.floor((nowMs - trialStartMs) / DAY);
  if (day >= TRIAL_DAYS + GRACE_DAYS) return "purge";
  if (day === TRIAL_DAYS) return "ended";
  if (day === TRIAL_DAYS - 2) return "reminder_day14";
  return null;
}

export function trialPurgeDate(trialStartMs: number): Date {
  return new Date(trialStartMs + (TRIAL_DAYS + GRACE_DAYS) * DAY);
}
