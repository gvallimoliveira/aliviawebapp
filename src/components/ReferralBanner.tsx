import { useState, useEffect } from "react";
import { Gift, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

const ReferralBanner = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasReferral = !!localStorage.getItem("alivia_referral_code");
    const dismissed = sessionStorage.getItem("referral_banner_dismissed");
    setVisible(hasReferral && !dismissed);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("referral_banner_dismissed", "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 z-40 overflow-hidden"
        >
          <div className="container flex items-center justify-between gap-2 py-2 px-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Gift className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                {t("referral_banner.text")}
              </span>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 p-1 rounded-full hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-600 dark:text-amber-300 transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReferralBanner;
