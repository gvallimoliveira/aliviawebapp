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

    // Auth
    "auth.login_title": "Entrar na sua conta",
    "auth.login_desc": "Acesse suas avaliações e histórico",
    "auth.signup_title": "Criar uma conta",
    "auth.signup_desc": "Cadastre-se para acessar a avaliação premium",
    "auth.name": "Nome completo",
    "auth.name_placeholder": "Seu nome",
    "auth.email": "E-mail",
    "auth.email_placeholder": "seu@email.com",
    "auth.password": "Senha",
    "auth.password_placeholder": "Mínimo 6 caracteres",
    "auth.login_button": "Entrar",
    "auth.signup_button": "Cadastrar",
    "auth.no_account": "Não tem conta? Cadastre-se",
    "auth.has_account": "Já tem conta? Entrar",
    "auth.error": "Erro",
    "auth.check_email": "Verifique seu e-mail",
    "auth.check_email_desc": "Enviamos um link de confirmação para o seu e-mail.",

    // Dashboard
    "dashboard.welcome": "Olá",
    "dashboard.subtitle": "Gerencie suas avaliações de dor",
    "dashboard.new_basic": "Avaliação Básica",
    "dashboard.new_basic_desc": "Avaliação gratuita com hipótese diagnóstica",
    "dashboard.new_premium": "Avaliação Premium",
    "dashboard.new_premium_desc": "Avaliação completa com plano de tratamento — R$100",
    "dashboard.history": "Histórico de Avaliações",
    "dashboard.no_assessments": "Você ainda não realizou nenhuma avaliação.",
    "dashboard.completed": "Concluída",
    "dashboard.in_progress": "Em andamento",

    // Red Flags
    "redflags.title": "Triagem de Segurança",
    "redflags.subtitle": "Antes de iniciar, precisamos verificar alguns sinais importantes. Responda com sinceridade.",
    "redflags.trauma": "Você sofreu algum trauma recente (queda, acidente, impacto)?",
    "redflags.weight_loss": "Teve perda de peso inexplicada nos últimos meses?",
    "redflags.fever": "Está com febre persistente ou recorrente?",
    "redflags.sphincter": "Teve perda de controle da bexiga ou intestino?",
    "redflags.night_pain": "Sente dor intensa que piora à noite e não melhora em nenhuma posição?",
    "redflags.cancer": "Possui histórico pessoal de câncer?",
    "redflags.numbness_progressive": "Está sentindo dormência ou fraqueza progressiva nos braços ou pernas?",
    "redflags.recent_surgery": "Realizou cirurgia na região da dor nos últimos 3 meses?",
    "redflags.yes": "Sim",
    "redflags.no": "Não",
    "redflags.continue": "Continuar",

    // Red Flag Alert
    "redflag_alert.title": "Atenção: Avaliação Médica Recomendada",
    "redflag_alert.message": "Com base nas suas respostas, identificamos sinais que necessitam de avaliação médica presencial. Para sua segurança, não é possível continuar com a autoavaliação neste momento.",
    "redflag_alert.recommendation": "Procure um médico ou serviço de saúde para uma avaliação adequada.",
    "redflag_alert.back": "Voltar ao Início",

    // Pain Map
    "painmap.title": "Mapa de Dor",
    "painmap.subtitle": "Clique nas regiões onde você sente dor (selecione todas que se aplicam)",
    "painmap.front": "Frente",
    "painmap.back": "Costas",
    "painmap.side": "Lateral",

    // Anamnesis
    "anamnesis.step": "Etapa",
    "anamnesis.back": "Voltar",
    "anamnesis.next": "Próximo",
    "anamnesis.finish": "Finalizar",
    "anamnesis.complaint_title": "Qual sua queixa principal?",
    "anamnesis.complaint.neck_pain": "Dor no pescoço/cervical",
    "anamnesis.complaint.back_pain": "Dor nas costas/lombar",
    "anamnesis.complaint.shoulder_pain": "Dor no ombro",
    "anamnesis.complaint.knee_pain": "Dor no joelho",
    "anamnesis.complaint.hip_pain": "Dor no quadril",
    "anamnesis.complaint.ankle_pain": "Dor no tornozelo",
    "anamnesis.complaint.wrist_pain": "Dor no punho",
    "anamnesis.complaint.elbow_pain": "Dor no cotovelo",
    "anamnesis.complaint.foot_pain": "Dor no pé",
    "anamnesis.complaint.headache": "Dor de cabeça",
    "anamnesis.other_complaint": "Outra queixa",
    "anamnesis.other_complaint_placeholder": "Descreva sua queixa...",
    "anamnesis.onset_title": "Como a dor começou?",
    "anamnesis.onset.sudden": "Início súbito (de repente)",
    "anamnesis.onset.gradual": "Início gradual (foi piorando aos poucos)",
    "anamnesis.onset.trauma": "Após trauma ou esforço específico",
    "anamnesis.pain_type_title": "Que tipo de dor você sente?",
    "anamnesis.pain_type_subtitle": "Selecione todos que se aplicam",
    "anamnesis.pain_type.local": "Pontual / Localizada",
    "anamnesis.pain_type.radiating": "Irradiada (espalha)",
    "anamnesis.pain_type.burning": "Em queimação",
    "anamnesis.pain_type.tingling": "Formigamento",
    "anamnesis.pain_type.throbbing": "Latejante",
    "anamnesis.pain_type.stabbing": "Em pontada",
    "anamnesis.evolution_title": "Como a dor está evoluindo?",
    "anamnesis.evolution.improving": "Melhorando",
    "anamnesis.evolution.stable": "Estável (sem mudança)",
    "anamnesis.evolution.worsening": "Piorando",
    "anamnesis.aggravating": "O que piora a dor?",
    "anamnesis.aggravating_placeholder": "Ex: ficar sentado muito tempo, carregar peso...",
    "anamnesis.relieving": "O que alivia a dor?",
    "anamnesis.relieving_placeholder": "Ex: deitar, aplicar gelo, alongar...",
    "anamnesis.activity_level": "Nível de atividade física",
    "anamnesis.activity.sedentary": "Sedentário",
    "anamnesis.activity.light": "Ativo leve",
    "anamnesis.activity.regular": "Praticante regular",
    "anamnesis.activity.athlete": "Atleta",
    "anamnesis.pain_score_title": "Qual a intensidade da sua dor?",
    "anamnesis.pain_score_desc": "0 = sem dor, 10 = pior dor imaginável",
    "anamnesis.no_pain": "Sem dor",
    "anamnesis.worst_pain": "Pior dor",

    // Result
    "result.processing": "Processando sua avaliação...",
    "result.processing_desc": "Em breve você receberá sua hipótese diagnóstica.",

    // Diagnosis
    "diagnosis.title": "Hipótese Diagnóstica",
    "diagnosis.confidence_label": "Nível de confiança",
    "diagnosis.confidence.low": "Baixo",
    "diagnosis.confidence.moderate": "Moderado",
    "diagnosis.confidence.high": "Alto",
    "diagnosis.summary": "Resumo",
    "diagnosis.explanation": "O que está acontecendo?",
    "diagnosis.reasoning": "Por que essa hipótese?",
    "diagnosis.recommendations": "Recomendações",
    "diagnosis.disclaimer_label": "Aviso importante",
    "diagnosis.upsell": "Quer uma explicação detalhada, recomendações personalizadas e um plano de tratamento completo?",
    "diagnosis.upgrade_cta": "Fazer Avaliação Premium",
    "diagnosis.back": "Voltar",
    "diagnosis.new_assessment": "Nova Avaliação",
    "diagnosis.error_title": "Erro ao gerar diagnóstico",
    "diagnosis.error_desc": "Ocorreu um erro ao processar sua avaliação. Tente novamente.",
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

    // Auth
    "auth.login_title": "Sign in to your account",
    "auth.login_desc": "Access your assessments and history",
    "auth.signup_title": "Create an account",
    "auth.signup_desc": "Sign up to access the premium assessment",
    "auth.name": "Full name",
    "auth.name_placeholder": "Your name",
    "auth.email": "Email",
    "auth.email_placeholder": "your@email.com",
    "auth.password": "Password",
    "auth.password_placeholder": "Minimum 6 characters",
    "auth.login_button": "Sign In",
    "auth.signup_button": "Sign Up",
    "auth.no_account": "Don't have an account? Sign up",
    "auth.has_account": "Already have an account? Sign in",
    "auth.error": "Error",
    "auth.check_email": "Check your email",
    "auth.check_email_desc": "We sent a confirmation link to your email.",

    // Dashboard
    "dashboard.welcome": "Hello",
    "dashboard.subtitle": "Manage your pain assessments",
    "dashboard.new_basic": "Basic Assessment",
    "dashboard.new_basic_desc": "Free assessment with diagnostic hypothesis",
    "dashboard.new_premium": "Premium Assessment",
    "dashboard.new_premium_desc": "Complete assessment with treatment plan — R$100",
    "dashboard.history": "Assessment History",
    "dashboard.no_assessments": "You haven't completed any assessments yet.",
    "dashboard.completed": "Completed",
    "dashboard.in_progress": "In progress",

    // Red Flags
    "redflags.title": "Safety Screening",
    "redflags.subtitle": "Before starting, we need to check some important signs. Please answer honestly.",
    "redflags.trauma": "Have you suffered any recent trauma (fall, accident, impact)?",
    "redflags.weight_loss": "Have you had unexplained weight loss in recent months?",
    "redflags.fever": "Do you have persistent or recurring fever?",
    "redflags.sphincter": "Have you lost bladder or bowel control?",
    "redflags.night_pain": "Do you have intense pain that worsens at night and doesn't improve in any position?",
    "redflags.cancer": "Do you have a personal history of cancer?",
    "redflags.numbness_progressive": "Are you experiencing progressive numbness or weakness in your arms or legs?",
    "redflags.recent_surgery": "Have you had surgery in the pain area in the last 3 months?",
    "redflags.yes": "Yes",
    "redflags.no": "No",
    "redflags.continue": "Continue",

    // Red Flag Alert
    "redflag_alert.title": "Attention: Medical Evaluation Recommended",
    "redflag_alert.message": "Based on your answers, we identified signs that require in-person medical evaluation. For your safety, it is not possible to continue with the self-assessment at this time.",
    "redflag_alert.recommendation": "Please seek a doctor or health service for proper evaluation.",
    "redflag_alert.back": "Back to Home",

    // Pain Map
    "painmap.title": "Pain Map",
    "painmap.subtitle": "Click on the regions where you feel pain (select all that apply)",
    "painmap.front": "Front",
    "painmap.back": "Back",
    "painmap.side": "Side",

    // Anamnesis
    "anamnesis.step": "Step",
    "anamnesis.back": "Back",
    "anamnesis.next": "Next",
    "anamnesis.finish": "Finish",
    "anamnesis.complaint_title": "What is your main complaint?",
    "anamnesis.complaint.neck_pain": "Neck / cervical pain",
    "anamnesis.complaint.back_pain": "Back / lower back pain",
    "anamnesis.complaint.shoulder_pain": "Shoulder pain",
    "anamnesis.complaint.knee_pain": "Knee pain",
    "anamnesis.complaint.hip_pain": "Hip pain",
    "anamnesis.complaint.ankle_pain": "Ankle pain",
    "anamnesis.complaint.wrist_pain": "Wrist pain",
    "anamnesis.complaint.elbow_pain": "Elbow pain",
    "anamnesis.complaint.foot_pain": "Foot pain",
    "anamnesis.complaint.headache": "Headache",
    "anamnesis.other_complaint": "Other complaint",
    "anamnesis.other_complaint_placeholder": "Describe your complaint...",
    "anamnesis.onset_title": "How did the pain start?",
    "anamnesis.onset.sudden": "Sudden onset (all at once)",
    "anamnesis.onset.gradual": "Gradual onset (slowly worsening)",
    "anamnesis.onset.trauma": "After trauma or specific effort",
    "anamnesis.pain_type_title": "What type of pain do you feel?",
    "anamnesis.pain_type_subtitle": "Select all that apply",
    "anamnesis.pain_type.local": "Local / Pinpointed",
    "anamnesis.pain_type.radiating": "Radiating (spreads)",
    "anamnesis.pain_type.burning": "Burning",
    "anamnesis.pain_type.tingling": "Tingling",
    "anamnesis.pain_type.throbbing": "Throbbing",
    "anamnesis.pain_type.stabbing": "Stabbing",
    "anamnesis.evolution_title": "How is the pain evolving?",
    "anamnesis.evolution.improving": "Improving",
    "anamnesis.evolution.stable": "Stable (no change)",
    "anamnesis.evolution.worsening": "Worsening",
    "anamnesis.aggravating": "What makes the pain worse?",
    "anamnesis.aggravating_placeholder": "E.g., sitting for long, carrying weight...",
    "anamnesis.relieving": "What relieves the pain?",
    "anamnesis.relieving_placeholder": "E.g., lying down, applying ice, stretching...",
    "anamnesis.activity_level": "Physical activity level",
    "anamnesis.activity.sedentary": "Sedentary",
    "anamnesis.activity.light": "Light active",
    "anamnesis.activity.regular": "Regular practitioner",
    "anamnesis.activity.athlete": "Athlete",
    "anamnesis.pain_score_title": "How intense is your pain?",
    "anamnesis.pain_score_desc": "0 = no pain, 10 = worst pain imaginable",
    "anamnesis.no_pain": "No pain",
    "anamnesis.worst_pain": "Worst pain",

    // Result
    "result.processing": "Processing your assessment...",
    "result.processing_desc": "You will receive your diagnostic hypothesis shortly.",

    // Diagnosis
    "diagnosis.title": "Diagnostic Hypothesis",
    "diagnosis.confidence_label": "Confidence level",
    "diagnosis.confidence.low": "Low",
    "diagnosis.confidence.moderate": "Moderate",
    "diagnosis.confidence.high": "High",
    "diagnosis.summary": "Summary",
    "diagnosis.explanation": "What's happening?",
    "diagnosis.reasoning": "Why this hypothesis?",
    "diagnosis.recommendations": "Recommendations",
    "diagnosis.disclaimer_label": "Important notice",
    "diagnosis.upsell": "Want a detailed explanation, personalized recommendations and a complete treatment plan?",
    "diagnosis.upgrade_cta": "Get Premium Assessment",
    "diagnosis.back": "Back",
    "diagnosis.new_assessment": "New Assessment",
    "diagnosis.error_title": "Error generating diagnosis",
    "diagnosis.error_desc": "An error occurred while processing your assessment. Please try again.",
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
