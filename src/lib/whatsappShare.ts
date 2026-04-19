/**
 * WhatsApp share helper that survives mobile popup blockers.
 *
 * Mobile browsers (iOS Safari, Android Chrome) block window.open() calls
 * that happen *after* an `await` because they're no longer in a "user gesture"
 * context. To avoid this, we open a placeholder tab synchronously inside the
 * click handler and only update its location once the async work (PDF
 * upload) finishes. If the popup was blocked anyway, we fall back to a
 * same-tab navigation, which always works.
 *
 * Usage:
 *   const wa = openWhatsAppDeferred();
 *   const url = await uploadPdfAndBuildUrl();
 *   wa.send(buildText(url));
 */

export interface DeferredWhatsApp {
  /** Send the final text. Must be called once async work is done (or aborted). */
  send: (text: string) => void;
  /** Cancel the reserved tab without navigating (e.g. on hard error). */
  abort: () => void;
}

const buildUrl = (text: string) =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;

export function openWhatsAppDeferred(): DeferredWhatsApp {
  // Reserve a tab synchronously so the browser treats it as a user-initiated
  // navigation. about:blank is allowed during a gesture even on mobile.
  let placeholder: Window | null = null;
  try {
    placeholder = window.open("about:blank", "_blank");
  } catch {
    placeholder = null;
  }

  return {
    send(text: string) {
      const url = buildUrl(text);
      if (placeholder && !placeholder.closed) {
        try {
          placeholder.location.href = url;
          return;
        } catch {
          // cross-origin or other issue → fall through to same-tab nav
        }
      }
      // Popup was blocked (common on mobile): navigate the current tab.
      // This always works because it's still a top-level navigation.
      window.location.href = url;
    },
    abort() {
      if (placeholder && !placeholder.closed) {
        try { placeholder.close(); } catch { /* noop */ }
      }
    },
  };
}
