import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SupportContactForm from "@/components/support/SupportContactForm";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Stethoscope, HelpCircle, ClipboardList, Crown, BookOpen, BarChart3, Search, Gift, User, Link2, PieChart, Users, LineChart, FileDown, StickyNote, CreditCard, UserCog, Infinity, MessageCircle, RefreshCw } from "lucide-react";
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
  { key: "referral_code", icon: Gift },
  { key: "profile_language", icon: User },
];

const proTools = [
  { key: "custom_link", icon: Link2 },
  { key: "statistics", icon: BarChart3 },
  { key: "analytics_charts", icon: PieChart },
  { key: "patient_list", icon: Users },
  { key: "evolution_dashboard", icon: LineChart },
  { key: "pdf_download", icon: FileDown },
  { key: "pro_notes", icon: StickyNote },
  { key: "pro_subscription", icon: CreditCard },
  { key: "edit_profile", icon: UserCog },
  { key: "lifetime_treatment", icon: Infinity },
  { key: "messages", icon: MessageCircle },
];

const patientFaqKeys = ["pf1", "pf2", "pf3", "pf4", "pf5", "pf6", "pf7", "pf8"];
const proFaqKeys = ["rf1", "rf2", "rf3", "rf4", "rf5", "rf6", "rf7", "rf8"];

const Support = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SupportProfile>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"idle" | "updated" | "current">("idle");

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setCheckResult("idle");
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations && registrations.length > 0) {
        for (const reg of registrations) {
          await reg.update();
        }
        // If a waiting worker exists, a new version is available
        const hasWaiting = registrations.some((r) => r.waiting);
        if (hasWaiting) {
          registrations.forEach((r) => r.waiting?.postMessage({ type: "SKIP_WAITING" }));
          setCheckResult("updated");
        } else {
          setCheckResult("current");
        }
      } else {
        // No SW — just hard reload
        setCheckResult("current");
      }
    } catch {
      setCheckResult("current");
    } finally {
      setChecking(false);
      setTimeout(() => setCheckResult("idle"), 4000);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    setSeo({
      title: t("support.seo_title"),
      description: t("support.seo_desc"),
    });
  }, [t]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 md:py-20">
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

        {/* Profile selection */}
        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto"
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
      </main>
      <Footer />
    </div>
  );
};

export default Support;
