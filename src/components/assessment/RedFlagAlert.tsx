import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface RedFlagAlertProps {
  mode?: "default" | "professional";
  flaggedItems?: Record<string, boolean>;
  professionalName?: string;
}

const RedFlagAlert = ({ mode = "default", flaggedItems, professionalName }: RedFlagAlertProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isProfessional = mode === "professional";
  const positiveFlags = flaggedItems
    ? Object.entries(flaggedItems).filter(([, v]) => v === true).map(([k]) => k)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className={`max-w-lg w-full ${isProfessional ? "border-yellow-300/50 bg-yellow-50/30" : "border-destructive/30 bg-destructive/5"}`}>
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isProfessional ? "bg-yellow-100" : "bg-destructive/10"}`}>
            {isProfessional ? (
              <Stethoscope className="h-8 w-8 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <h2 className={`text-2xl font-bold ${isProfessional ? "text-yellow-700" : "text-destructive"}`}>
            {isProfessional ? t("redflag_alert.pro_title") : t("redflag_alert.title")}
          </h2>
          <p className="text-foreground leading-relaxed">
            {isProfessional
              ? t("redflag_alert.pro_message").replace("{name}", professionalName || t("pro.anonymous_patient"))
              : t("redflag_alert.message")}
          </p>
          {isProfessional && positiveFlags.length > 0 && (
            <div className="text-left bg-yellow-100/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-yellow-800">{t("redflag_alert.pro_items_title")}</p>
              <ul className="space-y-1">
                {positiveFlags.map((key) => (
                  <li key={key} className="text-sm text-yellow-700 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {isProfessional ? t("redflag_alert.pro_recommendation") : t("redflag_alert.recommendation")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("redflag_alert.back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RedFlagAlert;
