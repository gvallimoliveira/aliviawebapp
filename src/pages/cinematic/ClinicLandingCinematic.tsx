import { activateClinicTrial, CLINIC_TRIAL_ENTRY, readPendingClinicTrial, savePendingClinicTrial } from "@/lib/clinicTrialEntry";
import { savePendingClinicPlan } from "@/lib/clinicCheckout";
import CreditsSufficiency from "@/components/CreditsSufficiency";
import BlogHighlights from "@/components/blog/BlogHighlights";
import AnnualRefundDisclaimer from "@/components/AnnualRefundDisclaimer";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { setSeo, setOrganizationJsonLd, setSoftwareJsonLd } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, ArrowRight, Check, Globe, LogOut, LayoutDashboard,
  ClipboardList, Calendar, FileText, Users, MessageCircle,
  Shield, BarChart3, Activity, Star, HelpCircle, Menu,
  Zap, Clock, Gift, Mail, Phone, CreditCard, Sparkles, Camera,
  Link2, Image as ImageIcon, AlertTriangle, Palette, Heart,
  TrendingUp, Bell, FileCheck, Smile, BookOpen, Stethoscope,
  Infinity as InfinityIcon, Layers, Gauge,
} from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from "@/constants/clinicPricing";
import LgpdBadge from "@/components/LgpdBadge";
import InstallAppSection from "@/components/InstallAppSection";
import MobileNavSheet from "@/components/MobileNavSheet";
import ScrollProgress from "@/components/scroll/ScrollProgress";
import Reveal from "@/components/scroll/Reveal";
import BrandMarquee from "@/components/scroll/BrandMarquee";
import KineticStatement from "@/components/scroll/KineticStatement";
import CinematicClosing from "@/components/scroll/CinematicClosing";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const ClinicLandingCinematic = () => {
  const { toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [trialForm, setTrialForm] = useState<string | null>(null);
  const [trialEmail, setTrialEmail] = useState("");
  const [trialPhone, setTrialPhone] = useState("");
  const [trialCnpj, setTrialCnpj] = useState("");

  useEffect(() => {
    const pending = readPendingClinicTrial();
    if (!pending) return;
    setTrialEmail(pending.email);
    setTrialPhone(pending.phone);
    setTrialCnpj(pending.cnpj);
    setBillingAnnual(pending.plan === "annual");
    setTrialForm(pending.tier);
  }, []);

  // Hero cinematográfico (parallax + fade no scroll)
  const heroRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(heroProgress, [0, 0.65, 1], [1, 1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], [0, -80]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 1.4]);
  const heroGlow = useTransform(heroProgress, [0, 0.5, 1], [0.45, 0.6, 0.1]);



  useEffect(() => {
    setSeo({
      title: "Sistema para Clínica de Fisioterapia: Agenda e Prontuário | Aliv.iA",
      description: "Software de gestão para clínicas de fisioterapia: agenda integrada, prontuário da equipe, pré-avaliação online, NPS e relatórios com sua marca. Teste 15 dias.",
      url: "https://aliviawebapp.com.br/clinica",
      type: "website",
    });
    setSoftwareJsonLd({
      name: "Aliv.iA Clínica", url: "https://aliviawebapp.com.br/clinica", price: "197",
      description: "Plataforma para clínicas de fisioterapia com agenda, prontuário compartilhado, equipe, indicadores e white-label.",
      audience: "Clínicas de fisioterapia",
      features: ["Agenda da equipe e importação por foto", "Link institucional de pré-avaliação", "Prontuário multiprofissional", "Assinatura digital por colaborador", "Indicadores de retenção e financeiro", "Pesquisa NPS", "Relatórios com a marca da clínica", "Permissões por função"],
    });
    setOrganizationJsonLd();
  }, []);

  useEffect(() => {
    if (user?.email) setTrialEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!hash) return;
    const id = hash === "#planos" ? "pricing" : hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [hash]);

  const handleStartTrial = async (tier: "small" | "medium" | "large") => {
    if (loading) return;
    setLoading(tier);
    try {
      savePendingClinicTrial({ tier, plan: billingAnnual ? "annual" : "monthly", email: trialEmail, phone: trialPhone, cnpj: trialCnpj });
      if (user) { navigate(CLINIC_TRIAL_ENTRY); return; }
      const pending = readPendingClinicTrial();
      if (!pending) throw new Error("Não foi possível guardar seus dados. Permita o armazenamento desta página e tente novamente.");
      const result = await activateClinicTrial(pending);
      const mode = result.requires_signup ? "signup" : "login";
      navigate(`/auth?clinic_trial=1&mode=${mode}&redirect=${encodeURIComponent(CLINIC_TRIAL_ENTRY)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível continuar. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (tier: "small" | "medium" | "large") => {
    if (!user) {
      savePendingClinicPlan({ tier, plan: billingAnnual ? "annual" : "monthly" });
      try { sessionStorage.setItem("signupOrigin", "clinic"); } catch {}
      navigate("/auth", { state: { redirectTo: "/dashboard" } });
      return;
    }
    setSubscribeLoading(tier);
    try {
      const plan = billingAnnual ? "annual" : "monthly";
      const { data, error } = await supabase.functions.invoke("create-clinic-subscription", {
        body: { tier, plan, clinic_name: "Minha Clínica" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar");
    } finally {
      setSubscribeLoading(null);
    }
  };

  // Diferenciais exclusivos (4 grandes)
  const differentiators = [
    {
      icon: Camera,
      title: "Troque de sistema sem redigitar a agenda",
      desc: "Envie uma imagem da agenda atual. A IA organiza os horários para sua equipe revisar e confirmar antes de importar.",
      tag: "Menos retrabalho",
    },
    {
      icon: Link2,
      title: "Comece a consulta conhecendo a história",
      desc: "O paciente responde à anamnese e aos questionários aplicáveis por um link da clínica. Você retoma essas informações na avaliação, sem pedir tudo de novo.",
      tag: "Pré-avaliação",
    },
    {
      icon: Smile,
      title: "Ouça quem está sendo atendido",
      desc: "Acompanhe o NPS e os comentários recebidos por link. Descubra o que o paciente valoriza e onde a experiência precisa melhorar.",
      tag: "Diferencial",
    },
    {
      icon: Palette,
      title: "Sua clínica presente em cada entrega",
      desc: "Links e relatórios levam a identidade da clínica. O PDF preserva o nome e a assinatura do profissional que o emitiu, quando cadastrados.",
      tag: "Personalizável",
    },
  ];

  // Features completas organizadas por categoria
  const featureCategories = [
    {
      title: "Captação e onboarding",
      icon: Users,
      items: [
        { icon: Link2, title: "Link de pré-avaliação", desc: "Personalizado por paciente, com nome pré-preenchido" },
        { icon: ClipboardList, title: "Avaliação manual", desc: "Crie no consultório sem o paciente precisar de e-mail" },
        { icon: AlertTriangle, title: "Triagem de Red Flags", desc: "IA identifica sinais de alerta automaticamente" },
        { icon: Stethoscope, title: "Anamnese + testes funcionais", desc: "Questionários validados (NDI, ODI, Roland-Morris)" },
      ],
    },
    {
      title: "Prontuário e documentos",
      icon: FileText,
      items: [
        { icon: ImageIcon, title: "Upload de laudos e exames", desc: "PDFs, raio-X, ressonância, anexos até 20MB" },
        { icon: Camera, title: "Fotos de evolução", desc: "Postura, lesão, antes/depois categorizado" },
        { icon: BookOpen, title: "Notas de sessão", desc: "Prontuário compartilhado por toda equipe" },
        { icon: Activity, title: "Notas de voz com IA", desc: "Grave durante a consulta, IA transcreve e resume — áudio descartado" },
        { icon: FileCheck, title: "PDFs profissionais", desc: "Relatórios com a marca da sua clínica" },
        { icon: InfinityIcon, title: "Exportar tudo (.zip)", desc: "Backup completo da clínica em 1 clique — LGPD garantido" },
      ],
    },
    {
      title: "Inteligência clínica (IA)",
      icon: Sparkles,
      items: [
        { icon: BarChart3, title: "Impressão clínica IA", desc: "Resumo da evolução em 1 clique" },
        { icon: TrendingUp, title: "Antes vs Depois", desc: "Relatório comparativo automatizado para alta" },
        { icon: Activity, title: "Progressão de exercícios", desc: "Sugestões com base em adesão e dor" },
        { icon: Camera, title: "OCR de agenda", desc: "Importe agendamentos de qualquer app por foto" },
        { icon: Gauge, title: "Controle de carga e periodização", desc: "sRPE por sessão, ACWR, prontidão e alertas de risco — com macro/mesociclos sugeridos a partir das fases do STEPS (potência e retorno ao esporte opcionais) e link de check-in para paciente e preparador" },
        { icon: BookOpen, title: "Biblioteca de Evidências por Nicho", desc: "Curadoria PEDro ≥ 7 acessível dentro do Agente Clínico, filtrada por nicho, ano e nota — a mesma base que alimenta a IA" },
      ],
    },
    {
      title: "Agenda e produtividade",
      icon: Calendar,
      items: [
        { icon: Calendar, title: "Agenda multi-profissional", desc: "Compartilhada, com drag-and-drop (mouse e toque)" },
        { icon: Layers, title: "Múltiplos serviços", desc: "Fisio, pilates, osteopatia, RPG, massoterapia" },
        { icon: Users, title: "Equipe com permissões", desc: "Proprietário, fisio e secretária — papéis distintos" },
        { icon: Shield, title: "Anti-abuso institucional", desc: "Links da clínica, não pessoais — protege seu negócio" },
      ],
    },
    {
      title: "Comunicação com paciente",
      icon: MessageCircle,
      items: [
        { icon: MessageCircle, title: "Chat integrado", desc: "Conversas dentro da plataforma, organizadas" },
        { icon: Bell, title: "Notificações push", desc: "Lembretes, alertas clínicos e adesão" },
        { icon: Smile, title: "NPS via link", desc: "Pesquisa de satisfação com dashboard e comentários" },
      ],
    },
    {
      title: "Insights inteligentes (preditivos)",
      icon: Sparkles,
      items: [
        { icon: AlertTriangle, title: "Predição de evasão (churn)", desc: "Identifique quem está prestes a abandonar — e aja antes" },
        { icon: FileCheck, title: "Predição de alta", desc: "Sessões restantes até alta, baseado em dor + adesão" },
        { icon: Heart, title: "Score de adesão 0-100", desc: "Engajamento por paciente em segundos — explicação no botão 'i'" },
        { icon: TrendingUp, title: "Benchmark anônimo", desc: "Compare-se com clínicas de menor, mesmo e maior porte" },
        { icon: CreditCard, title: "Meta de receita + simulador", desc: "What-if: 'se eu reduzir 10% de no-show, ganho X'" },
      ],
    },
    {
      title: "Engajamento e retenção",
      icon: Heart,
      items: [
        { icon: Activity, title: "Programa de exercícios", desc: "Exercícios domiciliares com vídeos para o paciente" },
        { icon: Heart, title: "Diário de dor diário", desc: "Slider 0-10 + gamificação para adesão" },
        { icon: BarChart3, title: "Analytics da clínica", desc: "Volume, NPS, alertas e indicadores em tempo real" },
      ],
    },
  ];

  // "Tudo incluso"
  const included = [
    { icon: InfinityIcon, label: "Tratamentos ilimitados" },
    { icon: Sparkles, label: "Créditos de IA inclusos" },
    { icon: ImageIcon, label: "Storage de fotos e laudos" },
    { icon: Bell, label: "Push notifications" },
    { icon: Palette, label: "White-label" },
    { icon: BarChart3, label: "Analytics + NPS" },
    { icon: Heart, label: "Suporte humano" },
  ];

  const tiers = [
    { key: "small" as const, name: "Essencial", desc: "Para consultórios pequenos", members: "Até 3 membros", data: CLINIC_SMALL, popular: false },
    { key: "medium" as const, name: "Profissional", desc: "Para clínicas em crescimento", members: "4 a 8 membros", data: CLINIC_MEDIUM, popular: true },
    { key: "large" as const, name: "Enterprise", desc: "Para grandes clínicas", members: "9+ membros (ilimitado)", data: CLINIC_LARGE, popular: false },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip flex flex-col">
      <ScrollProgress />
      <div className="blur-blob absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="blur-blob absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">Clinic</Badge>
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/clinica#planos")} className="gap-1.5">
              <CreditCard className="h-4 w-4" />{language === "en" ? "Plans" : language === "es" ? "Planes" : "Ver planos"}
            </Button>
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5 px-2">
                <Globe className="h-4 w-4" />
                {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
              </Button>
              {user ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />Dashboard
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Entrar</Button>
              )}
            </div>
            {/* Mobile actions */}
            <div className="flex md:hidden items-center gap-1">
              {user ? (
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 px-2 text-xs">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {language === "pt" ? "Painel" : language === "es" ? "Panel" : "Dashboard"}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm px-2">Entrar</Button>
              )}
              <MobileNavSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} hideTrigger />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* ============ HERO CINEMATOGRÁFICO ============ */}
        <section ref={heroRef} className="relative h-[190vh]">
          <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-foreground text-background">
            <motion.div
              aria-hidden="true"
              style={reduced ? { opacity: 0.35 } : { opacity: heroGlow, scale: heroScale }}
              className="pointer-events-none absolute h-[85vw] w-[85vw] max-h-[680px] max-w-[680px] rounded-full bg-primary/40 blur-[110px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "64px 64px",
              }}
            />
            <motion.div
              style={reduced ? undefined : { opacity: heroOpacity, y: heroY }}
              className="container relative z-10 max-w-4xl px-4 text-center"
            >
              <Badge variant="outline" className="mb-6 gap-2 border-background/25 bg-background/10 px-4 py-1.5 text-sm text-background">
                <Building2 className="h-4 w-4" /> Aliv.iA Clinic
              </Badge>

              <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                O paciente melhora na 3ª sessão e some.
                <span className="block text-primary">Você só descobre no fechamento do mês.</span>
              </h1>

              <p className="mx-auto mb-6 max-w-2xl text-base text-background/70 md:text-lg">
                Alertas de risco de evasão, conduta padronizada pelo método STEPS e D.I.F.I.,
                relatórios com CREFITO e assinatura de cada fisioterapeuta — tudo com a marca da sua clínica.
              </p>

              <div className="mb-8">
                <Badge className="gap-2 border-primary/40 bg-primary/20 px-4 py-1.5 text-sm text-background">
                  <Gift className="h-4 w-4" /> 15 dias grátis — sem cartão, sem compromisso
                </Badge>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="rounded-xl gap-2 text-base" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                  Começar teste grátis <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl gap-2 border-background/30 bg-transparent text-base text-background hover:bg-background/10 hover:text-background"
                  onClick={() => navigate("/clinica/demo")}
                >
                  <Activity className="h-4 w-4" /> Experimentar Demo
                </Button>
              </div>
              <p className="mt-3 text-xs text-background/50">Vagas limitadas por região</p>
            </motion.div>
          </div>
        </section>

        <BrandMarquee />

        <KineticStatement
          kicker="Cada fisioterapeuta atende de um jeito?"
          word="padrão"
          caption="Uma estrutura comum com STEPS e D.I.F.I., sem apagar o julgamento de cada fisioterapeuta. Registros de evolução ajudam a equipe a dar continuidade ao cuidado."
        />



        {/* ============ DIFERENCIAIS EXCLUSIVOS ============ */}
        <section className="py-16 px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/30 gap-1.5">
                <Sparkles className="h-3 w-3" /> Na rotina da clínica
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                Menos trabalho entre um atendimento e outro
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Da primeira informação ao relatório: organize o cuidado sem espalhar a história do paciente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {differentiators.map((d, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <div className="relative group h-full">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-primary/30 opacity-50 blur-md group-hover:opacity-80 transition-opacity duration-500" />
                    <div className="relative h-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6">
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> {d.tag}
                        </Badge>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4 shadow-md">
                        <d.icon className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2 pr-20">{d.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FEATURES POR CATEGORIA (recolhido por padrão) ============ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                Agenda, prontuário e equipe no mesmo lugar
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Consulte horários, registros e mensagens sem perder o contexto. Cada pessoa acessa o que sua função permite.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {featureCategories.map((cat, ci) => (
                <Badge key={ci} variant="outline" className="gap-1.5 px-3 py-1 text-xs">
                  <cat.icon className="h-3.5 w-3.5 text-primary" /> {cat.title}
                </Badge>
              ))}
            </div>
            <div className="text-center mb-8">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowAllFeatures((v) => !v)} aria-expanded={showAllFeatures}>
                {showAllFeatures ? "Ocultar lista completa" : "Ver todas as funções"}
              </Button>
            </div>

            {showAllFeatures && (
            <div className="space-y-10">
              {featureCategories.map((cat, ci) => (
                <motion.div key={ci} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-foreground">{cat.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cat.items.map((f, i) => (
                      <Card key={i} className="border-border/60 hover:border-primary/40 hover:shadow-sm transition-all">
                        <CardContent className="p-4">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                            <f.icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <h4 className="font-semibold text-foreground text-sm mb-1">{f.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>
        </section>

        {/* ============ TUDO INCLUSO ============ */}
        <section className="py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
              className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 md:p-10">
              <div className="text-center mb-8">
                <Badge className="mb-3 bg-primary text-primary-foreground gap-1.5">
                  <Check className="h-3 w-3" /> Recursos inclusos no plano
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Sem cobranças automáticas de excedentes.
                </h2>
                <p className="text-muted-foreground">
                  No modo Clínica, tudo abaixo está incluso em qualquer plano.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {included.map((it, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-background/60 border border-border/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <it.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-foreground">{it.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============ PERMISSÕES ============ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3">
              Trabalho em equipe, com responsabilidades claras
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              A recepção organiza a agenda; o fisioterapeuta registra o cuidado. Os acessos respeitam as permissões de cada função.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-xl overflow-hidden bg-background">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-foreground">Funcionalidade</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Proprietário</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Fisio</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Secretária</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Agenda — visualizar", true, true, true],
                    ["Agenda — editar", true, false, true],
                    ["Avaliações — visualizar", true, true, true],
                    ["Avaliações — editar", true, true, false],
                    ["Upload de laudos/fotos", true, true, true],
                    ["Emitir relatórios PDF", true, true, true],
                    ["Chat com pacientes", true, true, true],
                    ["Importar agenda por foto", true, false, true],
                    ["Pesquisa NPS", true, true, true],
                    ["Gerenciar equipe", true, false, true],
                  ].map(([feat, owner, therapist, secretary], i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3 text-foreground">{feat as string}</td>
                      {[owner, therapist, secretary].map((val, j) => (
                        <td key={j} className="text-center px-4 py-3">
                          {val ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============ PRICING ============ */}
        <section id="pricing" className="py-16 px-4 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3">
              Planos para cada tamanho de clínica
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Escolha pelo tamanho da equipe. Os recursos de cuidado estão presentes em todos os planos.
            </p>

            <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground mb-5">
              <Gift className="h-4 w-4 shrink-0 text-primary" />
              Teste por 15 dias, sem cartão. Depois, escolha seu plano.
            </p>

            <div>
              <div className="sticky top-20 z-30 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
                <div role="group" aria-label={language === "en" ? "Billing period" : language === "es" ? "Periodo de pago" : "Período de cobrança"} className="flex items-center justify-center gap-2">
                  <Button variant={!billingAnnual ? "default" : "outline"} size="sm" aria-pressed={!billingAnnual} onClick={() => setBillingAnnual(false)} className="min-w-24">
                    {language === "en" ? "Monthly" : language === "es" ? "Mensual" : "Mensal"}
                  </Button>
                  <Button variant={billingAnnual ? "default" : "outline"} size="sm" aria-pressed={billingAnnual} onClick={() => setBillingAnnual(true)} className="min-w-24">
                    {language === "en" ? "Annual" : "Anual"}
                  </Button>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => {
                const pricing = billingAnnual ? tier.data.annual : tier.data.monthly;
                const isTrialFormOpen = trialForm === tier.key;
                return (
                  <motion.div key={tier.key} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                    <Card className={`relative h-full ${tier.popular ? "border-2 border-primary shadow-lg" : "border-border/60"}`}>
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            <Star className="h-3 w-3" /> Mais popular
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{tier.desc}</p>
                        <div className="mb-1">
                          <span className="text-3xl font-bold text-foreground">R$ {pricing.price}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                        {billingAnnual && "total" in pricing && (
                          <p className="text-xs text-muted-foreground mb-4">
                            R$ {(pricing as any).total.toLocaleString("pt-BR")}/ano
                          </p>
                        )}
                        <Badge variant="outline" className="w-fit mb-4 text-xs">{tier.members}</Badge>
                        <ul className="space-y-2 mb-6 flex-1">
                          {[
                            "Recursos clínicos inclusos",
                            "Pré-avaliações por link ilimitadas",
                            "Importação de agenda por foto",
                            "Chat com pacientes",
                            "Relatórios com IA",
                            "NPS e analytics",
                            "White-label completo",
                          ].map((f, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>

                        {isTrialFormOpen ? (
                          <div className="space-y-3 mb-3">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input type="email" placeholder="Seu e-mail" value={trialEmail} onChange={(e) => setTrialEmail(e.target.value)} className="pl-9" />
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input type="tel" placeholder="WhatsApp (ex: 11999999999)" value={trialPhone} onChange={(e) => setTrialPhone(e.target.value)} className="pl-9" />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground tracking-wider">CNPJ</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="00.000.000/0000-00"
                                value={trialCnpj}
                                onChange={(e) => setTrialCnpj(e.target.value)}
                                className="pl-14"
                                maxLength={18}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground -mt-1">
                              CNPJ obrigatório (MEI também é aceito). Limite de 20 créditos de IA durante o trial.
                            </p>
                            <Button onClick={() => handleStartTrial(tier.key)} disabled={loading !== null} className="w-full rounded-xl">
                              {loading === tier.key ? "Processando..." : "Ativar trial grátis"}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                            <button onClick={() => setTrialForm(null)} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => { setTrialForm(tier.key); if (user?.email) setTrialEmail(user.email); }}
                            disabled={loading !== null}
                            className="w-full rounded-xl"
                            variant={tier.popular ? "default" : "outline"}
                          >
                            Começar 15 dias grátis
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}

                        <p className="text-center text-xs text-muted-foreground mt-2 mb-3">
                          Sem cartão de crédito • Sem compromisso
                        </p>

                        <Button variant="secondary" onClick={() => handleSubscribe(tier.key)} disabled={subscribeLoading !== null}
                          className="w-full rounded-xl gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" />
                          {subscribeLoading === tier.key ? "Redirecionando..." : "Assinar agora"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            </div>

            <AnnualRefundDisclaimer annual={billingAnnual} className="text-center mt-5" />
            <CreditsSufficiency plan="clinic" className="mt-6" />

            <p className="text-center text-xs text-muted-foreground mt-6">
              E-mail, WhatsApp e CNPJ para começar. Sem cartão de crédito durante o teste. Se não assinar em até 7 dias após o fim do teste, os dados da clínica são excluídos.
            </p>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3">
              Perguntas frequentes
            </h2>
            <p className="text-center text-muted-foreground mb-10">
              Tire suas dúvidas sobre o Aliv.iA Clinic.
            </p>

            <div className="space-y-4">
              {[
                { q: "Consigo migrar minha agenda atual sem retrabalho?", a: "Sim! Basta tirar um print da sua agenda atual (Google Agenda, planilha, WhatsApp, outro app) e enviar para a IA. Em segundos todos os agendamentos são lidos e importados — você só revisa e confirma." },
                { q: "Como funciona o link de pré-avaliação personalizado?", a: "Para cada paciente cadastrado você gera um link único. O paciente abre, vê o nome dele já preenchido, responde anamnese, dor, testes funcionais e questionários validados. A avaliação cai automaticamente dentro do card do paciente — sem duplicatas." },
                { q: "O paciente precisa baixar algum app?", a: "Não. Tudo funciona pelo navegador, no celular e no computador. O paciente recebe um link e abre direto. Sem cadastro obrigatório, sem instalação." },
                { q: "Posso fazer upload de laudos, exames e fotos do paciente?", a: "Sim. Cada paciente tem uma área de documentos (PDFs, raio-X, ressonância) e fotos categorizadas (postura, lesão, evolução). Limite de 20MB por arquivo." },
                { q: "Como funciona a pesquisa de satisfação (NPS)?", a: "Você envia um link público da pesquisa por chat, WhatsApp ou e-mail. O paciente responde em 1 minuto. Você acompanha NPS, comentários e identifica promotores num dashboard dedicado." },
                { q: "Posso personalizar a plataforma com a marca da minha clínica?", a: "Sim — o white-label inclui logotipo, nome, cor da marca, telefone e endereço. Aparece no painel e em todos os PDFs entregues ao paciente." },
                { q: "O trial de 15 dias é realmente gratuito? Preciso cadastrar cartão?", a: "100% gratuito, sem cartão. Apenas e-mail e WhatsApp. Acesso completo a todas as funcionalidades. Após os 15 dias você decide se assina. Sem assinatura em até 7 dias após o fim do teste, os dados da clínica são excluídos definitivamente." },
                { q: "Posso adicionar minha secretária e outros fisioterapeutas?", a: "Sim! De 3 a ilimitados membros conforme o plano. Cada papel tem permissões: proprietário e secretária gerenciam agenda e equipe; fisioterapeutas focam em avaliações e atendimentos." },
                { q: "Os tratamentos são cobrados à parte?", a: "Os tratamentos fazem parte do plano da clínica, sem compra individual por paciente. As funções de IA usam um saldo compartilhado pela equipe; se precisar ampliar esse uso, o pacote extra é opcional e não há cobrança automática." },
                { q: "Os dados estão seguros e em conformidade com a LGPD?", a: "Sim. Criptografia, servidores seguros, controle de acesso por função (RBAC) e políticas alinhadas com a LGPD e melhores práticas de saúde digital." },
                { q: "A agenda funciona no celular?", a: "Sim. Drag-and-drop com toque (mobile) e mouse (desktop). 3 dias no celular, 7 dias no desktop. Tudo responsivo." },
                { q: "Posso trocar de plano depois?", a: "Sim, upgrade ou downgrade a qualquer momento. Cobrança proporcional ao período restante." },
              ].map((item, i) => (
                <motion.details key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.3}
                  className="group rounded-xl border border-border/60 bg-card overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors list-none">
                    <span>{item.q}</span>
                    <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 ml-3 group-open:text-primary transition-colors" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                </motion.details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA CINEMATOGRÁFICO ============ */}
        <CinematicClosing
          kicker="Aliv.iA Clinic"
          heading="Mais tempo para cuidar. Mais clareza para gerir."
          sub="Experimente a agenda, o prontuário e os indicadores na rotina da sua equipe. 15 dias grátis, sem cartão."
          note="Vagas limitadas por região"
          primaryLabel="Começar agora"
          onPrimary={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          secondaryLabel="Ver demo"
          onSecondary={() => navigate("/clinica/demo")}
        />

      </main>

      <BlogHighlights audience="clinic" />
      <InstallAppSection />

      <LgpdBadge />

      <footer className="relative z-10 border-t border-border/40 bg-muted/20 py-6">
        <div className="container text-center space-y-2">
          <a href="mailto:aliviawebapp@gmail.com" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-3.5 w-3.5" /> Contato
          </a>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Aliv.iA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClinicLandingCinematic;
