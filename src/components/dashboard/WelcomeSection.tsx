import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Stethoscope, Crown, RotateCcw } from "lucide-react";


interface WelcomeSectionProps {
  profileName?: string | null;
  userEmail?: string;
  professional?: any;
  premiumAccess?: {
    subscription_type?: "monthly" | "single" | null;
  } | null;
  onRestart: () => void;
  showRestart: boolean;
  activeTab?: string;
}

const WelcomeSection = ({
  profileName,
  userEmail,
  professional,
  premiumAccess,
  onRestart,
  showRestart,
  activeTab = "health",
}: WelcomeSectionProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const renderBadge = () => {
    const isAdmin = userEmail === "gvallimoliveira@gmail.com";
    if (isAdmin) {
      return <Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
    }

    // Na aba profissional, mostrar badge Pro
    if (activeTab === "professional") {
      if (professional?.is_partner) {
        return <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1"><Stethoscope className="h-3 w-3" />PRO Parceiro</Badge>;
      }
      if (professional?.subscription_status === "active" && professional?.pro_access_expires_at) {
        return <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />PRO Anual</Badge>;
      }
      if (professional?.subscription_status === "active") {
        return <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />PRO Mensal</Badge>;
      }
    }

    // Na aba saúde/mensagens, mostrar apenas status B2C (Premium/Básico)
    if (premiumAccess?.subscription_type === "monthly") {
      return <Badge className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />Premium Mensal</Badge>;
    }
    if (premiumAccess?.subscription_type === "single") {
      return <Badge variant="outline" className="border-amber-400 text-amber-600 text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />Premium Avulso</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5">Básica</Badge>;
  };

  return (
    <div data-onboarding="patient-welcome" className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-bold text-foreground">
            {t("dashboard.welcome")}{profileName ? `, ${profileName}` : ""}
          </h1>
          {renderBadge()}
        </div>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>
      {showRestart && (
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-1.5 text-xs text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          {t("onboarding.restart")}
        </Button>
      )}
    </div>
  );
};

export default WelcomeSection;
