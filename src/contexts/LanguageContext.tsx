import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import i18n, { changeLanguageSafely } from "@/i18n";

export type Language = "pt" | "en" | "es";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  selectLanguage: (language: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentLanguage = (): Language => i18n.language === "en" ? "en" : i18n.language === "es" ? "es" : "pt";
  const [language, setLanguage] = useState<Language>(currentLanguage);
  const switching = useRef(false);

  useEffect(() => {
    const sync = () => setLanguage(currentLanguage());
    i18n.on("languageChanged", sync);
    return () => { i18n.off("languageChanged", sync); };
  }, []);

  const selectLanguage = useCallback(async (next: Language) => {
    if (switching.current) return;
    switching.current = true;
    try {
      await changeLanguageSafely(next);
    } finally {
      switching.current = false;
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const prev = currentLanguage();
    void selectLanguage(prev === "pt" ? "en" : prev === "en" ? "es" : "pt");
  }, [selectLanguage]);

  const t = useCallback(
    (key: string) => i18n.t(key),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, selectLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
