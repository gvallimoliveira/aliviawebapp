import { ClipboardList, MessagesSquare, CheckCircle2, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Plan = "pro" | "academic" | "clinic";

const COPY = {
  pt: {
    title: "IA para acompanhar sua rotina",
    intro: {
      pro: "Da avaliação à evolução, seu plano inclui IA especializada em fisioterapia para apoiar o seu raciocínio — sem substituir sua decisão clínica. Combine avaliações, resumos de evolução e conversas com o assistente conforme a sua rotina.",
      clinic: "Uma equipe, diferentes casos, o mesmo apoio: a IA especializada em fisioterapia está incluída no plano e é compartilhada pela clínica. Combine avaliações e acompanhamento dos pacientes, com capacidade maior nos planos para equipes maiores.",
      academic: "Mais espaço para perguntar, conectar conceitos e praticar o raciocínio em fisioterapia. Seu plano inclui IA para explorar casos e conversar com o assistente, além dos quizzes fixos das trilhas, que não consomem o saldo de IA.",
    },
    examples: "Veja como você pode combinar a IA no mês",
    assessmentTitle: "Avaliar e tirar dúvidas",
    followupTitle: "Avaliar e acompanhar",
    studyTitle: "Explorar e aprender",
    practiceTitle: "Praticar com contexto",
    assessment: (n: number, questions: number) => `${n} avaliações com hipótese e plano de tratamento + ${questions} perguntas ao assistente clínico.`,
    followup: (n: number, summaries: number, questions: number) => `${n} avaliações com hipótese e plano de tratamento + ${summaries} impressões clínicas + ${questions} perguntas ao assistente.`,
    study: "200 perguntas ao assistente para explorar conceitos, discutir evidências e esclarecer dúvidas de estudo.",
    practice: "100 perguntas ao assistente + 10 casos com geração de hipótese e plano para exercitar o raciocínio.",
    free: "Prontuário, agenda, exercícios do catálogo, controle de carga e exportação de PDFs não gastam seu saldo de IA. Gerar novos textos com IA utiliza esse saldo.",
    academicFree: "Continue praticando com os quizzes fixos das trilhas: eles não gastam seu saldo de IA.",
    packs: "Em um mês de uso mais intenso, você pode escolher um pacote adicional. Sem cobrança automática ou surpresa no cartão.",
    estimate: (p: Plan, annual: boolean) => `Combinações ilustrativas e alternativas, não cumulativas${p === "clinic" ? ", para toda a equipe do plano Essencial (Small)" : annual ? "; o plano anual oferece capacidade adicional a cada mês" : ""}. Consideram os recursos descritos; voz, outras gerações e ferramentas de IA também utilizam o saldo. O uso disponível é acompanhado na sua conta.`,
  },
  en: {
    title: "AI that supports your routine",
    intro: {
      pro: "From assessment to follow-up, your plan includes physiotherapy-specialized AI to support your reasoning — never replace your clinical judgment. Combine assessments, progress summaries and assistant conversations to suit your routine.",
      clinic: "One team, different cases, shared support: physiotherapy-specialized AI is included in the plan and shared across the clinic. Combine assessments and patient follow-up, with more capacity in plans for larger teams.",
      academic: "More room to ask questions, connect concepts and practice physiotherapy reasoning. Your plan includes AI to explore cases and talk with the assistant, alongside fixed learning-path quizzes that do not use your AI balance.",
    },
    examples: "Ways to combine AI during the month",
    assessmentTitle: "Assess and ask questions",
    followupTitle: "Assess and follow up",
    studyTitle: "Explore and learn",
    practiceTitle: "Practice with context",
    assessment: (n: number, questions: number) => `${n} assessments with a clinical hypothesis and treatment plan + ${questions} clinical assistant questions.`,
    followup: (n: number, summaries: number, questions: number) => `${n} assessments with a clinical hypothesis and treatment plan + ${summaries} clinical impressions + ${questions} assistant questions.`,
    study: "200 assistant questions to explore concepts, discuss evidence and clarify study questions.",
    practice: "100 assistant questions + 10 cases with hypothesis and plan generation to practice reasoning.",
    free: "Records, scheduling, catalog exercises, load monitoring and PDF exports do not use your AI balance. Generating new text with AI does.",
    academicFree: "Keep practicing with fixed learning-path quizzes: they do not use your AI balance.",
    packs: "For a busier month, you can choose an additional pack. No automatic charge or unexpected card payment.",
    estimate: (p: Plan, annual: boolean) => `Illustrative alternative combinations, not cumulative${p === "clinic" ? ", for the whole team on Essential (Small)" : annual ? "; the annual plan includes extra capacity each month" : ""}. They cover the tools described; voice, other generations and AI tools also use the balance. Track available usage in your account.`,
  },
  es: {
    title: "IA para acompañar tu rutina",
    intro: {
      pro: "De la evaluación al seguimiento, tu plan incluye IA especializada en fisioterapia para apoyar tu razonamiento, sin sustituir tu decisión clínica. Combina evaluaciones, resúmenes de evolución y conversaciones con el asistente según tu rutina.",
      clinic: "Un equipo, distintos casos, el mismo apoyo: la IA especializada en fisioterapia está incluida en el plan y se comparte en la clínica. Combina evaluaciones y seguimiento de pacientes, con mayor capacidad en los planes para equipos más grandes.",
      academic: "Más espacio para preguntar, conectar conceptos y practicar el razonamiento en fisioterapia. Tu plan incluye IA para explorar casos y conversar con el asistente, además de los cuestionarios fijos de las rutas, que no consumen el saldo de IA.",
    },
    examples: "Cómo puedes combinar la IA durante el mes",
    assessmentTitle: "Evaluar y resolver dudas",
    followupTitle: "Evaluar y acompañar",
    studyTitle: "Explorar y aprender",
    practiceTitle: "Practicar con contexto",
    assessment: (n: number, questions: number) => `${n} evaluaciones con hipótesis y plan de tratamiento + ${questions} preguntas al asistente clínico.`,
    followup: (n: number, summaries: number, questions: number) => `${n} evaluaciones con hipótesis y plan de tratamiento + ${summaries} impresiones clínicas + ${questions} preguntas al asistente.`,
    study: "200 preguntas al asistente para explorar conceptos, discutir evidencia y aclarar dudas de estudio.",
    practice: "100 preguntas al asistente + 10 casos con generación de hipótesis y plan para practicar el razonamiento.",
    free: "Historia clínica, agenda, ejercicios del catálogo, control de carga y exportación de PDF no consumen tu saldo de IA. Generar nuevos textos con IA sí lo utiliza.",
    academicFree: "Sigue practicando con los cuestionarios fijos de las rutas: no consumen tu saldo de IA.",
    packs: "En un mes de uso más intenso, puedes elegir un paquete adicional. Sin cargos automáticos ni sorpresas en la tarjeta.",
    estimate: (p: Plan, annual: boolean) => `Combinaciones ilustrativas y alternativas, no acumulativas${p === "clinic" ? ", para todo el equipo del plan Esencial (Small)" : annual ? "; el plan anual ofrece capacidad adicional cada mes" : ""}. Incluyen las herramientas descritas; voz, otras generaciones y herramientas de IA también utilizan el saldo. Consulta el uso disponible en tu cuenta.`,
  },
};

export default function CreditsSufficiency({ plan, annual = false, className = "" }: { plan: Plan; annual?: boolean; className?: string }) {
  const { language } = useLanguage();
  const c = COPY[language as keyof typeof COPY] ?? COPY.pt;
  const academic = plan === "academic";
  const clinic = plan === "clinic";
  const examples = [
    {
      icon: academic ? MessagesSquare : ClipboardList,
      title: academic ? c.studyTitle : c.assessmentTitle,
      text: academic ? c.study : c.assessment(clinic ? 80 : 30, clinic ? 400 : 200),
    },
    {
      icon: academic ? ClipboardList : MessagesSquare,
      title: academic ? c.practiceTitle : c.followupTitle,
      text: academic ? c.practice : c.followup(clinic ? 60 : 20, clinic ? 100 : 30, clinic ? 400 : 200),
    },
  ];

  return (
    <section className={`max-w-2xl mx-auto border-y border-border py-5 text-left ${className}`} data-credits-sufficiency>
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.intro[plan]}</p>
      <p className="mt-4 text-sm font-medium text-foreground">{c.examples}</p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {examples.map(({ icon: Icon, title, text }) => (
          <article key={title} className="min-w-0 rounded-lg border border-border bg-muted/30 p-4">
            <Icon className="h-5 w-5 text-primary mb-3" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-foreground leading-relaxed">{title}</h4>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{c.estimate(plan, annual)}</p>
      <div className="mt-4 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted-foreground leading-relaxed">{academic ? c.academicFree : c.free}</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.packs}</p>
    </section>
  );
}
