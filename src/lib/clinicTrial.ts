export const CLINIC_TRIAL_DAYS = 15;
export const CLINIC_TRIAL_MS = CLINIC_TRIAL_DAYS * 24 * 60 * 60 * 1000;

export function clinicTrialTiming(startedAt: string, now = Date.now()) {
  const expiresAt = new Date(startedAt).getTime() + CLINIC_TRIAL_MS;
  const daysLeft = Math.max(0, Math.min(CLINIC_TRIAL_DAYS, Math.ceil((expiresAt - now) / 86400000)));
  return { expiresAt, daysLeft, daysUsed: CLINIC_TRIAL_DAYS - daysLeft };
}