import React, { createContext, useContext, useState, useCallback } from "react";

type Language = "pt" | "en";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Nav
    "nav.home": "Início",
    "nav.about": "Sobre",
    "nav.login": "Entrar",
    "nav.signup": "Cadastrar",
    "nav.dashboard": "Painel",
    "nav.logout": "Sair",
    "nav.language": "EN",

    // Hero
    "hero.title": "Cuide da sua dor com orientação especializada",
    "hero.subtitle": "Avaliação musculoesquelética guiada que ajuda você a entender sua dor e encontrar o caminho para o alívio — de forma segura e acessível.",
    "hero.cta.basic": "Avaliação Básica Gratuita",
    "hero.cta.premium": "Avaliação Premium",
    "hero.badge": "Autoavaliação inteligente",

    // Comparison
    "compare.title": "Escolha sua avaliação",
    "compare.subtitle": "Compare os recursos e escolha o plano ideal para suas necessidades",
    "compare.feature": "Recurso",
    "compare.basic": "Básica",
    "compare.premium": "Premium",
    "compare.basic.price": "Grátis",
    "compare.premium.price": "R$ 100",
    "compare.basic.desc": "Uma degustação do que podemos oferecer",
    "compare.premium.desc": "Avaliação completa com plano de tratamento",
    "compare.anamnesis": "Anamnese",
    "compare.anamnesis.basic": "Simplificada",
    "compare.anamnesis.premium": "Completa e detalhada",
    "compare.painmap": "Mapa de Dor Interativo",
    "compare.redflags": "Triagem de Bandeiras Vermelhas",
    "compare.tests": "Testes Funcionais",
    "compare.diagnosis": "Hipótese Diagnóstica",
    "compare.diagnosis.basic": "Apenas a hipótese",
    "compare.diagnosis.premium": "Com explicação detalhada",
    "compare.treatment": "Plano de Tratamento",
    "compare.treatment.phases": "Curto, médio e longo prazo",
    "compare.exercises": "Exercícios com Vídeos",
    "compare.history": "Histórico de Avaliações",
    "compare.redo": "Refazer em 7 dias",
    "compare.login": "Login necessário",
    "compare.yes": "Sim",
    "compare.no": "Não",
    "compare.start.basic": "Começar Avaliação Básica",
    "compare.start.premium": "Começar Avaliação Premium",

    // How it works
    "how.title": "Como funciona?",
    "how.step1.title": "Responda a Anamnese",
    "how.step1.desc": "Perguntas guiadas sobre sua dor, histórico e sintomas",
    "how.step2.title": "Realize os Testes",
    "how.step2.desc": "Testes funcionais com instruções em vídeo (Premium)",
    "how.step3.title": "Receba seu Resultado",
    "how.step3.desc": "Hipótese diagnóstica e plano de tratamento personalizado",

    // Footer
    "footer.disclaimer": "Este aplicativo não substitui uma consulta médica. Em caso de emergência, procure atendimento presencial.",
    "footer.rights": "Todos os direitos reservados.",
  },
  en: {
    // Nav
    "nav.home": "Home",
    "nav.about": "About",
    "nav.login": "Sign In",
    "nav.signup": "Sign Up",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Sign Out",
    "nav.language": "PT",

    // Hero
    "hero.title": "Take care of your pain with expert guidance",
    "hero.subtitle": "A guided musculoskeletal assessment that helps you understand your pain and find the path to relief — safely and accessibly.",
    "hero.cta.basic": "Free Basic Assessment",
    "hero.cta.premium": "Premium Assessment",
    "hero.badge": "Smart self-assessment",

    // Comparison
    "compare.title": "Choose your assessment",
    "compare.subtitle": "Compare features and choose the ideal plan for your needs",
    "compare.feature": "Feature",
    "compare.basic": "Basic",
    "compare.premium": "Premium",
    "compare.basic.price": "Free",
    "compare.premium.price": "R$ 100",
    "compare.basic.desc": "A taste of what we can offer",
    "compare.premium.desc": "Complete assessment with treatment plan",
    "compare.anamnesis": "Anamnesis",
    "compare.anamnesis.basic": "Simplified",
    "compare.anamnesis.premium": "Complete and detailed",
    "compare.painmap": "Interactive Pain Map",
    "compare.redflags": "Red Flags Screening",
    "compare.tests": "Functional Tests",
    "compare.diagnosis": "Diagnostic Hypothesis",
    "compare.diagnosis.basic": "Hypothesis only",
    "compare.diagnosis.premium": "With detailed explanation",
    "compare.treatment": "Treatment Plan",
    "compare.treatment.phases": "Short, medium and long term",
    "compare.exercises": "Exercises with Videos",
    "compare.history": "Assessment History",
    "compare.redo": "Redo within 7 days",
    "compare.login": "Login required",
    "compare.yes": "Yes",
    "compare.no": "No",
    "compare.start.basic": "Start Basic Assessment",
    "compare.start.premium": "Start Premium Assessment",

    // How it works
    "how.title": "How does it work?",
    "how.step1.title": "Answer the Anamnesis",
    "how.step1.desc": "Guided questions about your pain, history and symptoms",
    "how.step2.title": "Perform the Tests",
    "how.step2.desc": "Functional tests with video instructions (Premium)",
    "how.step3.title": "Get your Results",
    "how.step3.desc": "Diagnostic hypothesis and personalized treatment plan",

    // Footer
    "footer.disclaimer": "This app does not replace a medical consultation. In case of emergency, seek in-person care.",
    "footer.rights": "All rights reserved.",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("pt");

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "pt" ? "en" : "pt"));
  }, []);

  const t = useCallback(
    (key: string) => translations[language][key] || key,
    [language]
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
