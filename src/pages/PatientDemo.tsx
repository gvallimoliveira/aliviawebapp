import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Sparkles, Crown, ArrowLeft, HelpCircle, User, Activity,
  Flame, Calendar, MapPin, ChevronRight, CheckCircle2, FileText, Dumbbell,
  Info, TrendingDown, Users, Lock, Trophy, Stethoscope, AlertCircle, Brain,
  ShieldCheck, Target, ClipboardCheck, Heart, MessageCircle, Send,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { setSeo } from "@/lib/seo";

// ── Mock data: 3 assessments, lombalgia radicular ciática c/ componente miofascial ──
const DEMO_ASSESSMENTS = [
  {
    id: "demo-pa-1",
    label: "Avaliação inicial",
    type: "premium",
    created_at: "2026-03-12T10:00:00Z",
    status: "completed",
    pain_score: 8,
    pain_regions: ["lower_back", "right_gluteal", "right_hamstring", "right_calf"],
    hypothesis: "Lombalgia radicular L5-S1 à direita com irritação do ciático e componente miofascial em glúteo médio e piriforme",
    confidence: "Alta",
    odi: 52,
    sf36: 38,
    redFlags: false,
    anamnesis: {
      onset: "Há ~6 semanas após levantar caixa pesada no trabalho",
      character: "Queimação irradiando da lombar até panturrilha direita; piora ao sentar >20min",
      aggravators: "Sentar, tossir/espirrar, fletir tronco",
      relievers: "Decúbito dorsal com joelhos fletidos; analgésico esporádico",
      sleep: "Acorda 2-3x/noite por desconforto",
      goals: "Voltar a treinar musculação e dormir a noite toda",
    },
    tests: [
      { name: "Lasègue (SLR) direito", result: "Positivo a 35°", flag: "positive" as const },
      { name: "Slump test", result: "Positivo — reproduz parestesia", flag: "positive" as const },
      { name: "Palpação piriforme D.", result: "Trigger point ativo", flag: "positive" as const },
      { name: "Força flexores dorsais (L5)", result: "4/5", flag: "warning" as const },
    ],
    questionnaires: [
      { name: "ODI (Oswestry)", score: 52, severity: "Incapacidade grave", color: "text-destructive" },
      { name: "SF-36 (QV)", score: 38, severity: "Comprometida", color: "text-destructive" },
      { name: "STarT Back", score: 7, severity: "Risco alto de cronificação", color: "text-destructive" },
      { name: "PSEQ (autoeficácia)", score: 22, severity: "Baixa", color: "text-amber-600" },
    ],
    plan: [
      "Fase 1 (S1-2): controle de dor — neurodinâmica suave + educação em dor",
      "Liberação miofascial piriforme/glúteo médio 2x/sem",
      "Reeducação postural sentado + pausas a cada 25min",
      "Reavaliar em 4 semanas",
    ],
  },
  {
    id: "demo-pa-2",
    label: "Reavaliação intermediária",
    type: "premium",
    created_at: "2026-04-15T10:00:00Z",
    status: "completed",
    pain_score: 5,
    pain_regions: ["lower_back", "right_gluteal"],
    hypothesis: "Lombalgia radicular em remissão parcial — persistência de dor miofascial em glúteo direito",
    confidence: "Alta",
    odi: 28,
    sf36: 64,
    redFlags: false,
    anamnesis: {
      onset: "Evolução de ~10 semanas — irradiação distal cessou há 2 sem",
      character: "Dor lombar mecânica + desconforto profundo em glúteo D.",
      aggravators: "Ficar em pé >40min, subir escadas",
      relievers: "Alongamento de piriforme e exercícios prescritos",
      sleep: "Dorme a noite toda em 5/7 dias",
      goals: "Retomar corrida leve",
    },
    tests: [
      { name: "Lasègue direito", result: "Negativo até 70°", flag: "ok" as const },
      { name: "Slump test", result: "Tensão leve sem parestesia", flag: "warning" as const },
      { name: "Palpação piriforme D.", result: "Sensibilidade reduzida", flag: "warning" as const },
      { name: "Força flexores dorsais", result: "5/5", flag: "ok" as const },
    ],
    questionnaires: [
      { name: "ODI (Oswestry)", score: 28, severity: "Incapacidade moderada", color: "text-amber-600" },
      { name: "SF-36 (QV)", score: 64, severity: "Em recuperação", color: "text-amber-600" },
      { name: "STarT Back", score: 4, severity: "Risco médio", color: "text-amber-600" },
      { name: "PSEQ (autoeficácia)", score: 42, severity: "Moderada", color: "text-amber-600" },
    ],
    plan: [
      "Fase 2 (S3-6): fortalecimento progressivo — core + glúteo médio",
      "Introduzir caminhada 20-30min/dia",
      "Manter HEP diário; aumentar carga gradual",
      "Reavaliar em 4 semanas",
    ],
  },
  {
    id: "demo-pa-3",
    label: "Reavaliação de alta",
    type: "premium",
    created_at: "2026-05-20T10:00:00Z",
    status: "completed",
    pain_score: 2,
    pain_regions: ["lower_back"],
    hypothesis: "Quadro em fase final de recuperação — dor residual lombar leve em sobrecarga prolongada",
    confidence: "Alta",
    odi: 10,
    sf36: 86,
    redFlags: false,
    anamnesis: {
      onset: "Quadro estável há 4 semanas, sem episódios de irradiação",
      character: "Desconforto lombar leve apenas após esforço prolongado",
      aggravators: "Treino pesado de membros inferiores sem aquecimento",
      relievers: "Descanso curto, mobilidade lombar",
      sleep: "Sem queixas",
      goals: "Manutenção e prevenção de recidiva",
    },
    tests: [
      { name: "Lasègue direito", result: "Negativo", flag: "ok" as const },
      { name: "Slump test", result: "Negativo", flag: "ok" as const },
      { name: "Bridge unilateral D.", result: "12 reps simétricas", flag: "ok" as const },
      { name: "Squat funcional", result: "Sem dor, boa simetria", flag: "ok" as const },
    ],
    questionnaires: [
      { name: "ODI (Oswestry)", score: 10, severity: "Incapacidade mínima", color: "text-emerald-600" },
      { name: "SF-36 (QV)", score: 86, severity: "Boa", color: "text-emerald-600" },
      { name: "STarT Back", score: 1, severity: "Risco baixo", color: "text-emerald-600" },
      { name: "PSEQ (autoeficácia)", score: 56, severity: "Alta", color: "text-emerald-600" },
    ],
    plan: [
      "Fase 3 (S7-10): retorno ao esporte — progressão para corrida e musculação plena",
      "Manutenção: HEP 3x/sem + 1 sessão quinzenal de reavaliação",
      "Educação em prevenção de recidiva e ergonomia",
      "Alta clínica programada",
    ],
  },
];

type DemoAssessment = typeof DEMO_ASSESSMENTS[number];

const DEMO_DIARY = (() => {
  const arr: { date: string; score: number }[] = [];
  const today = new Date();
  // 14 dias com tendência de melhora
  const pattern = [4, 5, 4, 3, 4, 3, 3, 2, 3, 2, 2, 1, 2, 1];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push({
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      score: pattern[13 - i],
    });
  }
  return arr;
})();

const DEMO_HEP = [
  { id: "h1", name: "Mobilização neural do ciático (slump nerve glide)", sets: "3", reps: "10", frequency: "2x/dia" },
  { id: "h2", name: "Liberação miofascial do piriforme com bola", sets: "1", reps: "90s", frequency: "1x/dia" },
  { id: "h3", name: "Ponte com ativação de glúteo médio", sets: "3", reps: "12", frequency: "1x/dia" },
  { id: "h4", name: "Cat-camel (mobilidade lombar)", sets: "2", reps: "10", frequency: "1x/dia" },
  { id: "h5", name: "Prancha frontal com retração de quadril", sets: "3", reps: "30s", frequency: "1x/dia" },
];

const painRegionLabels: Record<string, string> = {
  lower_back: "Lombar",
  right_gluteal: "Glúteo D.",
  right_hamstring: "Posterior Coxa D.",
  right_calf: "Panturrilha D.",
};

const SimpleDiaryChart = ({ data }: { data: { date: string; score: number }[] }) => {
  const { areaPath, linePath, labels, points, width, height, yLines } = useMemo(() => {
    const width = 600;
    const height = 180;
    const paddingX = 18;
    const paddingTop = 16;
    const paddingBottom = 20;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingTop - paddingBottom;
    const maxScore = 10;
    const safeDivisor = Math.max(data.length - 1, 1);

    const points = data.map((entry, index) => {
      const x = paddingX + (index / safeDivisor) * innerWidth;
      const y = paddingTop + ((maxScore - entry.score) / maxScore) * innerHeight;
      return { ...entry, x, y };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");

    const lastPoint = points[points.length - 1] ?? { x: width - paddingX, y: height - paddingBottom };
    const firstPoint = points[0] ?? { x: paddingX, y: height - paddingBottom };

    const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${firstPoint.x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`;

    const labels = [0, Math.floor(safeDivisor / 3), Math.floor((safeDivisor * 2) / 3), safeDivisor]
      .map((index) => data[index]?.date)
      .filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

    const yLines = [0, 5, 10].map((score) => ({
      score,
      y: paddingTop + ((maxScore - score) / maxScore) * innerHeight,
    }));

    return { areaPath, linePath, labels, points, width, height, yLines };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[180px] w-full"
          role="img"
          aria-label="Gráfico da evolução da dor nos últimos 14 dias"
        >
          {yLines.map((line) => (
            <g key={line.score}>
              <line
                x1="18"
                x2={width - 18}
                y1={line.y}
                y2={line.y}
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
              />
              <text x="8" y={line.y + 4} fontSize="10" fill="hsl(var(--muted-foreground))">
                {line.score}
              </text>
            </g>
          ))}

          <path d={areaPath} fill="hsl(var(--primary))" opacity="0.12" />
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
};

const PatientDemo = () => {
  const navigate = useNavigate();
  const [assessmentDialog, setAssessmentDialog] = useState<"basic" | "premium" | null>(null);
  const [findProDialog, setFindProDialog] = useState(false);
  const [openAssessment, setOpenAssessment] = useState<DemoAssessment | null>(null);
  const [hepChecked, setHepChecked] = useState<Set<string>>(new Set(["h1", "h3"]));
  const [diaryToday, setDiaryToday] = useState(2);

  useEffect(() => {
    setSeo({
      title: "Demo Premium — Aliv.iA",
      description: "Veja como funciona o painel Premium do paciente Aliv.iA com avaliações, diário de dor e exercícios.",
      url: `${window.location.origin}/para-pacientes/demo`,
      type: "website",
    });
  }, []);

  const goSubscribe = () => navigate("/para-pacientes#planos");
  const goBasic = () => navigate("/para-pacientes#avaliacao");

  const streak = 9; // dias seguidos

  const toggleHep = (id: string) => {
    setHepChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/para-pacientes")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] gap-1">
              Demo Premium
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} className="hidden md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/para-pacientes")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair do demo</span>
            </Button>
            <Button size="sm" onClick={goSubscribe} className="gap-1.5 rounded-xl">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assinar Premium</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4 space-y-6 max-w-4xl">
        {/* Welcome */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  Mariana Silva (Demo)
                  <Badge className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 gap-1">
                    <Crown className="h-3 w-3" /> Premium Mensal
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                    Modo simulado
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  3 avaliações realizadas · Acompanhamento de lombalgia radicular ciática
                </p>
              </div>
            </div>
            <Button size="sm" onClick={goSubscribe} className="rounded-xl gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Assinar Premium
            </Button>
          </CardContent>
        </Card>

        {/* Demo info banner */}
        <Card className="border-amber-300/40 bg-amber-50/40">
          <CardContent className="py-4 px-5 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900/80">
              Esta é uma demonstração interativa do painel Premium do paciente.
              Os dados abaixo são fictícios e ilustram o acompanhamento de um caso real
              de <strong>lombalgia radicular com disfunção do ciático e componente miofascial</strong> ao longo de 3 avaliações.
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Minha Saúde + Mensagens (espelha o app real do paciente) */}
        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="health" className="gap-1.5">
              <Heart className="h-4 w-4" /> Minha Saúde
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 relative">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-semibold">1</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">

        {/* Evolução resumida */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-5 w-5 text-emerald-600" />
              Evolução do quadro clínico
            </CardTitle>
            <CardDescription>Compare seus resultados ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dor (EVA)", values: [8, 5, 2], unit: "/10", color: "text-destructive" },
                { label: "Incapacidade (ODI)", values: [52, 28, 10], unit: "%", color: "text-amber-600" },
                { label: "Qualidade de vida (SF-36)", values: [38, 64, 86], unit: "%", color: "text-emerald-600" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-border/60 p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-xs text-muted-foreground line-through">{m.values[0]}{m.unit}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-lg font-bold ${m.color}`}>{m.values[2]}{m.unit}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">3 avaliações · ~10 semanas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions (avaliação) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => setAssessmentDialog("basic")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                  <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                Nova avaliação básica
              </CardTitle>
              <CardDescription className="text-sm">Triagem rápida e gratuita da sua dor</CardDescription>
            </CardHeader>
          </Card>
          <Card
            className="cursor-pointer border-primary/20 hover:border-primary/50 hover:shadow-md transition-all group bg-primary/[0.03]"
            onClick={() => setAssessmentDialog("premium")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                Nova avaliação Premium
              </CardTitle>
              <CardDescription className="text-sm">Diagnóstico aprofundado, PDF clínico, plano de tratamento</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Find professional CTA (mock click) */}
        <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => setFindProDialog(true)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              Encontre um fisioterapeuta parceiro
            </CardTitle>
            <CardDescription className="text-sm">Profissionais verificados, próximos a você (recurso Premium)</CardDescription>
          </CardHeader>
        </Card>

        {/* HEP / Exercise checklist */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
            Meu programa de exercícios (HEP)
          </h2>

          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="py-3 px-4 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Como funciona no app real:</strong> esta série
                de exercícios é prescrita por um <strong>fisioterapeuta parceiro Aliv.iA</strong> durante seu
                atendimento. O profissional monta o programa personalizado e você o recebe aqui no
                seu painel para acompanhar diariamente e marcar a evolução. Os exercícios abaixo são
                um exemplo do que seria prescrito para o caso clínico desta demo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Programa: Reabilitação ciatalgia direita</CardTitle>
                  <CardDescription className="text-xs">Prescrito por Dr. Demo · Atualizado há 5 dias</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Trophy className="h-3 w-3" /> {hepChecked.size}/{DEMO_HEP.length}
                </Badge>
              </div>
              <Progress value={(hepChecked.size / DEMO_HEP.length) * 100} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_HEP.map((ex) => {
                const done = hepChecked.has(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleHep(ex.id)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      done ? "bg-emerald-50/50 border-emerald-200" : "border-border/60 hover:border-border"
                    }`}
                  >
                    <Checkbox checked={done} className="mt-0.5 pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {ex.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ex.sets} séries · {ex.reps} reps · {ex.frequency}
                      </p>
                    </div>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Pain Diary */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Diário de dor
          </h2>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-500" />
                  <div>
                    <p className="text-lg font-bold text-orange-500">{streak} dias</p>
                    <p className="text-xs text-muted-foreground">Sequência atual</p>
                  </div>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Esta semana</span>
                    <span className="font-medium">6/7</span>
                  </div>
                  <Progress value={(6 / 7) * 100} className="h-2" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Continue assim — sua constância está pagando dividendos clínicos!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Como está sua dor hoje?</span>
                  <span className={`text-2xl font-bold ${diaryToday <= 3 ? "text-emerald-600" : diaryToday <= 6 ? "text-amber-500" : "text-destructive"}`}>
                    {diaryToday}/10
                  </span>
                </div>
                <Slider value={[diaryToday]} onValueChange={([v]) => setDiaryToday(v)} min={0} max={10} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Sem dor</span>
                  <span>Pior dor possível</span>
                </div>
              </div>
              <Button size="sm" onClick={() => setAssessmentDialog("basic")} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Registrar hoje
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Evolução (14 dias)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <SimpleDiaryChart data={DEMO_DIARY} />
            </CardContent>
          </Card>
        </div>

        {/* Histórico */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Histórico de avaliações
          </h2>
          <div className="space-y-3">
            {DEMO_ASSESSMENTS.map((a) => {
              const regions = a.pain_regions.map((r) => painRegionLabels[r] || r);
              return (
                <Card
                  key={a.id}
                  className="hover:shadow-md transition-all border-border/60 hover:border-border group cursor-pointer"
                  onClick={() => setOpenAssessment(a)}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                              Premium
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Concluída
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{a.hypothesis}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {regions.map((r, i) => (
                            <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">• Dor: {a.pain_score}/10 · ODI: {a.odi}%</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <CardContent className="py-8 text-center space-y-4">
            <Crown className="h-10 w-10 text-primary mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Pronto para entender sua dor de verdade?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Crie sua conta gratuitamente e comece pela avaliação básica.
                Faça upgrade para o Premium quando quiser acompanhar sua evolução completa.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button variant="outline" onClick={goBasic} className="rounded-xl">
                Fazer avaliação básica grátis
              </Button>
              <Button onClick={goSubscribe} className="rounded-xl gap-1.5">
                <Crown className="h-4 w-4" /> Assinar Premium
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Mensagens (demo) */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="border-amber-300/40 bg-amber-50/40">
              <CardContent className="py-4 px-5 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900/80">
                  No app real, você troca mensagens diretamente com o <strong>fisioterapeuta parceiro</strong> que acompanha seu caso — tire dúvidas sobre exercícios, relate sintomas e receba orientações entre as consultas.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" /> Conversa com Dr. Demo
                </CardTitle>
                <CardDescription className="text-xs">Fisioterapeuta responsável · Online há 5 min</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2.5">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                      <p className="text-sm text-foreground">Oi Mariana! Como foi a série de exercícios esta semana?</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Dr. Demo · há 2 dias</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20 px-3.5 py-2">
                      <p className="text-sm text-foreground">Consegui fazer 5 dias! A dor irradiada melhorou bastante 🙌</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Você · há 2 dias</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                      <p className="text-sm text-foreground">Excelente! Vou liberar a próxima fase do programa. Já está disponível na aba <strong>Minha Saúde</strong>.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Dr. Demo · há 1 dia</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <input
                    disabled
                    placeholder="Digite uma mensagem... (disponível na assinatura Premium)"
                    className="flex-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                  />
                  <Button size="icon" disabled className="rounded-xl shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/[0.03]">
              <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <p className="text-sm text-foreground">Mensagens com fisioterapeutas é um recurso <strong>Premium</strong>.</p>
                </div>
                <Button size="sm" onClick={goSubscribe} className="rounded-xl gap-1.5">
                  <Crown className="h-3.5 w-3.5" /> Assinar Premium
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Assessment intercept dialog */}
      <Dialog open={!!assessmentDialog} onOpenChange={(o) => !o && setAssessmentDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {assessmentDialog === "premium" ? "Avaliação Premium" : "Avaliação básica"}
            </DialogTitle>
            <DialogDescription className="text-center pt-1">
              Você está no <strong>modo demonstração</strong>. Para iniciar uma avaliação real:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Avaliação básica (gratuita)</p>
                <p className="text-xs text-muted-foreground">
                  Acesse pela landing page e faça sua triagem inicial sem custo.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Avaliação Premium</p>
                <p className="text-xs text-muted-foreground">
                  Diagnóstico aprofundado, plano de tratamento, diário de dor e comparativo de evolução —
                  disponível com a assinatura Premium.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setAssessmentDialog(null); goBasic(); }} className="rounded-xl">
              Iniciar avaliação básica
            </Button>
            <Button onClick={() => { setAssessmentDialog(null); goSubscribe(); }} className="rounded-xl gap-1.5">
              <Crown className="h-4 w-4" /> Assinar Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Find Professional dialog (demo) */}
      <Dialog open={findProDialog} onOpenChange={setFindProDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Encontre um fisioterapeuta parceiro</DialogTitle>
            <DialogDescription className="text-center pt-1">
              No app real, aqui aparece uma <strong>lista de fisioterapeutas verificados</strong> cadastrados na plataforma Aliv.iA — com foto, especialidades, cidade, avaliações e botão para iniciar contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {[
              { name: "Dra. Ana Costa", spec: "Coluna · Dor crônica", city: "São Paulo - SP", rating: "4.9" },
              { name: "Dr. Rafael Lima", spec: "Esportiva · Reabilitação", city: "Belo Horizonte - MG", rating: "4.8" },
              { name: "Dra. Beatriz Souza", spec: "Neurodinâmica · Pilates clínico", city: "Curitiba - PR", rating: "5.0" },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-3 rounded-lg border border-border/60 p-3 opacity-80">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Stethoscope className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.spec} · {p.city}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">★ {p.rating}</Badge>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground italic text-center pt-1">
              Visualização ilustrativa — disponível para assinantes Premium.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setFindProDialog(false)} className="rounded-xl">
              Voltar ao demo
            </Button>
            <Button onClick={() => { setFindProDialog(false); goSubscribe(); }} className="rounded-xl gap-1.5">
              <Crown className="h-4 w-4" /> Assinar Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed assessment record dialog */}
      <Dialog open={!!openAssessment} onOpenChange={(o) => !o && setOpenAssessment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {openAssessment && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" /> Premium
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(openAssessment.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                <DialogTitle className="text-left text-lg pt-1">{openAssessment.label}</DialogTitle>
                <DialogDescription className="text-left">
                  Prontuário simulado — Mariana Silva (Demo) · 34 anos · ciatalgia direita
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] px-6 py-4">
                <div className="space-y-5">
                  {/* Hipótese */}
                  <section className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Hipótese diagnóstica (IA)</h4>
                      <Badge variant="outline" className="text-[10px] ml-auto bg-emerald-500/10 text-emerald-700 border-emerald-200">
                        Confiança: {openAssessment.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{openAssessment.hypothesis}</p>
                  </section>

                  {/* Red flags */}
                  <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800">
                      <strong>Red flags:</strong> nenhuma detectada. Caso liberado para abordagem fisioterapêutica.
                    </p>
                  </section>

                  {/* Métricas-chave */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" /> Métricas principais
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">EVA</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.pain_score}/10</p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">ODI</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.odi}%</p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">SF-36</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.sf36}%</p>
                      </div>
                    </div>
                  </section>

                  {/* Regiões */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> Regiões de dor
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {openAssessment.pain_regions.map((r) => (
                        <span key={r} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-full">
                          {painRegionLabels[r] || r}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Anamnese */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Anamnese resumida
                    </h4>
                    <div className="rounded-lg border divide-y text-sm">
                      {[
                        ["Início", openAssessment.anamnesis.onset],
                        ["Caráter da dor", openAssessment.anamnesis.character],
                        ["Fatores de piora", openAssessment.anamnesis.aggravators],
                        ["Fatores de alívio", openAssessment.anamnesis.relievers],
                        ["Sono", openAssessment.anamnesis.sleep],
                        ["Objetivos do paciente", openAssessment.anamnesis.goals],
                      ].map(([k, v]) => (
                        <div key={k} className="px-3 py-2 grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-xs text-muted-foreground">{k}</span>
                          <span className="text-xs text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Testes funcionais */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" /> Testes funcionais
                    </h4>
                    <div className="rounded-lg border divide-y">
                      {openAssessment.tests.map((t) => {
                        const color =
                          t.flag === "positive" ? "text-destructive" :
                          t.flag === "warning" ? "text-amber-600" : "text-emerald-600";
                        const Icon =
                          t.flag === "positive" ? AlertCircle :
                          t.flag === "warning" ? AlertCircle : CheckCircle2;
                        return (
                          <div key={t.name} className="px-3 py-2 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color} shrink-0`} />
                            <span className="text-xs text-foreground flex-1">{t.name}</span>
                            <span className={`text-xs font-medium ${color}`}>{t.result}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Questionários */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Questionários validados
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {openAssessment.questionnaires.map((q) => (
                        <div key={q.name} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground">{q.name}</p>
                            <p className={`text-base font-bold ${q.color}`}>{q.score}</p>
                          </div>
                          <p className={`text-[11px] ${q.color}`}>{q.severity}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Plano */}
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" /> Plano de tratamento (STEPS)
                    </h4>
                    <ul className="rounded-lg border divide-y text-sm">
                      {openAssessment.plan.map((step, i) => (
                        <li key={i} className="px-3 py-2 flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-xs text-foreground">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900/80">
                      Esta é uma visualização ilustrativa do prontuário. No app real, cada avaliação
                      gera um <strong>PDF clínico completo</strong> que pode ser compartilhado com seu fisioterapeuta.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-3 border-t bg-muted/30 flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setOpenAssessment(null)} className="rounded-xl">
                  Fechar
                </Button>
                <Button onClick={() => { setOpenAssessment(null); goSubscribe(); }} className="rounded-xl gap-1.5">
                  <Crown className="h-4 w-4" /> Quero meu prontuário real
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDemo;
