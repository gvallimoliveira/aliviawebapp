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

export type NativeShareResult = "shared" | "cancelled" | "unsupported";

interface NativePdfShareOptions {
  blob: Blob;
  fileName: string;
  text: string;
  title?: string;
}

const buildUrl = (text: string) =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export async function sharePdfFile({ blob, fileName, text, title }: NativePdfShareOptions): Promise<NativeShareResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }

  const file = new File([blob], fileName, { type: "application/pdf" });
  const fullData: ShareData = title ? { files: [file], text, title } : { files: [file], text };
  const filesOnlyData: ShareData = { files: [file] };

  const attempts: ShareData[] = [fullData];
  if (text || title) attempts.push(filesOnlyData);

  for (let i = 0; i < attempts.length; i++) {
    try {
      // Race against a timeout to prevent the share sheet from hanging indefinitely
      // on devices where dismissing the sheet doesn't resolve the promise.
      const sharePromise = navigator.share(attempts[i]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new DOMException("Share timeout", "TimeoutError")), 120_000)
      );
      await Promise.race([sharePromise, timeoutPromise]);
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
      // Treat timeout as cancelled (user likely dismissed)
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return "cancelled";
      }
      // If this wasn't the last attempt, try the simpler payload.
      if (i < attempts.length - 1) {
        console.warn("Native PDF share attempt failed, retrying with files-only payload.", error);
        continue;
      }
      console.warn("Native PDF share failed, falling back to link.", error);
      return "unsupported";
    }
  }

  return "unsupported";
}

export async function shareTextOrOpenWhatsApp(text: string, title?: string): Promise<void> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(title ? { title, text } : { text });
      return;
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.warn("Native text share failed, falling back to WhatsApp URL.", error);
    }
  }

  try {
    const popup = window.open(buildUrl(text), "_blank");
    if (popup) {
      return;
    }
  } catch {
    // ignore and fall back to same-tab navigation
  }

  window.location.href = buildUrl(text);
}

/** True on phones/tablets where the OS share sheet is the expected UX. */
export function prefersNativeShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Share ready-made text from inside a click handler, with NO await before
 * this call: iOS only opens the share sheet while the tap gesture is still
 * active. Touch devices get the native sheet (WhatsApp, Mensagens…); desktop
 * opens WhatsApp Web with the text prefilled.
 */
export function shareTextNowOrOpenWhatsApp(text: string, title?: string): void {
  if (prefersNativeShare()) {
    navigator.share(title ? { title, text } : { text }).catch((error) => {
      if (isAbortError(error)) return;
      console.warn("Native text share failed, falling back to WhatsApp URL.", error);
      window.location.href = buildUrl(text);
    });
    return;
  }
  try {
    if (window.open(buildUrl(text), "_blank")) return;
  } catch {
    // fall through
  }
  window.location.href = buildUrl(text);
}

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
