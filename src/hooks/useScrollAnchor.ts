/**
 * Scroll anchoring helper.
 *
 * Some flows (dynamometry import, saving the strength table) trigger a parent
 * reload that briefly unmounts/collapses large parts of the page. When the
 * document shrinks, the browser clamps `window.scrollY`, so the user is thrown
 * back to the top even though nothing navigated.
 *
 * `anchorScroll` captures where the target element sits relative to the
 * viewport, then keeps restoring that offset for a while (across the collapse
 * and the re-render) instead of relying on a couple of animation frames.
 * The loop aborts as soon as the user scrolls on purpose.
 */
export function anchorScroll(
  getEl: () => HTMLElement | null,
  durationMs = 2500,
): () => void {
  const el = getEl();
  if (!el) return () => {};
  const desiredViewportTop = el.getBoundingClientRect().top;

  return () => {
    const start = performance.now();
    let cancelled = false;
    let programmatic = false;

    const cancel = () => {
      if (programmatic) return; // ignore our own scroll events
      cancelled = true;
      cleanup();
    };
    const opts = { passive: true } as AddEventListenerOptions;
    const cleanup = () => {
      window.removeEventListener("wheel", cancel, opts);
      window.removeEventListener("touchmove", cancel, opts);
      window.removeEventListener("keydown", cancel);
    };
    window.addEventListener("wheel", cancel, opts);
    window.addEventListener("touchmove", cancel, opts);
    window.addEventListener("keydown", cancel);

    const step = () => {
      if (cancelled) return;
      const node = getEl();
      if (node) {
        const delta = node.getBoundingClientRect().top - desiredViewportTop;
        if (Math.abs(delta) > 1) {
          programmatic = true;
          window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "auto" });
          // Release the guard on the next task so real user scrolls still cancel.
          window.setTimeout(() => {
            programmatic = false;
          }, 0);
        }
      }
      if (performance.now() - start < durationMs) {
        window.requestAnimationFrame(step);
      } else {
        cleanup();
      }
    };
    window.requestAnimationFrame(step);
  };
}

/** Convenience: anchor on a stable DOM id, surviving remounts of the node. */
export const anchorScrollById = (id: string, durationMs?: number) =>
  anchorScroll(() => document.getElementById(id), durationMs);
