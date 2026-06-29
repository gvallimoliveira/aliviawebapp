// CNPJ validation (mod 11). Returns the digits-only string if valid, null otherwise.
export function normalizeAndValidateCnpj(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  if (/^(\d)\1{13}$/.test(digits)) return null;
  const calc = (slice: string, weights: number[]): number => {
    const sum = slice.split("").reduce((s, n, i) => s + parseInt(n, 10) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(digits.slice(0, 12), w1);
  const d2 = calc(digits.slice(0, 12) + d1, w2);
  if (d1 !== parseInt(digits[12], 10) || d2 !== parseInt(digits[13], 10)) return null;
  return digits;
}
