import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";

/**
 * Only the default language (pt) ships in the initial bundle.
 * en/es are ~270KB of JSON and are fetched on demand when the
 * user actually switches language, keeping first paint fast.
 */
i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
  },
  lng: "pt",
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false,
  },
});

const loaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("./locales/en.json"),
  es: () => import("./locales/es.json"),
};

const loaded = new Set(["pt"]);

export const ensureLanguage = async (lng: string) => {
  if (loaded.has(lng)) return;
  const loader = loaders[lng];
  if (!loader) return;
  const mod = await loader();
  i18n.addResourceBundle(lng, "translation", mod.default, true, true);
  loaded.add(lng);
};

export const changeLanguageSafely = async (lng: string) => {
  await ensureLanguage(lng);
  await i18n.changeLanguage(lng);
};

export default i18n;
