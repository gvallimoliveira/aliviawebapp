import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { setSeo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, ArrowRight, Check, Globe, LogOut, LayoutDashboard,
  ClipboardList, Video, Calendar, FileText, Users, MessageCircle,
  Shield, BarChart3, Stethoscope, Activity, Star, Menu, HelpCircle,
  Zap, Clock, Gift, Mail,
} from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import { CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE } from "@/constants/clinicPricing";
import LgpdBadge from "@/components/LgpdBadge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } }),
};

const ClinicLanding = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    setSeo({
      title: "Aliv.iA Clinic — Sistema completo para clínicas de fisioterapia",
      description: "Gerencie sua clínica com avaliações remotas, agenda compartilhada, relatórios inteligentes, chat e videochamada. Tudo em um só lugar.",
      url: "https://aliviawebapp.com.br/clinica",
      type: "website",
    });
  }, []);

  const handleStartTrial = async (tier: "small" | "medium" | "large") => {
    if (!user) {
      navigate("/auth?redirect=/clinica");
      return;
    }
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke("start-clinic-trial", {
        body: { tier },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(language === "pt" ? "Seu trial de 15 dias começou! Configure sua clínica no painel." : "Your 15-day trial has started!");
        navigate("/dashboard?clinic=trial");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar");
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { icon: ClipboardList, title: "Avaliação completa", desc: "Triagem, anamnese, testes funcionais e questionários validados à distância" },
    { icon: BarChart3, title: "Relatórios inteligentes", desc: "Impressão clínica com IA, relatórios comparativos e evolução do paciente" },
    { icon: FileText, title: "Programa de exercícios", desc: "Exercícios domiciliares personalizado com vídeos, enviado diretamente ao paciente" },
    { icon: MessageCircle, title: "Chat integrado", desc: "Possibilidade de comunicação direta com pacientes dentro da plataforma" },
    { icon: Video, title: "Videochamada", desc: "Atendimentos por teleconsulta com um clique, direto no chat" },
    { icon: Calendar, title: "Agenda multi-profissional", desc: "Agenda compartilhada com drag-and-drop, visível para toda a equipe" },
    { icon: Users, title: "Gestão de equipe", desc: "Convide fisioterapeutas e secretárias com permissões diferenciadas" },
    { icon: Shield, title: "Prontuário de evolução", desc: "Registro por sessão, acessível por toda a equipe da clínica" },
  ];

  const tiers = [
    {
      key: "small" as const,
      name: "Essencial",
      desc: "Para consultórios pequenos",
      members: "Até 3 membros",
      data: CLINIC_SMALL,
      popular: false,
    },
    {
      key: "medium" as const,
      name: "Profissional",
      desc: "Para clínicas em crescimento",
      members: "4 a 8 membros",
      data: CLINIC_MEDIUM,
      popular: true,
    },
    {
      key: "large" as const,
      name: "Enterprise",
      desc: "Para grandes clínicas",
      members: "9+ membros (ilimitado)",
      data: CLINIC_LARGE,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col">
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">Clinic</Badge>
          </button>
          <div className="flex items-center gap-3">
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
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Badge variant="outline" className="mb-6 text-sm border-primary/30 text-primary gap-2 px-4 py-1.5">
                <Building2 className="h-4 w-4" /> Aliv.iA Clinic
              </Badge>
            </motion.div>

            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Sua clínica inteira em uma plataforma inteligente
            </motion.h1>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
              Da pré-avaliação remota ao prontuário de evolução. Agenda compartilhada, 
              relatórios com IA, videochamada e gestão de equipe — tudo integrado.
            </motion.p>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2.5}
              className="mb-8">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-sm px-4 py-1.5 gap-2">
                <Gift className="h-4 w-4" /> 15 dias grátis — sem compromisso, sem cartão
              </Badge>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="rounded-xl gap-2 text-base" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                Começar teste grátis <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">Vagas limitadas por região</p>
            </motion.div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              Tudo que sua clínica precisa
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Substitua planilhas e sistemas separados por uma solução completa e integrada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <Card className="h-full border-border/60 hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Permissions matrix */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              Permissões por função
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Cada membro da equipe tem acesso adequado ao seu papel na clínica.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-foreground">Funcionalidade</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Proprietário</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Fisioterapeuta</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground">Secretária</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Agenda — visualizar", true, true, true],
                    ["Agenda — editar", true, false, true],
                    ["Avaliações — visualizar", true, true, true],
                    ["Avaliações — editar", true, true, false],
                    ["Emitir relatórios PDF", true, true, true],
                    ["Chat com pacientes", true, true, true],
                    ["Videochamada", true, true, true],
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

        {/* Pricing */}
        <section id="pricing" className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              Planos para cada tamanho de clínica
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Comece pequeno e escale conforme sua equipe cresce.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-sm font-medium ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Mensal</span>
              <button
                onClick={() => setBillingAnnual(!billingAnnual)}
                className={`relative inline-flex h-7 w-14 shrink-0 rounded-full transition-colors ${billingAnnual ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${billingAnnual ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm font-medium ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                Anual
              </span>
              {billingAnnual && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">~31% OFF</Badge>
              )}
            </div>

            {/* Trial banner */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
              className="max-w-2xl mx-auto mb-10 rounded-2xl border-2 border-green-500/30 bg-green-500/5 p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-green-600" />
                <span className="text-lg font-bold text-foreground">Teste grátis por 15 dias</span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Acesso completo a todas as funcionalidades. Sem cartão de crédito. Cancele a qualquer momento.
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Oferta por tempo limitado — restam poucas vagas na sua região
              </p>
            </motion.div>




            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => {
                const pricing = billingAnnual ? tier.data.annual : tier.data.monthly;
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
                            "Avaliações remotas ilimitadas",
                            "Agenda compartilhada",
                            "Chat e videochamada",
                            "Relatórios com IA",
                            "Programa de exercícios",
                            "Prontuário de evolução",
                            "Gestão de equipe",
                          ].map((f, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handleStartTrial(tier.key)}
                          disabled={loading !== null}
                          className={`w-full rounded-xl ${tier.popular ? "" : "variant-outline"}`}
                          variant={tier.popular ? "default" : "outline"}
                        >
                          {loading === tier.key ? "Processando..." : "Começar 15 dias grátis"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          Sem cartão de crédito • Sem compromisso
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Pagamento seguro via Stripe. Cancele quando quiser. Sem fidelidade.
            </p>
          </div>
        </section>
      </main>

      <LgpdBadge />

      <footer className="relative z-10 border-t border-border/40 bg-muted/20 py-6">
        <div className="container text-center space-y-2">
          <a
            href="mailto:aliviawebapp@gmail.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contato
          </a>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Aliv.iA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClinicLanding;
