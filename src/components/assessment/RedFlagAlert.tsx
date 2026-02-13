import { motion } from "framer-motion";
import { AlertTriangle, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const RedFlagAlert = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-lg w-full border-destructive/30 bg-destructive/5">
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-destructive">
            {t("redflag_alert.title")}
          </h2>
          <p className="text-foreground leading-relaxed">
            {t("redflag_alert.message")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("redflag_alert.recommendation")}
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
