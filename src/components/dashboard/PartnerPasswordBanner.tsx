import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface PartnerPasswordBannerProps {
  isPartner?: boolean;
  userId?: string;
}

const STORAGE_KEY_PREFIX = "partner_pwd_banner_dismissed_";

const PartnerPasswordBanner = ({ isPartner, userId }: PartnerPasswordBannerProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isPartner || !userId) return;
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    setDismissed(localStorage.getItem(key) === "true");
  }, [isPartner, userId]);

  if (!isPartner || !userId || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, "true");
    setDismissed(true);
  };

  const t = isPt ? {
    title: "Por segurança, troque sua senha de acesso",
    desc: "Você está usando a senha temporária padrão de parceiro (\"parceiroalivia\"). Defina uma senha pessoal para proteger sua conta.",
    cta: "Alterar senha",
    dismiss: "Fechar",
  } : {
    title: "For your security, please change your password",
    desc: "You are using the default partner password (\"parceiroalivia\"). Set a personal password to protect your account.",
    cta: "Change password",
    dismiss: "Dismiss",
  };

  return (
    <div className="relative rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-700/40 p-4 shadow-sm">
      <button
        onClick={handleDismiss}
        aria-label={t.dismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
          <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm sm:text-base">{t.title}</h3>
          <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-200/80 mt-1">{t.desc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/account")}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {t.cta}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              {t.dismiss}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPasswordBanner;
