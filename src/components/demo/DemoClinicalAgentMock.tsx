import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Plus, MessageSquare, Sparkles, Dumbbell, ClipboardList,
  UserPlus, BookOpen, Stethoscope, ChevronRight, Send, Lock, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool =
  | { kind: "hep"; title: string; items: string[] }
  | { kind: "tests"; title: string; items: string[] }
  | { kind: "link"; title: string; patient: string }
  | { kind: "evidence"; title: string; refs: string[] };

type Msg = {
  role: "user" | "assistant";
  text: string;
  tool?: Tool;
  suggestions?: string[]; // next user picks
};

type Thread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  patient?: string;
  messages: Msg[];
};

// ───────── Scripted threads (pre-baked history) ─────────
const PREBAKED: Thread[] = [
  {
    id: "t1",
    title: "Lombalgia crônica — Sra. Joana, 58a",
    preview: "HEP fase 2 com progressão de carga…",
    updatedAt: "Hoje, 09:12",
    patient: "Joana M.",
    messages: [
      { role: "user", text: "Paciente com lombalgia crônica há 8 meses, irradiação até glúteo, melhora com extensão. Próximos passos?" },
      {
        role: "assistant",
        text: "Padrão sugestivo de **preferência direcional em extensão** (McKenzie — síndrome derangement posterior). Sugiro confirmar com teste repetido em extensão em pé e prono press-up, e monitorar centralização da dor.",
        tool: { kind: "tests", title: "Testes sugeridos", items: ["Repeated extension in standing (REIS)", "Prone press-up x10", "Slump test", "ODI baseline"] },
      },
      { role: "user", text: "Confirmei centralização. Gera HEP fase inicial." },
      {
        role: "assistant",
        text: "HEP fase 1 baseado em McKenzie + estabilização segmentar. 2x/dia, reavaliar em 7 dias.",
        tool: {
          kind: "hep", title: "HEP gerado — Fase 1 (7 dias)",
          items: ["Prone press-up — 3x10", "Cat-camel — 2x10", "Bird-dog — 3x8/lado", "Marcha estacionária — 3x60s"],
        },
      },
      { role: "user", text: "Após 7 dias melhorou 40%. Progressão?" },
      {
        role: "assistant",
        text: "Excelente resposta. Avançar para **fase 2 com carga progressiva** (HSR-like). Mantém preferência direcional como manutenção.",
        tool: {
          kind: "hep", title: "HEP gerado — Fase 2 (14 dias)",
          items: ["Hip hinge com bastão — 3x10", "Deadlift romeno c/ halter leve — 3x8", "Prancha lateral — 3x30s", "Press-up de manutenção — 1x10"],
        },
        suggestions: ["Quando reavaliar ODI?", "Critérios de alta", "E se a dor voltar?"],
      },
    ],
  },
  {
    id: "t2",
    title: "Tendinopatia patelar — atleta amador",
    preview: "Protocolo HSR de 12 semanas…",
    updatedAt: "Ontem, 18:40",
    patient: "Rafael S.",
    messages: [
      { role: "user", text: "Corredor 32a, dor anterior no joelho ao agachar e descer escada. VISA-P 52." },
      {
        role: "assistant",
        text: "Quadro compatível com **tendinopatia patelar reativa**. Evidência forte para Heavy Slow Resistance (HSR) — Kongsgaard et al. Sugere-se 12 semanas, 3x/semana.",
        tool: { kind: "evidence", title: "Base de evidência (PEDro ≥ 7)", refs: ["Kongsgaard 2009 — HSR vs excêntrico", "Malliaras 2015 — Loading programs review", "JOSPT 2023 — Patellar tendinopathy CPG"] },
      },
      { role: "user", text: "Vincula ao paciente Rafael e gera HEP." },
      {
        role: "assistant",
        text: "Paciente vinculado. HEP semanas 1–4 (carga 70–75% 1RM, 6 reps lentas).",
        tool: { kind: "link", title: "Paciente vinculado", patient: "Rafael S. — Tendinopatia patelar" },
      },
      {
        role: "assistant",
        text: "Programa enviado para o painel do paciente:",
        tool: {
          kind: "hep", title: "HEP — HSR fase 1",
          items: ["Leg press tempo 3-0-3 — 4x6", "Agachamento búlgaro 3-0-3 — 3x6", "Panturrilha unipodal — 3x12", "Alongamento quadríceps — 2x30s"],
        },
        suggestions: ["Como progredir na semana 5?", "Indicador de sobrecarga", "Devo suspender corrida?"],
      },
    ],
  },
  {
    id: "t3",
    title: "Ombro — suspeita de manguito",
    preview: "Bateria de testes especiais sugerida…",
    updatedAt: "2 dias",
    messages: [
      { role: "user", text: "Mulher 47a, dor noturna no ombro D, dificuldade pentear cabelo. Bateria de testes?" },
      {
        role: "assistant",
        text: "Quadro suspeito de **disfunção do manguito rotador**. Sugiro cluster de testes com boa especificidade.",
        tool: { kind: "tests", title: "Cluster sugerido", items: ["Jobe (supraespinhal)", "Lift-off / Belly-press (subescapular)", "Hornblower (redondo menor)", "Hawkins-Kennedy", "Painful arc"] },
      },
      { role: "user", text: "Jobe + e Hawkins +. ODI funcional?" },
      {
        role: "assistant",
        text: "Para ombro, prefiro **DASH** ou **SPADI** como PROM. ODI é para coluna lombar.",
      },
      { role: "user", text: "Ok, gera HEP conservador inicial." },
      {
        role: "assistant",
        text: "HEP conservador — fase analgésica + ativação escapular.",
        tool: {
          kind: "hep", title: "HEP — Ombro fase 1 (10 dias)",
          items: ["Pêndulo Codman — 2x60s", "Retração escapular isométrica — 3x10", "Rotação externa c/ elástico — 3x12", "Serrátil wall slide — 3x10"],
        },
        suggestions: ["Quando iniciar fortalecimento progressivo?", "Critério para encaminhar imagem", "Educação em dor para paciente"],
      },
    ],
  },
  {
    id: "t4",
    title: "Discussão de caso — red flags?",
    preview: "Triagem de bandeiras vermelhas em cervical…",
    updatedAt: "5 dias",
    messages: [
      { role: "user", text: "Paciente 62a, cervicalgia + parestesia em MMSS bilateral, perda de destreza fina. Devo prosseguir?" },
      {
        role: "assistant",
        text: "⚠️ Sinais sugestivos de **mielopatia cervical** (parestesia bilateral + perda de destreza). É **red flag** — recomendo NÃO progredir tratamento e encaminhar para avaliação médica/imagem urgente.",
        tool: { kind: "tests", title: "Testes de mielopatia (se for examinar)", items: ["Hoffmann", "Reflexos hiperativos MMII", "Marcha em tandem", "Lhermitte"] },
      },
      { role: "user", text: "Como justificar o encaminhamento no prontuário?" },
      {
        role: "assistant",
        text: "Sugestão de redação: *\"Identificadas bandeiras vermelhas para mielopatia cervical (parestesia bilateral em MMSS, perda de destreza fina). Conduta: suspensão da terapia manual cervical e encaminhamento imediato para avaliação neurocirúrgica com RM de coluna cervical.\"*",
      },
      { role: "user", text: "Existe evidência sobre atraso diagnóstico?" },
      {
        role: "assistant",
        text: "Sim, atraso no diagnóstico de mielopatia cervical degenerativa está associado a pior recuperação funcional pós-cirúrgica.",
        tool: { kind: "evidence", title: "Referências", refs: ["Fehlings 2017 — AOSpine CSM guidelines", "Tetreault 2015 — Predictors of outcome in DCM"] },
        suggestions: ["Modelo de carta de encaminhamento", "Como reavaliar pós-cirurgia?", "Outros red flags em cervical"],
      },
    ],
  },
];

// ───────── New-conversation suggestion cascades ─────────
type Cascade = { topic: string; steps: Msg[] };

const NEW_CASCADES: Cascade[] = [
  {
    topic: "Paciente com dor no joelho ao correr",
    steps: [
      {
        role: "assistant",
        text: "Ótimo. Para refinar o raciocínio, me conta: dor é **anterior, medial, lateral ou posterior**? E aparece logo no início ou após determinada distância?",
      },
      { role: "user", text: "Anterior, aparece após 3km e piora descendo." },
      {
        role: "assistant",
        text: "Padrão clássico de sobrecarga femoropatelar. Sugiro avaliar **controle de quadril** e **carga de treino**.",
        tool: { kind: "tests", title: "Testes sugeridos", items: ["Single leg squat", "Step-down test", "Y-balance", "Hip abduction strength (dinamômetro)"] },
      },
      { role: "user", text: "Single leg squat com valgo dinâmico evidente." },
      {
        role: "assistant",
        text: "Confirma hipótese de **dor femoropatelar com déficit de controle proximal**. Gera HEP focado em quadril + gestão de carga.",
        tool: {
          kind: "hep", title: "HEP — 4 semanas",
          items: ["Ponte unilateral — 3x10", "Clamshell c/ elástico — 3x15", "Step-down lento — 3x8", "Reduzir volume de corrida em 30%"],
        },
        suggestions: ["Critério de retorno à corrida", "E se a dor não ceder?", "Sugere outro PROM?"],
      },
    ],
  },
  {
    topic: "Gerar HEP de estabilização lombar",
    steps: [
      {
        role: "assistant",
        text: "Para qual fase? **Inicial** (controle motor), **intermediária** (resistência) ou **avançada** (força com carga)?",
      },
      { role: "user", text: "Inicial. Paciente sedentário, sem dor irradiada." },
      {
        role: "assistant",
        text: "HEP de controle motor, baixa carga, 2x/dia.",
        tool: {
          kind: "hep", title: "HEP — Estabilização fase 1",
          items: ["Respiração diafragmática — 2x10", "Bracing abdominal supino — 3x10", "Bird-dog — 3x8/lado", "Glute bridge — 3x12"],
        },
      },
      { role: "user", text: "Quero vincular ao paciente Carlos." },
      {
        role: "assistant",
        text: "Paciente vinculado e programa enviado ao painel dele.",
        tool: { kind: "link", title: "Paciente vinculado", patient: "Carlos R. — Lombalgia mecânica" },
        suggestions: ["Progressão para fase 2", "Como medir adesão?", "Educação em dor para paciente"],
      },
    ],
  },
  {
    topic: "Quais testes para suspeita de lesão de LCA?",
    steps: [
      {
        role: "assistant",
        text: "Cluster com melhor acurácia para LCA combina três testes. Há derrame articular agudo?",
        tool: { kind: "tests", title: "Cluster sugerido", items: ["Lachman (mais sensível)", "Pivot shift (mais específico)", "Gaveta anterior", "Avaliar derrame (sulco patelar)"] },
      },
      { role: "user", text: "Sim, derrame moderado. Lachman positivo." },
      {
        role: "assistant",
        text: "Alta probabilidade de lesão de LCA. **Conduta inicial:** controle de edema, recuperação de ADM e ativação do quadríceps antes de qualquer decisão cirúrgica.",
        tool: { kind: "evidence", title: "Evidência", refs: ["Filbay & Grindem 2019 — ACL rehab", "JOSPT 2017 — ACL CPG"] },
      },
      { role: "user", text: "Gera HEP pré-operatório." },
      {
        role: "assistant",
        text: "HEP pré-op (\"prehab\") — foco em ADM, quadríceps e propriocepção.",
        tool: {
          kind: "hep", title: "HEP — Prehab LCA (3 semanas)",
          items: ["Extensão passiva c/ toalha — 3x60s", "Quad sets isométrico — 4x10s x10", "SLR — 3x10", "Mini squat 0-45° — 3x10", "Bike estacionária sem carga — 10 min"],
        },
        suggestions: ["Critérios para retorno ao esporte", "PROM ideal para LCA", "Diferença entre cirúrgico e conservador"],
      },
    ],
  },
  {
    topic: "Educação em dor para paciente crônico",
    steps: [
      {
        role: "assistant",
        text: "Educação em neurociência da dor (PNE) tem evidência forte para dor crônica. Que linguagem o paciente usa para descrever a dor?",
      },
      { role: "user", text: "Diz que sente \"como se a coluna fosse quebrar\"." },
      {
        role: "assistant",
        text: "Linguagem catastrofizante — alvo importante. Sugiro 3 conceitos centrais nas próximas sessões: **dor ≠ dano**, **sensibilização central** e **segurança do movimento**.",
        tool: { kind: "evidence", title: "Referências", refs: ["Moseley & Butler 2015 — Explain Pain", "Louw 2016 — PNE systematic review"] },
      },
      { role: "user", text: "Material para enviar ao paciente?" },
      {
        role: "assistant",
        text: "Posso gerar um resumo em linguagem acessível, com 5 mensagens-chave e analogias (alarme de incêndio, sistema de proteção).",
        suggestions: ["Gerar resumo agora", "Como medir crenças?", "Combinar com exercício?"],
      },
    ],
  },
];

// ───────── Scripted replies to follow-up suggestions ─────────
// Each suggestion gets a real, specific answer; then a farewell with PRO CTA closes the loop.
const SCRIPTED_REPLIES: Record<string, Msg> = {
  // t1 — Lombalgia
  "Quando reavaliar ODI?": {
    role: "assistant",
    text: "Reavalie o **ODI a cada 4 semanas**. Diferença mínima clinicamente importante: **10 pontos**. Combine com NPRS e teste de centralização para decidir progressão.",
  },
  "Critérios de alta": {
    role: "assistant",
    text: "Critérios sugeridos: **ODI < 20%**, NPRS ≤ 2/10 nas AVDs, retorno completo às atividades funcionais e **autogestão** demonstrada (paciente sabe regredir/progredir HEP sozinho).",
  },
  "E se a dor voltar?": {
    role: "assistant",
    text: "Recidiva leve: **regredir 1 fase** do HEP por 5–7 dias + reforçar preferência direcional. Se piora >50% ou novo sintoma neurológico, reavaliação presencial imediata.",
  },
  // t2 — Tendinopatia patelar
  "Como progredir na semana 5?": {
    role: "assistant",
    text: "Semana 5–8: aumentar para **80–85% 1RM, 4x6 reps**, tempo 3-0-3 mantido. Introduzir agachamento com barra. Monitorar dor 24h pós-treino (regra do <3/10).",
  },
  "Indicador de sobrecarga": {
    role: "assistant",
    text: "Sinais: **dor >5/10 durante exercício**, dor matinal aumentando >2 pontos, ou piora funcional progressiva por 3 sessões. Reduzir carga em 20% e reavaliar.",
  },
  "Devo suspender corrida?": {
    role: "assistant",
    text: "Não suspender totalmente. **Reduzir volume em 30–50%** e manter terreno plano. Suspender apenas se dor durante corrida >3/10 ou claudicação.",
  },
  // t3 — Ombro
  "Quando iniciar fortalecimento progressivo?": {
    role: "assistant",
    text: "Quando: **dor noturna ausente**, ADM ativa indolor >120° de flexão e teste isométrico de RE indolor a 30°. Tipicamente 2–3 semanas na fase analgésica.",
  },
  "Critério para encaminhar imagem": {
    role: "assistant",
    text: "Encaminhar **USG/RM** se: trauma agudo com fraqueza significativa, ausência de progresso após 6 semanas de conservador, ou suspeita de ruptura completa (drop arm +).",
  },
  "Educação em dor para paciente": {
    role: "assistant",
    text: "Mensagens-chave: **dor ≠ dano tecidual**, movimento é seguro e necessário, sono e estresse modulam dor. Use analogias (sistema de alarme calibrado).",
  },
  // t4 — Red flags cervical
  "Modelo de carta de encaminhamento": {
    role: "assistant",
    text: "*\"Encaminho a/o paciente [nome], [idade] anos, com quadro de cervicalgia associada a parestesia bilateral em MMSS e perda de destreza fina, sugestivos de **mielopatia cervical degenerativa**. Solicito avaliação neurocirúrgica com **RM de coluna cervical** em caráter de urgência. Terapia manual cervical suspensa. À disposição.\"*",
  },
  "Como reavaliar pós-cirurgia?": {
    role: "assistant",
    text: "Pós-op: aguardar liberação do cirurgião (geralmente 4–6 sem). Reavaliar **mJOA**, **Nurick** e testes de marcha. Reabilitação focada em propriocepção cervical, equilíbrio e força de MMSS progressiva.",
  },
  "Outros red flags em cervical": {
    role: "assistant",
    text: "Sinais de alerta cervical: **drop attack**, disfagia/disartria, nistagmo, ataxia, **5 D's e 3 N's** (insuficiência vertebrobasilar), febre + dor noturna constante (infecção/neoplasia), trauma de alto impacto.",
  },
  // cascade tails
  "Critério de retorno à corrida": {
    role: "assistant",
    text: "Critérios: **single leg squat sem valgo**, salto unipodal indolor x10, força de abdutores ≥85% do contralateral e ausência de dor nas AVDs. Retorno gradual com **regra dos 10%/semana**.",
  },
  "E se a dor não ceder?": {
    role: "assistant",
    text: "Após 6 semanas sem melhora: reavaliar hipótese (descartar plica, condromalácia grau III, Hoffa), considerar **USG/RM**, e investigar fatores psicossociais (catastrofização, cinesiofobia).",
  },
  "Sugere outro PROM?": {
    role: "assistant",
    text: "Para dor femoropatelar: **KOOS-PF** (específico) ou **AKPS/Kujala**. Combine com NPRS para dor e escala de cinesiofobia (TSK-11) se suspeitar de medo do movimento.",
  },
  "Progressão para fase 2": {
    role: "assistant",
    text: "Fase 2 (resistência, 3–6 sem): bird-dog dinâmico 3x12, prancha lateral 3x30s, dead bug com carga, ponte unipodal 3x10. Frequência 4–5x/sem.",
  },
  "Como medir adesão?": {
    role: "assistant",
    text: "Use o **HEP no app** (registro automático) + autorreporte semanal. Meta: ≥80% das sessões. Se <60%, conversar sobre barreiras (tempo, dor, motivação) e simplificar o programa.",
  },
  "Critérios para retorno ao esporte": {
    role: "assistant",
    text: "Pós-LCA: **≥9 meses**, LSI ≥90% em força de quadríceps, bateria de saltos (hop tests) ≥90%, ACL-RSI ≥65 e ausência de derrame. Retorno faseado com treino de agilidade.",
  },
  "PROM ideal para LCA": {
    role: "assistant",
    text: "**KOOS** (5 subescalas) + **IKDC** subjetivo são padrão-ouro. Adicionar **ACL-RSI** para prontidão psicológica antes do retorno ao esporte.",
  },
  "Diferença entre cirúrgico e conservador": {
    role: "assistant",
    text: "Evidência atual (KANON, Frobell): em pacientes não-atletas, **reabilitação inicial + cirurgia tardia se necessário** tem resultados equivalentes a cirurgia precoce. Decisão compartilhada considerando demanda esportiva e instabilidade funcional.",
  },
  "Gerar resumo agora": {
    role: "assistant",
    text: "**Resumo para o paciente:**\n• Sua dor é real, mas **não significa dano novo**.\n• O sistema nervoso pode ficar 'mais sensível' — como um alarme calibrado demais.\n• **Movimento é remédio**, mesmo quando dói um pouco.\n• Sono, estresse e humor mudam a percepção de dor.\n• Progresso vem em ondas — recaídas são normais.",
  },
  "Como medir crenças?": {
    role: "assistant",
    text: "Use **PCS** (catastrofização), **TSK-11** (cinesiofobia) e **PSEQ** (autoeficácia). Reavalie a cada 4–6 semanas — mudança nessas escalas costuma preceder melhora funcional.",
  },
  "Combinar com exercício?": {
    role: "assistant",
    text: "Sim — **PNE + exercício graduado** tem efeito superior a qualquer um isolado. Use exposição gradual a movimentos temidos e reforce sucessos com feedback positivo durante a sessão.",
  },
};

const FAREWELL_MSG: Msg = {
  role: "assistant",
  text: "👀 Esta foi uma simulação. No modo real, eu cruzaria estes pontos com o **histórico do paciente** e a **base de evidências PEDro ≥ 7** atualizada, gerando HEP/testes prontos para o painel. **Assine PRO** para usar com seus pacientes reais.",
};


// ───────── UI ─────────
function ToolCard({ tool }: { tool: Tool }) {
  const base = "mt-2 rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5";
  if (tool.kind === "hep") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Dumbbell className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
          {tool.items.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      </div>
    );
  }
  if (tool.kind === "tests") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <ClipboardList className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
          {tool.items.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      </div>
    );
  }
  if (tool.kind === "link") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <UserPlus className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <div className="text-muted-foreground">{tool.patient}</div>
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <BookOpen className="h-3.5 w-3.5 text-primary" /> {tool.title}
      </div>
      <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
        {tool.refs.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}

const DemoClinicalAgentMock = () => {
  const [threads, setThreads] = useState<Thread[]>(PREBAKED);
  const [activeId, setActiveId] = useState<string>(PREBAKED[0].id);
  const [isNew, setIsNew] = useState(false);
  const [pending, setPending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => threads.find((t) => t.id === activeId), [threads, activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, isNew]);

  const openThread = (id: string) => {
    setActiveId(id);
    setIsNew(false);
    setMobileView("chat");
  };

  const startNew = () => {
    const id = `new-${Date.now()}`;
    const thread: Thread = {
      id, title: "Nova conversa", preview: "—", updatedAt: "agora",
      messages: [{
        role: "assistant",
        text: "Olá! Sou o **Agente de Raciocínio Clínico** da Aliv.iA. Posso discutir casos (com anonimização automática), sugerir testes, gerar HEP baseado em evidências e vincular pacientes. Por onde quer começar?",
        suggestions: NEW_CASCADES.map((c) => c.topic),
      }],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveId(id);
    setIsNew(true);
    setMobileView("chat");
  };

  const pickSuggestion = (text: string) => {
    if (!active || pending) return;
    setPending(true);

    // For new conversations, drive through NEW_CASCADES. For prebaked threads, suggestion just appends a polite closing.
    const cascade = NEW_CASCADES.find((c) => c.topic === text);

    // Append user message immediately
    setThreads((prev) => prev.map((t) => t.id === active.id
      ? { ...t, title: t.title === "Nova conversa" ? text.slice(0, 60) : t.title, messages: [...t.messages, { role: "user", text }] }
      : t));

    if (cascade) {
      // Play cascade steps with delays
      cascade.steps.forEach((step, idx) => {
        setTimeout(() => {
          setThreads((prev) => prev.map((t) => t.id === active.id
            ? { ...t, messages: [...t.messages, step] }
            : t));
          if (idx === cascade.steps.length - 1) setPending(false);
        }, 700 * (idx + 1));
      });
    } else {
      setTimeout(() => {
        setThreads((prev) => prev.map((t) => t.id === active.id
          ? {
              ...t,
              messages: [...t.messages, {
                role: "assistant",
                text: "👀 Esta é uma simulação do agente. No modo real, eu acessaria o histórico do paciente, evidência atualizada (PEDro ≥ 7) e geraria HEP/testes prontos para o painel. Assine PRO para usar com seus pacientes reais.",
              }],
            }
          : t));
        setPending(false);
      }, 900);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Agente de Raciocínio Clínico</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Simulação · respostas roteirizadas para demonstração
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px]">
            Modo demo
          </Badge>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] min-h-[520px]">
          {/* Sidebar */}
          <aside className={cn(
            "md:border-r md:border-b-0 border-b bg-muted/10",
            mobileView === "chat" ? "hidden md:block" : "block"
          )}>
            <div className="p-3">
              <Button onClick={startNew} className="w-full gap-1.5 rounded-xl" size="sm">
                <Plus className="h-3.5 w-3.5" /> Nova conversa
              </Button>
            </div>
            <ScrollArea className="h-[420px] md:h-[460px]">
              <div className="px-2 pb-3 space-y-1">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openThread(t.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors",
                      t.id === activeId ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-foreground line-clamp-1">
                      <MessageSquare className="h-3 w-3 shrink-0" /> {t.title}
                    </div>
                    <div className="line-clamp-1 mt-0.5 pl-4">{t.preview}</div>
                    <div className="pl-4 mt-0.5 text-[10px] opacity-70">{t.updatedAt}{t.patient ? ` · ${t.patient}` : ""}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat */}
          <section className={cn(
            "flex flex-col",
            mobileView === "list" ? "hidden md:flex" : "flex"
          )}>
            {/* Mobile chat header with back */}
            <div className="md:hidden flex items-center gap-2 border-b bg-muted/20 px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="h-7 gap-1 px-2 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Conversas
              </Button>
              <span className="text-xs font-medium text-foreground line-clamp-1 flex-1">
                {active?.title}
              </span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[460px]">
              {active?.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/50 text-foreground rounded-bl-sm"
                  )}>
                    <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{
                      __html: m.text
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                    }} />
                    {m.tool && <ToolCard tool={m.tool} />}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.suggestions.map((s, k) => (
                          <button
                            key={k}
                            disabled={pending}
                            onClick={() => pickSuggestion(s)}
                            className="text-[11px] inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2.5 py-1 text-foreground hover:bg-primary/5 disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3 text-primary" /> {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-muted-foreground italic">
                    Pensando<span className="animate-pulse">…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fake composer */}
            <div className="border-t bg-background p-3">
              <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 opacity-70">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">
                  {isNew || pending
                    ? "Clique numa sugestão acima para simular a conversa…"
                    : "Composer desabilitado no demo · use as sugestões para emular a conversa"}
                </span>
                <Button size="icon" variant="ghost" disabled className="h-7 w-7">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <ChevronRight className="h-3 w-3" /> No modo real, o agente acessa o histórico do paciente, evidência atualizada e gera HEP prontos para envio.
              </p>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoClinicalAgentMock;
