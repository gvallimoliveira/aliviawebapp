/**
 * Temporary CREFITO handling.
 *
 * When an admin adds a partner from the admin panel and the person has no
 * professional record yet, the backend auto-creates one with a PLACEHOLDER
 * CREFITO (pattern `NNNNNN-X`) just to satisfy the DB validation trigger.
 *
 * That placeholder must NEVER be treated as a real registration: it used to
 * make the system classify academic partners as licensed professionals
 * (locking the Academic card, printing a fake CREFITO on PDFs, etc).
 */
const PLACEHOLDER_CREFITO = /^\d{1,6}-X$/i;

export function isPlaceholderCrefito(crefito?: string | null): boolean {
  const v = (crefito ?? "").trim();
  return v.length > 0 && PLACEHOLDER_CREFITO.test(v);
}

/** True only when a REAL (non-placeholder) CREFITO is on file. */
export function hasRealCrefito(crefito?: string | null): boolean {
  const v = (crefito ?? "").trim();
  return v.length > 0 && !isPlaceholderCrefito(v);
}

/** Returns the CREFITO for display, or undefined when it's a placeholder. */
export function displayCrefito(crefito?: string | null): string | undefined {
  return hasRealCrefito(crefito) ? String(crefito).trim() : undefined;
}
