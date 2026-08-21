const PREVIEW_HOST_MARKERS = [
  "id-preview--",
  "localhost",
  "127.0.0.1",
  ".lovableproject.com",
  ".lovable.app",
];

const STORAGE_KEY = "alivia_link_origin_mode";

const isPreviewOrigin = (origin: string) =>
  PREVIEW_HOST_MARKERS.some((marker) => origin.includes(marker));

/**
 * Preview link mode:
 * - "production" (default): links always point to https://aliviawebapp.com.br
 * - "preview": links keep the current origin, so links generated inside the
 *   Lovable preview can be opened/tested without publishing.
 *
 * Enable with ?linkOrigin=preview (or disable with ?linkOrigin=production),
 * or programmatically via setLinkOriginMode().
 */
export type LinkOriginMode = "production" | "preview";

const readMode = (): LinkOriginMode => {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("linkOrigin");
    if (fromQuery === "preview" || fromQuery === "production") {
      localStorage.setItem(STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "preview" || stored === "production") return stored;
  } catch {
    /* storage unavailable */
  }
  return "production";
};

export const getLinkOriginMode = (): LinkOriginMode => readMode();

export const setLinkOriginMode = (mode: LinkOriginMode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
};

export const getPublicOrigin = () => {
  const origin = window.location.origin;
  if (!isPreviewOrigin(origin)) return origin;
  // Inside preview/localhost: allow opting into self-referencing links for testing.
  if (readMode() === "preview") return origin;
  return "https://aliviawebapp.com.br";
};
