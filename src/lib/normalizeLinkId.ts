/**
 * Repairs IDs from shared assessment links that were retyped or mangled
 * (letter O instead of zero, l/I instead of one, spaces, uppercase).
 * IDs only contain 0-9 and a-f, so these swaps never change a valid ID.
 */
export const normalizeLinkId = (raw: string | undefined): string | undefined => {
  if (!raw) return raw;
  const cleaned = decodeURIComponent(raw)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[oO]/g, "0")
    .replace(/[lIi]/g, "1")
    .toLowerCase();
  return cleaned;
};
