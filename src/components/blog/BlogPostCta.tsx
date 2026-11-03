import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PATIENT_TAGS = ["dor lombar", "ciatalgia", "dor crônica", "pós-operatório", "recuperação", "saúde da coluna"];

const COPY = {
  pt: {
    pro: { text: "O Aliv.iA leva esse raciocínio para a sua rotina: avaliação estruturada, controle de carga e evolução do paciente num só lugar.", cta: "Conhecer a plataforma", to: "/profissionais" },
    patient: { text: "Quer entender a sua dor com mais clareza? Faça uma avaliação guiada pelo Aliv.iA e leve o resultado ao seu fisioterapeuta.", cta: "Conhecer a avaliação", to: "/para-pacientes" },
  },
  en: {
    pro: { text: "Aliv.iA brings this reasoning into your routine: structured assessment, load control and patient progress in one place.", cta: "Explore the platform", to: "/profissionais" },
    patient: { text: "Want to understand your pain more clearly? Take a guided Aliv.iA assessment and share it with your physiotherapist.", cta: "See the assessment", to: "/para-pacientes" },
  },
  es: {
    pro: { text: "Aliv.iA lleva este razonamiento a tu rutina: evaluación estructurada, control de carga y evolución del paciente en un solo lugar.", cta: "Conocer la plataforma", to: "/profissionais" },
    patient: { text: "¿Quieres entender tu dolor con más claridad? Haz una evaluación guiada con Aliv.iA y llévala a tu fisioterapeuta.", cta: "Conocer la evaluación", to: "/para-pacientes" },
  },
};

const BlogPostCta = ({ tags }: { tags: string[] }) => {
  const { language } = useLanguage();
  const lang = COPY[language as keyof typeof COPY] ?? COPY.pt;
  const isPatient = (tags || []).some((t) => PATIENT_TAGS.includes(t.toLowerCase()));
  const c = isPatient ? lang.patient : lang.pro;
  return (
    <aside className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
      <p className="text-sm leading-relaxed text-foreground">{c.text}</p>
      <Link to={c.to} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {c.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
};

export default BlogPostCta;
