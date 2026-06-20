import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallAppSection from "@/components/InstallAppSection";
import LgpdBadge from "@/components/LgpdBadge";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowRight, ArrowDown, Brain, Sparkles, BookOpen,
  ClipboardList, FlaskConical, Compass, ShieldAlert, Stethoscope,
  Check, Lightbulb, FileText, Activity, MessageCircleQuestion, Workflow,
} from "lucide-react";
import { PRO_PLAN_PRICE, PRO_PLAN_ANNUAL_PRICE } from "@/constants/pricing";
import { setSeo, setOrganizationJsonLd } from "@/lib/seo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

// Inline i18n — mantém a página auto-contida sem inchar os locales.
const COPY = {
  pt: {
    badge: "Aliv.iA Acadêmico",
    heroTitle: "A ponte entre a teoria da faculdade e o raciocínio clínico real",
    heroSubtitle:
      "Treine seu pensamento clínico com IA, casos simulados, mentor virtual e avaliações padrão-ouro. Saia da graduação com a confiança de quem já avaliou centenas de pacientes.",
    heroCta: "Quero começar agora",
    heroSecondary: "Ver planos",
    quote: "Estudar fisioterapia é fácil. Pensar como fisioterapeuta é o desafio. O Aliv.iA Acadêmico te treina nisso todos os dias.",
    whyTitle: "Por que estudantes escolhem o Aliv.iA Acadêmico",
    benefits: [
      { icon: Brain, title: "Agente Clínico com IA", desc: "Converse 24/7 com um agente treinado em evidência (PEDro ≥ 7) para tirar dúvidas de caso, diagnóstico diferencial e conduta — sem julgamento, na hora que a dúvida bate." },
      { icon: Lightbulb, title: "Modo Mentor", desc: "Ative o modo mentor e receba explicações passo a passo do raciocínio clínico: por que essa hipótese, o que descartar, qual teste pedir e por quê." },
      { icon: MessageCircleQuestion, title: "Quizzes adaptativos", desc: "Quizzes inteligentes que se adaptam ao seu nível e nicho de estudo. Reforço espaçado para fixar de verdade — não decorar para a prova." },
      { icon: Compass, title: "Trilhas de Conhecimento", desc: "8 trilhas curadas: 3 de base (anatomia, biomecânica e cinesiologia) e 5 clínicas por região (ombro, lombar, cervical, quadril, joelho), com evidências e protocolos do básico ao avançado." },
      { icon: FlaskConical, title: "Casos Clínicos Simulados", desc: "Pacientes virtuais com história completa para você avaliar do zero: anamnese, mapa de dor, testes funcionais, hipótese e plano. Erre sem consequências, aprenda com gabarito." },
      { icon: BookOpen, title: "Evidência de alta qualidade", desc: "Base de conhecimento filtrada por PEDro ≥ 7 e diretrizes internacionais. Estude a partir do que realmente sustenta a prática baseada em evidência." },
      { icon: Workflow, title: "Fluxo padrão-ouro de avaliação", desc: "Pratique o fluxo completo: anamnese estruturada → red flags → mapa de dor → testes ortopédicos com valores de ADM (goniometria) → dinamometria com valores de força → questionários validados → hipótese → tratamento. O hábito da boa avaliação se constrói repetindo." },
      { icon: Activity, title: "Da teoria à prática, mais rápido", desc: "Cada caso usa as mesmas ferramentas que profissionais usam com pacientes reais. Você chega ao estágio sabendo o que fazer — não tentando lembrar." },
    ],
    disclaimerTitle: "Acesso Estudante: o que muda em relação ao Profissional",
    disclaimerIntro: "O Aliv.iA Acadêmico libera as mesmas ferramentas do plano Profissional, mas com um conjunto de regras importantes para proteger você, os pacientes e a profissão:",
    disclaimerItems: [
      "Todo PDF, link público de avaliação e relatório enviado leva o selo \"Alivia Acadêmico\" com sua instituição e período — fica claro que a avaliação é acadêmica, não um laudo profissional.",
      "Sua conta não aparece no marketplace público de profissionais. Você não é listado como fisioterapeuta para pacientes contratarem.",
      "Toda avaliação compartilhada com paciente real precisa de supervisão de um fisioterapeuta com CREFITO ativo. O Aliv.iA é ferramenta de raciocínio — não substitui supervisão clínica.",
      "Você não pode emitir conduta como profissional autônomo nem se passar por fisioterapeuta formado. Uso indevido pode ser desativado.",
      "Toda decisão final em um paciente real é responsabilidade do supervisor com CREFITO.",
    ],
    transitionTitle: "Quando você se formar e obter o CREFITO",
    transitionBody:
      "A transição é simples e sua assinatura continua intacta: ao se cadastrar como profissional, basta entrar em \"Minha conta\" → \"Acesso Estudante\" e adicionar seu CREFITO. No mesmo instante:",
    transitionItems: [
      "Seu plano segue ativo — você não paga de novo, não migra de produto, não perde histórico.",
      "O selo \"Alivia Acadêmico\" sai dos PDFs e links públicos automaticamente.",
      "Seu perfil passa a aparecer no marketplace público de profissionais (se você optar).",
      "Você pode ativar o modo dual: alternar entre identidade Profissional e Acadêmico quando estiver em contexto de ensino/estágio.",
    ],
    pricingTitle: "Mesma plataforma, mesmo preço do Profissional",
    pricingDesc: "O Aliv.iA Acadêmico usa a mesma assinatura do plano Profissional — você já entra com acesso completo ao que vai usar quando se formar. Sem produto separado, sem migração.",
    monthly: "Mensal",
    annual: "Anual",
    save: "-30%",
    perMonth: "mês",
    billedAnnually: "cobrado anualmente",
    cancelAnytime: "Cancele quando quiser.",
    annualNoRefund: "Pagamento único anual, sem reembolso parcial.",
    includes: [
      "Acesso completo ao Agente Clínico com IA e Modo Mentor",
      "Quizzes adaptativos e trilhas de conhecimento por nicho",
      "Casos clínicos simulados ilimitados",
      "Avaliação padrão-ouro: anamnese, mapa de dor, testes, questionários, hipótese e tratamento",
      "Selo \"Alivia Acadêmico\" automático em PDFs e links públicos",
      "Acesso a evidências curadas (PEDro ≥ 7)",
      "Migração automática para perfil Profissional ao adicionar CREFITO",
    ],
    cta: "Assinar Aliv.iA Acadêmico",
    faqTitle: "Perguntas frequentes",
    faqs: [
      { q: "Eu não tenho CREFITO ainda — posso usar mesmo assim?", a: "Sim. O Aliv.iA Acadêmico foi feito exatamente para alunos de fisioterapia ainda em formação. O cadastro como estudante pede sua instituição e período, e libera todas as ferramentas com o selo acadêmico." },
      { q: "Por que pagar agora se ainda sou estudante?", a: "Porque o tempo de internalização do raciocínio clínico é longo — e quem treina cedo, com ferramenta certa, chega ao mercado anos à frente. Pense menos como custo de software e mais como custo do seu próprio treino antes da prova final (a vida profissional)." },
      { q: "Vou ter que pagar de novo quando me formar?", a: "Não. Sua assinatura continua ativa após o CREFITO. Você só atualiza o registro em \"Minha conta\" e o selo acadêmico sai automaticamente. Sem novo cadastro, sem novo pagamento, sem perder histórico." },
      { q: "Posso atender paciente real com o Aliv.iA Acadêmico?", a: "Pode treinar avaliação, mas toda conduta clínica em paciente real exige supervisão de um fisioterapeuta com CREFITO ativo. Os PDFs e links públicos saem identificados como acadêmicos justamente para proteger isso." },
      { q: "O modo mentor é só texto ou guia o caso de verdade?", a: "Ele guia. O Mentor te interrompe no momento certo, sugere o próximo teste, pergunta por que você descartou uma hipótese e mostra o porquê. É como ter um professor de raciocínio clínico ao seu lado em cada caso." },
      { q: "As trilhas de conhecimento são quais?", a: "Hoje são 8 trilhas: 3 de base (Anatomia, Biomecânica e Cinesiologia) cobrindo as principais regiões corporais, e 5 clínicas por nicho (ombro, coluna lombar, cervical, quadril e joelho) — todas filtradas por PEDro ≥ 7. Novas trilhas entram conforme o agente é treinado." },
      { q: "E se eu não conseguir manter o estudo? Posso cancelar?", a: "No plano mensal, você cancela quando quiser, sem multa. No anual o pagamento é único e não tem reembolso parcial — então só assine anual quando souber que vai usar de verdade." },
      { q: "Como o Aliv.iA é diferente de um curso ou de só estudar Kapandji?", a: "Curso te dá teoria. O Aliv.iA te força a aplicar essa teoria em um fluxo real de avaliação, com decisões clínicas em sequência, feedback do mentor e correção. É a parte que falta entre saber e fazer." },
    ],
  },
  en: {
    badge: "Alivia Academic",
    heroTitle: "The bridge between physiotherapy school and real clinical reasoning",
    heroSubtitle:
      "Train your clinical thinking with AI, simulated cases, a virtual mentor and gold-standard assessments. Graduate with the confidence of someone who has already assessed hundreds of patients.",
    heroCta: "Start now",
    heroSecondary: "See plans",
    quote: "Studying physio is easy. Thinking like a physio is the real challenge. Alivia Academic trains you on it every day.",
    whyTitle: "Why students choose Alivia Academic",
    benefits: [
      { icon: Brain, title: "Clinical AI Agent", desc: "Chat 24/7 with an agent trained on high-quality evidence (PEDro ≥ 7) for case doubts, differential diagnosis and management — no judgement, when the question hits." },
      { icon: Lightbulb, title: "Mentor Mode", desc: "Turn on Mentor mode for step-by-step reasoning: why this hypothesis, what to rule out, which test to order and why." },
      { icon: MessageCircleQuestion, title: "Adaptive quizzes", desc: "Smart quizzes that adapt to your level and study niche. Spaced reinforcement to actually retain — not cram for exams." },
      { icon: Compass, title: "Knowledge Tracks", desc: "8 curated tracks: 3 foundation (anatomy, biomechanics, kinesiology) and 5 clinical by region (shoulder, low back, cervical, hip, knee), with lessons, evidence and protocols from basic to advanced." },
      { icon: FlaskConical, title: "Simulated Clinical Cases", desc: "Virtual patients with full history for you to assess from scratch: anamnesis, pain map, functional tests, hypothesis and plan. Make mistakes safely." },
      { icon: BookOpen, title: "High-quality evidence", desc: "Knowledge base filtered by PEDro ≥ 7 and international guidelines. Study from what really backs evidence-based practice." },
      { icon: Workflow, title: "Gold-standard assessment flow", desc: "Practice the full flow: structured anamnesis → red flags → pain map → orthopedic tests with ROM (goniometry) values → dynamometry with strength values → validated questionnaires → hypothesis → treatment." },
      { icon: Activity, title: "Theory to practice, faster", desc: "Every case uses the same tools professionals use with real patients. You arrive at internship knowing what to do." },
    ],
    disclaimerTitle: "Student Access: what changes vs Professional",
    disclaimerIntro: "Alivia Academic unlocks the same tools as the Professional plan, with key rules to protect you, patients and the profession:",
    disclaimerItems: [
      "Every PDF, public assessment link and report carries the \"Alivia Academic\" seal with your institution and term — clearly identifying it as academic work, not a professional report.",
      "Your account does not appear in the public professional marketplace.",
      "Every assessment shared with a real patient requires supervision by a licensed physiotherapist.",
      "You cannot issue conduct as an independent professional or impersonate a licensed physio. Misuse may be deactivated.",
      "Final clinical decisions on real patients are the responsibility of the licensed supervisor.",
    ],
    transitionTitle: "When you graduate and get your license",
    transitionBody:
      "The transition is simple and your subscription stays intact: go to \"My account\" → \"Student Access\" and add your license number. Immediately:",
    transitionItems: [
      "Your plan stays active — you don't pay again, don't migrate products, don't lose history.",
      "The \"Alivia Academic\" seal leaves PDFs and public links automatically.",
      "Your profile becomes eligible for the public professional marketplace (if you opt in).",
      "You can enable dual mode: switch between Professional and Academic identity in teaching/internship contexts.",
    ],
    pricingTitle: "Same platform, same Professional price",
    pricingDesc: "Alivia Academic uses the same Professional subscription — you already start with full access to what you'll use after graduating. No separate product, no migration.",
    monthly: "Monthly",
    annual: "Annual",
    save: "-30%",
    perMonth: "mo",
    billedAnnually: "billed annually",
    cancelAnytime: "Cancel anytime.",
    annualNoRefund: "Single annual payment, no partial refund.",
    includes: [
      "Full access to Clinical AI Agent and Mentor Mode",
      "Adaptive quizzes and knowledge tracks by niche",
      "Unlimited simulated clinical cases",
      "Gold-standard assessment: anamnesis, pain map, tests, questionnaires, hypothesis and treatment",
      "Automatic \"Alivia Academic\" seal on PDFs and public links",
      "Access to curated evidence (PEDro ≥ 7)",
      "Automatic migration to Professional profile when you add your license",
    ],
    cta: "Subscribe to Alivia Academic",
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "I don't have my license yet — can I still use it?", a: "Yes. Alivia Academic was built exactly for physiotherapy students still in training." },
      { q: "Why pay now if I'm still a student?", a: "Because internalizing clinical reasoning takes years — those who train early with the right tool arrive years ahead in the market." },
      { q: "Will I have to pay again when I graduate?", a: "No. Your subscription stays active after licensure. Just update your record in \"My account\" and the academic seal goes away automatically." },
      { q: "Can I treat real patients with Alivia Academic?", a: "You can practice assessment, but any clinical conduct on real patients requires supervision by a licensed physiotherapist." },
      { q: "Is Mentor mode just text or does it actually guide the case?", a: "It guides. Mentor interrupts you at the right moment, suggests next tests, asks why you ruled out a hypothesis and explains why." },
      { q: "Which knowledge tracks exist?", a: "Today 8 tracks: 3 foundation (Anatomy, Biomechanics, Kinesiology) covering the main body regions, and 5 clinical niches (shoulder, low back, cervical, hip, knee) — all filtered by PEDro ≥ 7." },
      { q: "What if I can't keep studying? Can I cancel?", a: "On the monthly plan you can cancel anytime, no fee. The annual plan is a single payment with no partial refund." },
      { q: "How is Alivia different from a course or just studying textbooks?", a: "Courses give you theory. Alivia forces you to apply it in a real assessment flow with sequential clinical decisions, mentor feedback and correction." },
    ],
  },
  es: {
    badge: "Alivia Académico",
    heroTitle: "El puente entre la teoría de la facultad y el razonamiento clínico real",
    heroSubtitle:
      "Entrena tu pensamiento clínico con IA, casos simulados, mentor virtual y evaluaciones estándar de oro. Llega graduado con la confianza de quien ya evaluó cientos de pacientes.",
    heroCta: "Empezar ahora",
    heroSecondary: "Ver planes",
    quote: "Estudiar fisio es fácil. Pensar como fisio es el reto. Alivia Académico te entrena todos los días.",
    whyTitle: "Por qué los estudiantes eligen Alivia Académico",
    benefits: [
      { icon: Brain, title: "Agente Clínico con IA", desc: "Chatea 24/7 con un agente entrenado en evidencia (PEDro ≥ 7) para dudas de caso, diagnóstico diferencial y conducta." },
      { icon: Lightbulb, title: "Modo Mentor", desc: "Activa el modo mentor y recibe explicaciones paso a paso del razonamiento clínico." },
      { icon: MessageCircleQuestion, title: "Quizzes adaptativos", desc: "Quizzes inteligentes que se adaptan a tu nivel y nicho de estudio." },
      { icon: Compass, title: "Rutas de Conocimiento", desc: "8 rutas curadas: 3 de base (anatomía, biomecánica y kinesiología) y 5 clínicas por región (hombro, lumbar, cervical, cadera, rodilla)." },
      { icon: FlaskConical, title: "Casos Clínicos Simulados", desc: "Pacientes virtuales con historia completa para evaluar desde cero." },
      { icon: BookOpen, title: "Evidencia de alta calidad", desc: "Base filtrada por PEDro ≥ 7 y directrices internacionales." },
      { icon: Workflow, title: "Flujo de evaluación estándar de oro", desc: "Practica el flujo completo: anamnesis → red flags → mapa de dolor → pruebas con valores de ROM (goniometría) → dinamometría con valores de fuerza → cuestionarios → hipótesis → tratamiento." },
      { icon: Activity, title: "De la teoría a la práctica, más rápido", desc: "Cada caso usa las mismas herramientas que los profesionales usan con pacientes reales." },
    ],
    disclaimerTitle: "Acceso Estudiante: qué cambia frente al Profesional",
    disclaimerIntro: "Alivia Académico libera las mismas herramientas del plan Profesional, con reglas para proteger a ti, los pacientes y la profesión:",
    disclaimerItems: [
      "Todo PDF, enlace público y reporte lleva el sello \"Alivia Académico\" con tu institución y período.",
      "Tu cuenta no aparece en el marketplace público de profesionales.",
      "Toda evaluación compartida con un paciente real requiere supervisión de un fisioterapeuta colegiado.",
      "No puedes emitir conducta como profesional autónomo ni hacerte pasar por fisioterapeuta colegiado.",
      "Toda decisión final en un paciente real es responsabilidad del supervisor colegiado.",
    ],
    transitionTitle: "Cuando te gradúes y obtengas la colegiatura",
    transitionBody:
      "La transición es simple y tu suscripción permanece intacta: ve a \"Mi cuenta\" → \"Acceso Estudiante\" y agrega tu número de registro. Al instante:",
    transitionItems: [
      "Tu plan sigue activo — no pagas de nuevo, no migras de producto, no pierdes historial.",
      "El sello \"Alivia Académico\" sale de los PDFs y enlaces públicos automáticamente.",
      "Tu perfil pasa a ser elegible para el marketplace público de profesionales (si eliges).",
      "Puedes activar el modo dual: alternar entre identidad Profesional y Académico en contextos de enseñanza/práctica.",
    ],
    pricingTitle: "Misma plataforma, mismo precio que Profesional",
    pricingDesc: "Alivia Académico usa la misma suscripción Profesional — ya empiezas con acceso completo a lo que usarás al graduarte.",
    monthly: "Mensual",
    annual: "Anual",
    save: "-30%",
    perMonth: "mes",
    billedAnnually: "facturado anualmente",
    cancelAnytime: "Cancela cuando quieras.",
    annualNoRefund: "Pago único anual, sin reembolso parcial.",
    includes: [
      "Acceso completo al Agente Clínico con IA y Modo Mentor",
      "Quizzes adaptativos y rutas de conocimiento por nicho",
      "Casos clínicos simulados ilimitados",
      "Evaluación estándar de oro completa",
      "Sello \"Alivia Académico\" automático en PDFs y enlaces públicos",
      "Acceso a evidencia curada (PEDro ≥ 7)",
      "Migración automática al perfil Profesional al agregar tu colegiatura",
    ],
    cta: "Suscribirme a Alivia Académico",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "Aún no tengo colegiatura — ¿puedo usarlo igual?", a: "Sí. Alivia Académico fue hecho exactamente para estudiantes de fisio en formación." },
      { q: "¿Por qué pagar ahora si aún soy estudiante?", a: "Porque internalizar el razonamiento clínico toma años — quien entrena temprano llega años adelantado." },
      { q: "¿Tendré que pagar de nuevo cuando me gradúe?", a: "No. Tu suscripción sigue activa tras la colegiatura. Solo actualizas el registro en \"Mi cuenta\"." },
      { q: "¿Puedo atender pacientes reales con Alivia Académico?", a: "Puedes practicar evaluación, pero toda conducta clínica en paciente real requiere supervisión de un fisioterapeuta colegiado." },
      { q: "¿El modo mentor es solo texto o guía el caso?", a: "Guía. Te interrumpe en el momento adecuado, sugiere el próximo test y explica el porqué." },
      { q: "¿Cuáles son las rutas de conocimiento?", a: "Hoy 8 rutas: 3 de base (Anatomía, Biomecánica, Kinesiología) y 5 clínicas (hombro, lumbar, cervical, cadera, rodilla), todas filtradas por PEDro ≥ 7." },
      { q: "¿Y si no logro mantener el estudio? ¿Puedo cancelar?", a: "En el plan mensual cancelas cuando quieras. El anual es pago único sin reembolso parcial." },
      { q: "¿En qué se diferencia Alivia de un curso?", a: "Los cursos dan teoría. Alivia te obliga a aplicarla en un flujo real de evaluación." },
    ],
  },
} as const;

const AcademicLanding = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const c = COPY[language as keyof typeof COPY] ?? COPY.pt;

  useEffect(() => {
    setSeo({
      title: "Aliv.iA Acadêmico — Treine seu raciocínio clínico desde a graduação",
      description:
        "Plataforma para estudantes de fisioterapia: agente clínico com IA, modo mentor, casos simulados, trilhas e avaliações padrão-ouro. Da teoria à prática, mais rápido.",
      url: `${window.location.origin}/academico`,
      type: "website",
    });
    setOrganizationJsonLd();
  }, []);

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard?tab=professional");
      return;
    }
    try {
      sessionStorage.setItem("signupOrigin", "professional");
      sessionStorage.setItem("forceStudentMode", "1");
    } catch {}
    navigate("/auth", { state: { redirectTo: "/professional/register" } });
  };

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const priceFormatted =
    billing === "monthly"
      ? `R$${PRO_PLAN_PRICE}`
      : `R$${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="blur-blob absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/20" />
        <div className="blur-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
        <div className="container relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 text-primary px-4 py-1.5 text-sm font-medium">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              {c.badge}
            </Badge>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
          >
            {c.heroTitle}
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            {c.heroSubtitle}
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleCTA} size="lg" className="rounded-xl gap-2 px-8 text-base">
              {c.heroCta}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl gap-2 px-8 text-base" onClick={scrollToPricing}>
              {c.heroSecondary}
              <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-10 md:py-14 bg-primary/10">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-lg md:text-xl font-semibold text-primary italic"
          >
            "{c.quote}"
          </motion.p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {c.whyTitle}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.benefits.map((b, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer / Diferenças */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-3xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{c.disclaimerTitle}</h2>
              </div>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed mb-5">{c.disclaimerIntro}</p>
            <ul className="space-y-3">
              {c.disclaimerItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <ClipboardList className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Transição CREFITO */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{c.transitionTitle}</h2>
              </div>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed mb-5">{c.transitionBody}</p>
            <ul className="space-y-3">
              {c.transitionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <LgpdBadge />

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4"
          >
            {c.pricingTitle}
          </motion.h2>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-base text-muted-foreground text-center mb-10 max-w-md mx-auto"
          >
            {c.pricingDesc}
          </motion.p>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
            <Card className="border-primary/30 shadow-lg relative bg-primary/[0.02]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> {c.badge}
                </span>
              </div>

              <CardContent className="p-6 md:p-8 pt-8 text-center">
                <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1 mb-5">
                  <button
                    onClick={() => setBilling("monthly")}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      billing === "monthly"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.monthly}
                  </button>
                  <button
                    onClick={() => setBilling("annual")}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                      billing === "annual"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.annual}
                    <Badge className={`text-[10px] px-1.5 py-0 ${
                      billing === "annual"
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    }`}>
                      {c.save}
                    </Badge>
                  </button>
                </div>

                <div className="text-4xl font-bold text-foreground mb-1">
                  {priceFormatted}
                  <span className="text-lg font-normal text-muted-foreground">/{c.perMonth}</span>
                </div>
                {billing === "annual" && (
                  <p className="text-xs text-muted-foreground mb-1">{c.billedAnnually}</p>
                )}
                <p className="text-xs text-muted-foreground mb-6">
                  {billing === "monthly" ? c.cancelAnytime : c.annualNoRefund}
                </p>

                <ul className="text-left space-y-3 mb-8">
                  {c.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button onClick={handleCTA} size="lg" className="w-full rounded-xl gap-2 text-base">
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="container max-w-2xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl font-bold text-foreground text-center mb-10"
          >
            {c.faqTitle}
          </motion.h2>
          <Accordion type="single" collapsible className="w-full">
            {c.faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Final CTA */}
          <div className="mt-12 text-center">
            <Button onClick={handleCTA} size="lg" className="rounded-xl gap-2 px-8 text-base">
              {c.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <InstallAppSection />
      <Footer />
    </div>
  );
};

export default AcademicLanding;
