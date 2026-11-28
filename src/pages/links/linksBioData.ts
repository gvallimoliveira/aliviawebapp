import type { Language } from "@/contexts/LanguageContext";

export const BIO_UTM = "utm_source=instagram&utm_medium=bio&utm_campaign=links";
export const bioHref = (path: string) => `${path}?${BIO_UTM}`;
export const BIO_INSTAGRAM = "https://www.instagram.com/alivia.fisioapp";
export const BIO_WHATSAPP = `https://wa.me/5521993003358?text=${encodeURIComponent("Olá! Vim pelo Instagram do Aliv.iA e gostaria de tirar dúvidas.")}`;

type BioCopy = {
  tagline: string;
  description: string;
  pro: [string, string];
  clinic: [string, string];
  academic: [string, string];
  patient: [string, string];
  contact: string;
};

export const bioCopy: Record<Language, BioCopy> = {
  pt: {
    tagline: "Raciocínio clínico com alma de fisioterapeuta",
    description: "Escolha seu caminho no Aliv.iA: PRO, Clínica, Acadêmico ou autoavaliação para pacientes.",
    pro: ["Sou fisioterapeuta", "Teste o PRO 7 dias grátis"],
    clinic: ["Tenho clínica", "15 dias grátis, sem cartão"],
    academic: ["Sou estudante", "Conheça o plano Acadêmico"],
    patient: ["Sou paciente", "Faça sua autoavaliação"],
    contact: "Falar com a equipe",
  },
  en: {
    tagline: "Clinical reasoning with a physiotherapist’s soul",
    description: "Choose your Aliv.iA path: PRO, Clinic, Academic or patient self-assessment.",
    pro: ["I’m a physiotherapist", "Try PRO free for 7 days"],
    clinic: ["I run a clinic", "15 days free, no card required"],
    academic: ["I’m a student", "Explore the Academic plan"],
    patient: ["I’m a patient", "Start your self-assessment"],
    contact: "Talk to our team",
  },
  es: {
    tagline: "Razonamiento clínico con alma de fisioterapeuta",
    description: "Elige tu camino en Aliv.iA: PRO, Clínica, Académico o autoevaluación para pacientes.",
    pro: ["Soy fisioterapeuta", "Prueba PRO gratis por 7 días"],
    clinic: ["Tengo una clínica", "15 días gratis, sin tarjeta"],
    academic: ["Soy estudiante", "Conoce el plan Académico"],
    patient: ["Soy paciente", "Haz tu autoevaluación"],
    contact: "Hablar con el equipo",
  },
};