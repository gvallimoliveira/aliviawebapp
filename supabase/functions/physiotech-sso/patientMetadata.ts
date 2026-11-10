// Patient contact is optional. Synthetic/no-email record keys are not contacts
// and must not invalidate the receiving application's SSO payload.
const EMAIL = /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;

export function optionalPatientEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return EMAIL.test(email) ? email : null;
}