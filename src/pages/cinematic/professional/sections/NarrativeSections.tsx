import { ArrowRight, Check, Smartphone, Camera, FileUp, Link2, ShieldCheck, X, MessageCircle, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type L = { pt: string; en: string; es: string };
const useTx = () => {
  const { language } = useLanguage();
  return (s: L) => (language === "en" ? s.en : language === "es" ? s.es : s.pt);
};

const SimulatedTag = () => {
  const tx = useTx();
  return (
    <span className="inline-flex rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {tx({ pt: "Dados simulados · telas ilustrativas", en: "Simulated data · illustrative screens", es: "Datos simulados · pantallas ilustrativas" })}
    </span>
  );
};

const EvidenceStrip = () => {
  const tx = useTx();
  const items: { n: string; text: L; src: string }[] = [
    { n: "39% × 16%", text: { pt: "dos pacientes com lombalgia crônica disseram ter feito todos os exercícios × percepção dos fisioterapeutas. Só 15% demonstraram o programa corretamente.", en: "of chronic low back pain patients said they did all exercises × physiotherapists' perception. Only 15% demonstrated the program correctly.", es: "de los pacientes con lumbalgia crónica dijeron haber hecho todos los ejercicios × percepción de los fisioterapeutas. Solo 15% demostró el programa correctamente." }, src: "Peek et al., Physiother Theory Pract, 2019" },
    { n: "70%", text: { pt: "é quanto a não adesão pode chegar em programas domiciliares sem supervisão.", en: "is how high non-adherence can reach in unsupervised home programs.", es: "es cuánto puede llegar la no adhesión en programas domiciliarios sin supervisión." }, src: "Essery et al., Disabil Rehabil, 2017 · Ley & Putz, Syst Rev, 2024" },
    { n: "36%", text: { pt: "de adesão num programa domiciliar com idosas no Brasil (UFMG), mesmo com 86% de retenção.", en: "adherence in a home program for older women in Brazil (UFMG), despite 86% retention.", es: "de adhesión en un programa domiciliario con mujeres mayores en Brasil (UFMG), aun con 86% de retención." }, src: "Picorelli et al., Fisioter Pesqui, 2015" },
  ];
  return (
    <div className="mt-10">
      <p className="mb-4 text-center text-sm font-medium text-primary">{tx({ pt: "O que a pesquisa mostra", en: "What research shows", es: "Lo que muestra la investigación" })}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.n} className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-2xl font-bold text-primary">{i.n}</p>
            <p className="text-sm leading-relaxed text-foreground">{tx(i.text)}</p>
            <p className="mt-3 text-[11px] text-muted-foreground">{i.src}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        {tx({ pt: "Revisão de ensaios clínicos indica que acrescentar acompanhamento digital ao programa domiciliar provavelmente aumenta a adesão no curto prazo; no longo prazo, o efeito é incerto (Lang et al., Arch Physiother, 2022).", en: "A review of trials indicates adding digital follow-up to home programs probably increases short-term adherence; long-term effect is uncertain (Lang et al., Arch Physiother, 2022).", es: "Una revisión de ensayos indica que añadir seguimiento digital al programa domiciliario probablemente aumenta la adhesión a corto plazo; a largo plazo, el efecto es incierto (Lang et al., Arch Physiother, 2022)." })}
      </p>
    </div>
  );
};

/** Patient report vs. what the record shows between visits. */
export const ReportVsDataSection = () => {
  const tx = useTx();
  const rows: { label: L; said: L; shown: L; detail: L }[] = [
    {
      label: { pt: "Exercícios em casa", en: "Home exercises", es: "Ejercicios en casa" },
      said: { pt: "“Fiz quase todo dia.”", en: "“I did them almost every day.”", es: "“Los hice casi todos los días.”" },
      shown: { pt: "5 sessões planejadas · 2 registradas", en: "5 sessions planned · 2 logged", es: "5 sesiones planificadas · 2 registradas" },
      detail: { pt: "Você compara o planejado com o registrado e pergunta sobre as outras sessões — falta de registro não significa falta de exercício.", en: "Compare the plan with the logs and ask about the other sessions — an absent log does not mean exercise was skipped.", es: "Comparas lo planificado con lo registrado y preguntas por las otras sesiones: sin registro no significa sin ejercicio." },
    },
    {
      label: { pt: "Dor", en: "Pain", es: "Dolor" },
      said: { pt: "“Continua igual.”", en: "“It's the same.”", es: "“Sigue igual.”" },
      shown: { pt: "Dor informada: 3/10 na sexta · 7/10 no domingo", en: "Reported pain: 3/10 Friday · 7/10 Sunday", es: "Dolor informado: 3/10 el viernes · 7/10 el domingo" },
      detail: { pt: "As notas mostram uma variação que o relato geral não detalha. Você investiga o que mudou nesses dias.", en: "The scores reveal a change the general account does not detail. You explore what changed on those days.", es: "Las notas muestran una variación que el relato general no detalla. Investigas qué cambió esos días." },
    },
    {
      label: { pt: "Recuperação", en: "Recovery", es: "Recuperación" },
      said: { pt: "“Tá tudo tranquilo.”", en: "“Everything's fine.”", es: "“Todo tranquilo.”" },
      shown: { pt: "Recuperação percebida: 8 → 5 → 3 de 10", en: "Perceived recovery: 8 → 5 → 3 out of 10", es: "Recuperación percibida: 8 → 5 → 3 de 10" },
      detail: { pt: "Três respostas consecutivas indicam que ele se sente menos recuperado. Você retoma esse ponto antes de definir a carga da sessão.", en: "Three consecutive responses indicate the patient feels less recovered. You discuss this before setting the session load.", es: "Tres respuestas consecutivas indican que se siente menos recuperado. Retomas este punto antes de definir la carga de la sesión." },
    },
  ];
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        <p className="mb-3 text-center text-sm font-medium text-primary">{tx({ pt: "Relato do paciente × métricas no Aliv.iA", en: "Patient account × metrics in Aliv.iA", es: "Relato del paciente × métricas en Aliv.iA" })}</p>
        <h2 className="mb-4 text-center text-3xl font-bold leading-tight text-foreground md:text-4xl">
          {tx({ pt: "Entenda o que aconteceu entre as consultas.", en: "Understand what happened between visits.", es: "Entiende qué pasó entre las consultas." })}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
          {tx({
            pt: "Na consulta, o paciente conta como passou a semana. No Aliv.iA, as notas de dor, de recuperação e os registros de exercício ajudam você a aprofundar essa conversa, com datas e números.",
            en: "At the visit, the patient tells you how the week went. In Aliv.iA, pain scores, recovery scores and exercise logs help you explore that account with dates and numbers.",
            es: "En la consulta, el paciente cuenta cómo pasó la semana. En Aliv.iA, las notas de dolor, de recuperación y los registros de ejercicio te ayudan a profundizar esa conversación, con fechas y números.",
          })}
        </p>
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.label.pt} className="overflow-hidden rounded-lg border border-border bg-card">
              <h3 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">{tx(r.label)}</h3>
              <div className="grid md:grid-cols-[1fr_1.4fr]">
                <div className="p-5">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {tx({ pt: "O paciente conta na consulta", en: "What the patient says at the visit", es: "Lo que cuenta en la consulta" })}
                  </p>
                  <p className="text-lg italic text-foreground">{tx(r.said)}</p>
                </div>
                <div className="border-t border-border bg-primary/5 p-5 md:border-l md:border-t-0">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
                    <BarChart3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {tx({ pt: "O Aliv.iA organiza os registros da semana", en: "Aliv.iA organizes the week's logs", es: "Aliv.iA organiza los registros de la semana" })}
                  </p>
                  <p className="text-base font-semibold leading-relaxed text-foreground">{tx(r.shown)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tx(r.detail)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          {tx({ pt: "Os dados dependem do que o paciente responde e registra pelo celular, sem baixar app. Eles complementam a escuta e a avaliação clínica — não são uma medição automática.", en: "Data depends on what the patient answers and logs on their phone, with no app to install. It complements listening and clinical assessment — it is not automatic measurement.", es: "Los datos dependen de lo que el paciente responde y registra en el celular, sin descargar app. Complementan la escucha y la evaluación clínica: no son una medición automática." })}
        </p>
        <div className="mt-4 text-center"><SimulatedTag /></div>
        <EvidenceStrip />
      </div>
    </section>
  );
};

/** Side-by-side contrast, one row per care moment. */
export const ContrastSection = () => {
  const tx = useTx();
  const rows: { moment: L; without: L; withA: L }[] = [
    { moment: { pt: "Anamnese", en: "History", es: "Anamnesis" }, without: { pt: "Perguntas repetidas na sessão", en: "Repeated questions in session", es: "Preguntas repetidas en la sesión" }, withA: { pt: "Respostas chegam antes, pela pré-avaliação por link", en: "Answers arrive before, via pre-assessment link", es: "Las respuestas llegan antes, por el enlace de preevaluación" } },
    { moment: { pt: "Avaliação", en: "Assessment", es: "Evaluación" }, without: { pt: "Formulário solto", en: "Loose forms", es: "Formulario suelto" }, withA: { pt: "Avaliação guiada com testes, ADM e dinamometria", en: "Guided assessment with tests, ROM and dynamometry", es: "Evaluación guiada con pruebas, ROM y dinamometría" } },
    { moment: { pt: "Raciocínio", en: "Reasoning", es: "Razonamiento" }, without: { pt: "Dúvida resolvida em dez abas abertas", en: "Doubts solved across ten open tabs", es: "Dudas resueltas en diez pestañas abiertas" }, withA: { pt: "Hipóteses e STEPS sugeridos para você validar", en: "Hypotheses and STEPS suggested for you to validate", es: "Hipótesis y STEPS sugeridos para que valides" } },
    { moment: { pt: "Exercício em casa", en: "Home exercise", es: "Ejercicio en casa" }, without: { pt: "Papel ou PDF que se perde", en: "Paper or PDF that gets lost", es: "Papel o PDF que se pierde" }, withA: { pt: "Programa de exercícios com vídeo, enviado por link", en: "Exercise program with video, sent by link", es: "Programa de ejercicios con video, enviado por enlace" } },
    { moment: { pt: "Evolução", en: "Progress notes", es: "Evolución" }, without: { pt: "Anotação depois do expediente", en: "Notes after hours", es: "Notas después del horario" }, withA: { pt: "Evolução no prontuário, digitada ou ditada", en: "Notes in the record, typed or dictated", es: "Evolución en la ficha, escrita o dictada" } },
    { moment: { pt: "Reavaliação", en: "Reassessment", es: "Reevaluación" }, without: { pt: "“Acho que melhorei”", en: "“I think I'm better”", es: "“Creo que mejoré”" }, withA: { pt: "Reavaliação expressa e PDF comparativo", en: "Express reassessment and comparison PDF", es: "Reevaluación exprés y PDF comparativo" } },
  ];
  return (
    <section className="bg-muted/30 py-16 md:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl">
          {tx({ pt: "Sua rotina, sem e com o Aliv.iA", en: "Your routine, without and with Aliv.iA", es: "Tu rutina, sin y con Aliv.iA" })}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-2 border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wide">
            <p className="p-3 text-muted-foreground">{tx({ pt: "Sem Aliv.iA", en: "Without", es: "Sin Aliv.iA" })}</p>
            <p className="p-3 text-primary">{tx({ pt: "Com Aliv.iA", en: "With Aliv.iA", es: "Con Aliv.iA" })}</p>
          </div>
          {rows.map((r) => (
            <div key={r.moment.pt} className="border-b border-border last:border-0">
              <p className="px-3 pt-3 text-xs font-semibold text-foreground">{tx(r.moment)}</p>
              <div className="grid grid-cols-2 gap-3 p-3 pt-1 text-sm">
                <p className="flex gap-2 text-muted-foreground"><X className="mt-0.5 h-4 w-4 shrink-0" />{tx(r.without)}</p>
                <p className="flex gap-2 text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{tx(r.withA)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/** Real workflow grouped in three moments (shorter on mobile than 6 steps). */
export const RoutineSection = () => {
  const tx = useTx();
  const moments: { n: string; title: L; items: L }[] = [
    { n: "01", title: { pt: "Antes da consulta", en: "Before the visit", es: "Antes de la consulta" }, items: { pt: "Pré-avaliação por link: anamnese, mapa de dor, nota de dor, questionários validados e triagem de sinais de alerta chegam organizados no seu painel.", en: "Pre-assessment link: history, pain map, pain score, validated questionnaires and red-flag screening arrive organized in your panel.", es: "Enlace de preevaluación: anamnesis, mapa de dolor, nota de dolor, cuestionarios validados y cribado de señales de alerta llegan organizados." } },
    { n: "02", title: { pt: "Na consulta", en: "During the visit", es: "En la consulta" }, items: { pt: "Avaliação guiada, hipótese clínica preliminar com STEPS e D.I.F.I. para você revisar, e relatório em PDF com a sua marca.", en: "Guided assessment, preliminary clinical hypothesis with STEPS and D.I.F.I. for your review, and a PDF report with your brand.", es: "Evaluación guiada, hipótesis clínica preliminar con STEPS y D.I.F.I. para tu revisión, e informe PDF con tu marca." } },
    { n: "03", title: { pt: "Entre as consultas", en: "Between visits", es: "Entre consultas" }, items: { pt: "Programa de exercícios, check-in de prontidão, controle de carga, evolução no prontuário e reavaliação expressa.", en: "Exercise program, readiness check-in, load monitoring, progress notes and express reassessment.", es: "Programa de ejercicios, check-in de disposición, control de carga, evolución y reevaluación exprés." } },
  ];
  return (
    <section id="how" className="py-16 md:py-20">
      <div className="container mx-auto max-w-5xl px-4">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl">
          {tx({ pt: "Como funciona na sua rotina", en: "How it works in your routine", es: "Cómo funciona en tu rutina" })}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {moments.map((m) => (
            <div key={m.n} className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-2 text-3xl font-bold text-primary">{m.n}</p>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{tx(m.title)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tx(m.items)}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm font-medium text-foreground">
          {tx({ pt: "A decisão clínica é sempre sua.", en: "The clinical decision is always yours.", es: "La decisión clínica siempre es tuya." })}
        </p>
      </div>
    </section>
  );
};

/** "You guide. Aliv.iA shows if it worked." — simulated before/after. */
export const ProofSection = () => {
  const tx = useTx();
  const items: { action: L; from: string; to: string; unit: L }[] = [
    { action: { pt: "Ajustou a carga", en: "Adjusted the load", es: "Ajustó la carga" }, from: "6", to: "3", unit: { pt: "dor ao descer escadas em 4 semanas", en: "pain going downstairs in 4 weeks", es: "dolor al bajar escaleras en 4 semanas" } },
    { action: { pt: "Enviou o programa de exercícios", en: "Sent the exercise program", es: "Envió el programa de ejercicios" }, from: "1", to: "4", unit: { pt: "check-ins por semana", en: "check-ins per week", es: "check-ins por semana" } },
    { action: { pt: "Fez a reavaliação expressa", en: "Ran the express reassessment", es: "Hizo la reevaluación exprés" }, from: "63%", to: "78%", unit: { pt: "função no KOOS", en: "KOOS function", es: "función en KOOS" } },
  ];
  return (
    <section className="bg-foreground py-16 text-background md:py-20">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          {tx({ pt: "Você orienta. O Aliv.iA mostra se funcionou.", en: "You guide. Aliv.iA shows whether it worked.", es: "Tú orientas. Aliv.iA muestra si funcionó." })}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-background/80">
          {tx({ pt: "Sua conduta deixa de sumir no intervalo entre as sessões e vira resposta que você consegue ver.", en: "Your plan no longer disappears between sessions; it becomes a response you can see.", es: "Tu conducta deja de perderse entre sesiones y se vuelve una respuesta visible." })}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.action.pt} className="rounded-2xl border border-background/20 p-5 text-left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-background/70">{tx(i.action)}</p>
              <p className="text-3xl font-bold">{i.from} <span className="text-background/60">→</span> {i.to}</p>
              <p className="mt-1 text-sm text-background/80">{tx(i.unit)}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-wide text-background/60">
          {tx({ pt: "Exemplos com dados simulados", en: "Examples with simulated data", es: "Ejemplos con datos simulados" })}
        </p>
      </div>
    </section>
  );
};

/** Objections answered with features that exist today. */
export const ObjectionsSection = () => {
  const tx = useTx();
  const items = [
    { icon: Smartphone, title: { pt: "Seu paciente não baixa app", en: "No app for your patient", es: "Tu paciente no descarga app" }, desc: { pt: "Tudo funciona pelo navegador do celular, a partir de um link.", en: "Everything runs in the phone browser from a link.", es: "Todo funciona en el navegador del celular desde un enlace." } },
    { icon: Camera, title: { pt: "Importe sua agenda por foto", en: "Import your schedule by photo", es: "Importa tu agenda por foto" }, desc: { pt: "A IA lê o print da agenda antiga e você confere antes de salvar.", en: "AI reads your old schedule screenshot and you check before saving.", es: "La IA lee la captura de tu agenda y la revisas antes de guardar." } },
    { icon: FileUp, title: { pt: "Avaliação feita fora? Envie o PDF", en: "Assessment done elsewhere? Upload the PDF", es: "¿Evaluación hecha afuera? Sube el PDF" }, desc: { pt: "A IA organiza no padrão Aliv.iA e você revisa cada campo.", en: "AI maps it to the Aliv.iA format and you review every field.", es: "La IA lo organiza en el formato Aliv.iA y revisas cada campo." } },
    { icon: Link2, title: { pt: "Começa no primeiro paciente", en: "Starts with your first patient", es: "Empieza con el primer paciente" }, desc: { pt: "Você copia o seu link de pré-avaliação e envia pelo WhatsApp.", en: "Copy your pre-assessment link and send it on WhatsApp.", es: "Copias tu enlace de preevaluación y lo envías por WhatsApp." } },
    { icon: ShieldCheck, title: { pt: "A decisão é sua", en: "The decision is yours", es: "La decisión es tuya" }, desc: { pt: "A IA organiza e sugere hipóteses; não dá diagnóstico nem decide a conduta.", en: "AI organizes and suggests hypotheses; it doesn't diagnose or decide treatment.", es: "La IA organiza y sugiere hipótesis; no diagnostica ni decide la conducta." } },
  ];
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto max-w-5xl px-4">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl">
          {tx({ pt: "Sem complicação para começar", en: "Nothing complicated to start", es: "Sin complicaciones para empezar" })}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.title.pt} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><i.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="mb-1 font-semibold text-foreground">{tx(i.title)}</h3>
                <p className="text-sm text-muted-foreground">{tx(i.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
