import { motion } from "framer-motion";
import { ArrowRight, Clock, Users, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";

const HeroSection = ({ showProfessionalCTA = true }: { showProfessionalCTA?: boolean }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient blobs */}
      <div className="blur-blob absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="blur-blob absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Animated logo */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <img
              src={logoAlivia}
              alt="Aliv.iA"
              className="h-32 w-32 md:h-40 md:w-40 drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)] animate-float"
            />
          </motion.div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            {t("hero.badge")}
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>

          <p className="mb-8 text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t("hero.subtitle")}
          </p>

          {/* Micro-badges: social proof + time */}
          <div className="mb-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>{t("hero.social_proof")}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{t("hero.time_badge")}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row flex-wrap">
            <Button size="lg" variant="outline" className="w-full rounded-xl px-8 py-6 text-base sm:w-auto" onClick={() => navigate("/assessment/basic")}>
              {t("hero.cta.basic")}
            </Button>
            <Button size="lg" className="w-full rounded-xl px-8 py-6 text-base sm:w-auto gap-2" onClick={() => {
                const hasReferral = !!localStorage.getItem("alivia_referral_code");
                navigate("/upgrade-welcome", { state: { redirectTo: "/assessment/premium", planType: hasReferral ? "referral" : "direct-premium" } });
              }}>
              {t("hero.cta.premium")}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {showProfessionalCTA && (
              <Button size="lg" variant="outline" className="w-full rounded-xl px-8 py-6 text-base sm:w-auto gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={() => navigate("/profissionais")}>
                <Stethoscope className="h-4 w-4" />
                {t("hero.cta.professional")}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
