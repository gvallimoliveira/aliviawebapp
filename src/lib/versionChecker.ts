/**
 * Deprecated: previously polled /version.json and force-reloaded the app
 * after clearing caches/SW. That was breaking desktop authentication
 * (NetworkError mid-login). Kept as a no-op so existing imports do not
 * break, but the aggressive update behavior was removed.
 */
export function startVersionChecker() {
  /* intentionally empty */
}
