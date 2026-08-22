import React, { createContext, useContext, useState, useCallback } from "react";
import i18n, { changeLanguageSafely } from "@/i18n";

type Language = "pt" | "en" | "es";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("pt");
  const [bundleTick, setBundleTick] = useState(0);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "pt" ? "en" : prev === "en" ? "es" : "pt";
      // en/es bundles are lazy-loaded; re-render once they are registered.
      void changeLanguageSafely(next).then(() => setBundleTick((v) => v + 1));
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string) => i18n.t(key),
    [language, bundleTick]
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
