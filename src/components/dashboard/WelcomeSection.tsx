import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Stethoscope, Crown, RotateCcw, Building2, Star, Briefcase, ClipboardList, UserCog, GraduationCap } from "lucide-react";
import AdminSupportInboxButton from "./AdminSupportInboxButton";



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
  const { activeContext, activeClinic } = useClinic();
  const [clinicActive, setClinicActive] = useState(false);

  // Check if partner has active clinic
  useEffect(() => {
    if (!professional?.is_partner || !professional?.user_id) return;
    (supabase.from("clinics") as any)
      .select("subscription_status")
      .eq("owner_user_id", professional.user_id)
      .maybeSingle()
      .then(({ data }: any) => {
        setClinicActive(data?.subscription_status === "active" || data?.subscription_status === "trialing");
      });
  }, [professional?.is_partner, professional?.user_id]);

  const renderBadge = () => {
    const isAdmin = userEmail === "gvallimoliveira@gmail.com";
    if (isAdmin) {
      return (
        <div className="flex items-center gap-1.5">
          <Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 gap-1 cursor-pointer hover:bg-destructive/80 transition-colors" onClick={() => navigate("/admin")}><Shield className="h-3 w-3" />Admin</Badge>
          <AdminSupportInboxButton userEmail={userEmail} />
        </div>
      );
    }

    // Clinic role badge (owner / secretary / therapist) when in clinic context
    const clinicRoleBadge =
      activeContext === "clinic" && activeClinic?.role
        ? (() => {
            const role = activeClinic.role;
            if (role === "owner") {
              return (
                <Badge className="bg-teal-600 text-white text-[10px] px-2 py-0.5 gap-1">
                  <UserCog className="h-3 w-3" />Proprietário(a)
                </Badge>
              );
            }
            if (role === "secretary") {
              return (
                <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 gap-1">
                  <ClipboardList className="h-3 w-3" />Secretaria
                </Badge>
              );
            }
            // therapist
            return (
              <Badge className="bg-sky-600 text-white text-[10px] px-2 py-0.5 gap-1">
                <Briefcase className="h-3 w-3" />Fisioterapeuta
              </Badge>
            );
          })()
        : null;

    // Academic mode: always show academic badge (overrides PRO branch even when
    // subscription_status='active' was granted by the admin Academic toggle).
    const isAcademicMode =
      professional?.active_profile_mode === "student" ||
      (professional?.is_student && !professional?.is_partner);

    // Professional/Clinic context: show Pro badge
    if (activeContext === "professional" || activeContext === "clinic") {
      if (isAcademicMode) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {clinicRoleBadge}
            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 gap-1">
              <GraduationCap className="h-3 w-3" />Acadêmico
            </Badge>
          </div>
        );
      }
      if (professional?.is_partner) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {clinicRoleBadge}
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1">
              <Stethoscope className="h-3 w-3" />PRO
            </Badge>
            {clinicActive && (
              <Badge className="bg-teal-600 text-white text-[10px] px-2 py-0.5 gap-1">
                <Building2 className="h-3 w-3" />Clínica
              </Badge>
            )}
            {professional?.premium_granted && (
              <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 gap-1">
                <Star className="h-3 w-3" />Premium
              </Badge>
            )}
          </div>
        );
      }
      if (professional?.subscription_status === "active" && professional?.pro_access_expires_at) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {clinicRoleBadge}
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />PRO Anual</Badge>
          </div>
        );
      }
      if (professional?.subscription_status === "active") {
        return (
          <div className="flex flex-wrap gap-1.5">
            {clinicRoleBadge}
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />PRO Mensal</Badge>
          </div>
        );
      }
      // No PRO badge but in clinic mode (e.g., secretary without professional profile)
      if (clinicRoleBadge) {
        return <div className="flex flex-wrap gap-1.5">{clinicRoleBadge}</div>;
      }
    }

    // Na aba saúde/mensagens, mostrar apenas status B2C (Premium/Básico)
    const isGranted = (premiumAccess as any)?.is_granted === true;
    if (premiumAccess?.subscription_type === "monthly") {
      return <Badge className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 gap-1"><Crown className="h-3 w-3" />{isGranted ? "Premium Liberado" : "Premium Mensal"}</Badge>;
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
          <h1 className="text-xl md:text-3xl font-bold text-foreground">
            {t("dashboard.welcome")}{profileName ? `, ${profileName}` : ""}
          </h1>
          {renderBadge()}
        </div>
        <p className="hidden md:block text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
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
