/** Only the latest request may commit results; invalidate on context changes/unmount. */
export function createLatestRequestGate() {
  let version = 0;
  return {
    start() {
      const request = ++version;
      return () => request === version;
    },
    invalidate() { version++; },
  };
}