import { useEffect } from "react";

const MANIFEST_HREF = "/studio-manifest.webmanifest";
const APPLE_ICON = "/icons/studio-icon-180.png";
const FAVICON = "/icons/studio-icon-192.png";
const THEME = "#1D6B5C";

const upsert = (selector: string, tag: "link" | "meta", attrs: Record<string, string>) => {
  let el = document.head.querySelector(selector) as HTMLLinkElement | HTMLMetaElement | null;
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

/**
 * Aplica identidade PWA própria do Aliv.iA Studio (ícone/manifest/tema) nas
 * páginas /studio-pro*, para que o atalho da tela de início use a arte Studio.
 */
export function useStudioPwaMeta() {
  useEffect(() => {
    upsert('link[rel="manifest"]', "link", { rel: "manifest", href: MANIFEST_HREF });
    upsert('link[rel="apple-touch-icon"]', "link", { rel: "apple-touch-icon", href: APPLE_ICON });
    upsert('link[rel="icon"]', "link", { rel: "icon", type: "image/png", href: FAVICON });
    upsert('meta[name="theme-color"]', "meta", { name: "theme-color", content: THEME });
    upsert('meta[name="apple-mobile-web-app-title"]', "meta", {
      name: "apple-mobile-web-app-title",
      content: "Studio",
    });
    upsert('meta[name="apple-mobile-web-app-capable"]', "meta", {
      name: "apple-mobile-web-app-capable",
      content: "yes",
    });
    document.title = "Aliv.iA Studio";
  }, []);
}
