// Lightweight email validator + typo suggester.
// No external deps to keep auth bundle small and avoid runtime risk.

const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "live.com.br",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "me.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "globo.com",
  "ig.com.br",
  "protonmail.com",
  "proton.me",
];

// RFC-lite check: enough to reject obvious typos without false negatives.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// Damerau-Levenshtein distance (small, optimized for short strings)
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[al][bl];
}

/**
 * Suggest a corrected email when the domain looks like a typo of a common one.
 * Returns null if no suggestion is needed.
 */
export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (COMMON_DOMAINS.includes(domain)) return null;

  let best: { d: string; dist: number } | null = null;
  for (const candidate of COMMON_DOMAINS) {
    const dist = distance(domain, candidate);
    if (dist === 0) return null;
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { d: candidate, dist };
    }
  }
  if (!best) return null;
  // Only suggest when domains are similar enough in length to avoid noise
  if (Math.abs(best.d.length - domain.length) > 3) return null;
  return `${local}@${best.d}`;
}
