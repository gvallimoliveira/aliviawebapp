import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Sparkles, Users, UserPlus, Crown } from "lucide-react";

interface QuickActionsProps {
  hasPremiumAccess?: boolean;
  premiumLoading: boolean;
  hasProfessional: boolean;
}

const QuickActions = ({ hasPremiumAccess, premiumLoading, hasProfessional }: QuickActionsProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <>
      {/* New Assessment Cards */}
      <div data-onboarding="patient-assessments" className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => navigate("/assessment/basic")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {t("dashboard.new_basic")}
            </CardTitle>
            <CardDescription className="text-sm">{t("dashboard.new_basic_desc")}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:shadow-md transition-all group bg-primary/[0.03]" onClick={() => navigate("/assessment/premium")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              {t("dashboard.new_premium")}
            </CardTitle>
            <CardDescription className="text-sm">{t("dashboard.new_premium_desc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Find Professional / Register CTA */}
      <div data-onboarding="patient-find-pro" className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group relative" onClick={() => navigate("/professionals")}>
          {!premiumLoading && !hasPremiumAccess && (
            <Badge variant="outline" className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {t("prof.find_professional")}
            </CardTitle>
            <CardDescription className="text-sm">{t("prof.cta_text")}</CardDescription>
          </CardHeader>
        </Card>
        {!hasProfessional && (
          <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => navigate("/professional/register")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                  <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {t("prof.register_cta")}
              </CardTitle>
              <CardDescription className="text-sm">{t("prof.register_cta_desc")}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  );
};

export default QuickActions;
