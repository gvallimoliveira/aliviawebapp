import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SupportContactForm from "@/components/support/SupportContactForm";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Stethoscope, HelpCircle, ClipboardList, Crown, BookOpen, BarChart3, Search, Gift, User, Link2, PieChart, Users, LineChart, FileDown, StickyNote, NotebookPen, CreditCard, UserCog, Infinity, MessageCircle, RefreshCw, Brain, Dumbbell, Palette, TrendingUp, MonitorPlay, Building2, Video, FileEdit, Stamp, Lock, Mic, Archive, Activity, Gauge, FileText, Lightbulb, GraduationCap, Bell, Layers } from "lucide-react";
import ValidatedQuestionnairesTable from "@/components/ValidatedQuestionnairesTable";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setSeo } from "@/lib/seo";
import InstallAppCard from "@/components/InstallAppCard";

type SupportProfile = "patient" | "professional" | null;

const patientTools = [
  { key: "basic_assessment", icon: ClipboardList },
  { key: "premium_assessment", icon: Crown },
  { key: "premium_status", icon: Crown },
  { key: "pain_diary", icon: BookOpen },
  { key: "comparison", icon: BarChart3 },
  { key: "history", icon: ClipboardList },
  { key: "find_professional", icon: Search },
  { key: "messages", icon: MessageCircle },
  { key: "video_call", icon: Video },
  { key: "referral_code", icon: Gift },
  { key: "notifications", icon: Bell },
  { key: "profile_language", icon: User },
];

const proTools = [
  { key: "custom_link", icon: Link2 },
  { key: "statistics", icon: BarChart3 },
  { key: "analytics_charts", icon: PieChart },
  { key: "patient_list", icon: Users },
  { key: "evolution_dashboard", icon: Activity },
  { key: "pdf_download", icon: FileDown },
  { key: "rename_share_assessments", icon: FileEdit },
  { key: "final_hypothesis", icon: Stamp },
  { key: "pro_notes", icon: StickyNote },
  { key: "session_notes_quick", icon: NotebookPen },
  { key: "pro_subscription", icon: CreditCard },
  { key: "notifications", icon: Bell },
  { key: "edit_profile", icon: UserCog },
  { key: "lifetime_treatment", icon: Infinity },
  { key: "acquire_treatment_badge", icon: Lock },
  { key: "messages", icon: MessageCircle },
  { key: "video_call", icon: Video },
  { key: "clinical_impression", icon: Brain },
  { key: "differential_diagnosis", icon: Brain },
  // Cardiovascular profiles, educational i dialog and balanced PDF guidance: localized FAQ rf22.
  // HEP/load guidance is localized under support.pro.tool.hep.desc.
  // Global list-coherence guidance is localized under studio_creative_network.desc.
  { key: "hep", icon: Dumbbell },
  { key: "hep_templates", icon: FileText },
  { key: "ai_test_suggestions", icon: Lightbulb },
  { key: "reassessment", icon: RefreshCw },
  { key: "white_label", icon: Palette },
  { key: "evolution_report", icon: TrendingUp },
  { key: "simulated_env", icon: MonitorPlay },
  { key: "voice_notes", icon: Mic },
  { key: "session_dictation", icon: Mic },
  { key: "academic_mode", icon: GraduationCap },
  { key: "data_export", icon: Archive },
  { key: "insights_churn", icon: TrendingUp },
  { key: "insights_discharge", icon: TrendingUp },
  { key: "insights_adherence", icon: Activity },
  { key: "insights_benchmark", icon: Gauge },
  { key: "insights_revenue", icon: BarChart3 },
  { key: "ai_credits", icon: Gauge },
  { key: "studio_carousel", icon: Palette },
  { key: "studio_creative_network", icon: Brain },
  { key: "studio_ecosystem", icon: Layers },
];

const patientFaqKeys = ["pf_signup", "pf1", "pf2", "pf3", "pf4", "pf5", "pf6", "pf7", "pf8", "pf9", "pf10", "pf11", "pf12", "pf13"];
const proFaqKeys = ["rf_signup", "rf_student", "rf1", "rf2", "rf3", "rf4", "rf5", "rf6", "rf7", "rf8", "rf9", "rf10", "rf11", "rf12", "rf13", "rf14", "rf15", "rf16", "rf17", "rf18", "rf19", "rf20", "rf21", "rf22", "rf23"];

const Support = () => {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SupportProfile>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"idle" | "updated" | "current">("idle");

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setCheckResult("idle");

    try {
      // Aligned with src/lib/versionChecker.ts — pure version.json hash compare,
      // NO Service Worker manipulation, NO cache clearing, NO automatic reload.
      // Reload only happens on explicit user click (the toast button or the
      // confirm below). See mem://constraints/auth-stability.
      const localHash = (import.meta.env.VITE_BUILD_HASH as string | undefined) ?? "__dev__";

      let remoteHash: string | null = null;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          credentials: "omit",
        });
        if (res.ok) {
          const data = await res.json();
          remoteHash = typeof data?.hash === "string" ? data.hash : null;
        }
      } catch {
        // network hiccup — treat as "current" rather than forcing anything
      }

      if (localHash === "__dev__") {
        // Dev build has no real hash — nothing to compare against
        setCheckResult("current");
        return;
      }

      if (remoteHash && remoteHash !== localHash) {
        setCheckResult("updated");
        // Wait briefly so the user sees the message, then reload by adding a
        // version query string. This bypasses the HTML cache without touching
        // Service Workers, caches, or localStorage (auth stays intact).
        setTimeout(() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set("v", remoteHash!);
            window.location.replace(url.toString());
          } catch {
            window.location.reload();
          }
        }, 1000);
        return;
      }

      setCheckResult("current");
    } catch {
      setCheckResult("current");
    } finally {
      setChecking(false);
      setTimeout(() => setCheckResult("idle"), 4000);
    }
  }, []);

  // Page is now public — no redirect needed

  useEffect(() => {
    setSeo({
      title: t("support.seo_title"),
      description: t("support.seo_desc"),
    });
  }, [t]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container py-12 md:py-20">
        {user && (
          <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard")}>
            <Heart className="h-4 w-4" />
            {language === "pt" ? "Voltar ao Painel" : language === "es" ? "Volver al Panel" : "Back to Dashboard"}
          </Button>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <HelpCircle className="h-4 w-4" />
            {t("support.badge")}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("support.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("support.subtitle")}
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto mb-10">
          <InstallAppCard defaultOpen={false} hideIfStandalone={false} />
        </div>


        {/* Profile selection */}
        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto"
            >
              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-all hover:shadow-lg group"
                onClick={() => setProfile("patient")}
              >
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="rounded-2xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{t("support.patient.card_title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("support.patient.card_desc")}</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-all hover:shadow-lg group"
                onClick={() => setProfile("professional")}
              >
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="rounded-2xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                    <Stethoscope className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{t("support.pro.card_title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("support.pro.card_desc")}</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-all hover:shadow-lg group"
                onClick={() => navigate("/academico/suporte")}
              >
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="rounded-2xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Alivia Acadêmico</h2>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt"
                      ? "Suporte para alunos: assinatura PRO, CREFITO, selo acadêmico, supervisão e transição profissional."
                      : language === "es"
                      ? "Soporte para estudiantes: suscripción PRO, matrícula, sello, supervisión y transición profesional."
                      : "Student support: PRO subscription, license, academic seal, supervision and professional transition."}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-all hover:shadow-lg group"
                onClick={() => navigate("/clinica/suporte")}
              >
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="rounded-2xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Aliv.iA Clinic</h2>
                  <p className="text-sm text-muted-foreground">Suporte para clínicas: agenda IA, equipe, NPS, white-label e mais.</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={profile}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              {/* Back button */}
              <button
                onClick={() => setProfile(null)}
                className="mb-8 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                ← {t("support.back")}
              </button>

              {/* Section title */}
              <div className="flex items-center gap-3 mb-8">
                {profile === "patient" ? (
                  <Heart className="h-6 w-6 text-primary" />
                ) : (
                  <Stethoscope className="h-6 w-6 text-primary" />
                )}
                <h2 className="text-2xl font-bold text-foreground">
                  {profile === "patient" ? t("support.patient.section_title") : t("support.pro.section_title")}
                </h2>
              </div>

              {/* Evidence library highlight — professional/academic */}
              {profile === "professional" && (
                <div className="mb-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-foreground">
                          {language === "pt"
                            ? "Biblioteca de Evidências por Nicho"
                            : language === "es"
                            ? "Biblioteca de Evidencia por Nicho"
                            : "Evidence Library by Niche"}
                        </h4>
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary tracking-wide">BETA</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {language === "pt"
                          ? "Acesse, dentro da página do Agente Clínico, a curadoria de artigos aprovados com DOI/PMID e nota PEDro validados — RCTs só entram com PEDro ≥ 7 oficial; revisões com PEDro N/A ficam sem nota numérica. Favorite estudos para consultar em 1 clique."
                          : language === "es"
                          ? "Accede, dentro del Agente Clínico, a artículos aprobados con DOI/PMID y puntuación PEDro validados — los RCT solo entran con PEDro ≥ 7 oficial; revisiones con PEDro N/A quedan sin puntuación numérica."
                          : "Inside the Clinical Agent page, browse approved studies with validated DOI/PMID and PEDro status — RCTs require official PEDro ≥ 7; reviews with PEDro N/A are kept without a numeric score."}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {language === "pt"
                          ? "Disponível para Acadêmico assinante, PRO e Clínica. Nichos sem artigos aprovados ainda exibem aviso de curadoria em andamento."
                          : language === "es"
                          ? "Disponible para Académico suscriptor, PRO y Clínica. Nichos sin artículos aprobados muestran aviso de curaduría en curso."
                          : "Available for subscribed Academic, PRO and Clinic. Niches without approved studies show a curation-in-progress notice."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tools accordion */}
              <div className="mb-12">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t("support.tools_title")}</h3>
                <Accordion type="single" collapsible className="w-full">
                  {(profile === "patient" ? patientTools : proTools).map(({ key, icon: Icon }) => (
                    <AccordionItem key={key} value={key}>
                      <AccordionTrigger className="text-left text-base font-medium text-foreground gap-3">
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          {t(`support.${profile === "patient" ? "patient" : "pro"}.tool.${key}.title`)}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pl-7">
                        {t(`support.${profile === "patient" ? "patient" : "pro"}.tool.${key}.desc`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Validated Questionnaires Table — only for professional */}
              {profile === "professional" && (
                <div className="mb-12">
                  <ValidatedQuestionnairesTable
                    compact
                    title={t("questionnaires_table.support_title")}
                    subtitle={t("questionnaires_table.support_subtitle")}
                  />
                </div>
              )}

              {/* FAQ */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {t("support.faq_title")}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {(profile === "patient" ? patientFaqKeys : proFaqKeys).map((key) => (
                    <AccordionItem key={key} value={key}>
                      <AccordionTrigger className="text-left text-base font-medium text-foreground">
                        {t(`support.${profile === "patient" ? "patient" : "pro"}.faq.${key}.q`)}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {t(`support.${profile === "patient" ? "patient" : "pro"}.faq.${key}.a`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check for updates */}
        <div className="mt-16 flex flex-col items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleCheckUpdate}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {t("support.check_update")}
          </Button>
          {checkResult === "updated" && (
            <p className="text-sm text-primary font-medium animate-in fade-in">{t("support.update_found")}</p>
          )}
          {checkResult === "current" && (
            <p className="text-sm text-muted-foreground animate-in fade-in">{t("support.up_to_date")}</p>
          )}
        </div>

        {/* Support contact form — only for authenticated users */}
        {user ? (
          <SupportContactForm />
        ) : (
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">{t("support.login_to_contact")}</p>
            <Button onClick={() => navigate("/auth")} className="gap-2">
              {t("nav.login")}
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Support;
