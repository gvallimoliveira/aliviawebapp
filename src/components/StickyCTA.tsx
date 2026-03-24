import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const StickyCTA = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_-4px_hsl(var(--primary)/0.15)]"
        >
          <div className="container flex items-center justify-between py-3 gap-3">
            <p className="text-sm font-medium text-foreground hidden sm:block">
              {t("sticky.cta")}
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl flex-1 sm:flex-none"
                onClick={() => navigate("/assessment/basic")}
              >
                {t("hero.cta.basic")}
              </Button>
              <Button
                size="sm"
                className="rounded-xl gap-1 flex-1 sm:flex-none"
                onClick={() => navigate("/assessment/premium")}
              >
                {t("hero.cta.premium")}
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1 flex-1 sm:flex-none border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate("/profissionais")}
              >
                <Stethoscope className="h-3 w-3" />
                <span className="hidden sm:inline">{t("hero.cta.professional")}</span>
                <span className="sm:hidden">Pro</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTA;
