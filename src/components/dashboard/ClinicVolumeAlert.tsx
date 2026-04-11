import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface ClinicVolumeAlertProps {
  clinicId: string;
}

const ClinicVolumeAlert = ({ clinicId }: ClinicVolumeAlertProps) => {
  const { language } = useLanguage();
  const [alert, setAlert] = useState<{ currentMonth: number; avgPrevious: number } | null>(null);

  useEffect(() => {
    const checkVolume = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Current month count
      const { count: currentMonth } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", startOfMonth);

      if (!currentMonth || currentMonth < 10) return; // Don't alert on low volumes

      // Previous 3 months average
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      const startOfCurrentMonth = startOfMonth;

      const { count: previousTotal } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", threeMonthsAgo)
        .lt("created_at", startOfCurrentMonth);

      const avgPrevious = (previousTotal || 0) / 3;

      if (avgPrevious > 0 && currentMonth > avgPrevious * 2) {
        setAlert({ currentMonth, avgPrevious: Math.round(avgPrevious) });
      }
    };

    checkVolume();
  }, [clinicId]);

  if (!alert) return null;

  const labels = {
    pt: {
      title: "Volume de avaliações acima do normal",
      desc: `Este mês: ${alert.currentMonth} avaliações — média dos últimos 3 meses: ${alert.avgPrevious}. Verifique se o uso está dentro do esperado.`,
    },
    en: {
      title: "Assessment volume above normal",
      desc: `This month: ${alert.currentMonth} assessments — 3-month average: ${alert.avgPrevious}. Check if usage is within expectations.`,
    },
    es: {
      title: "Volumen de evaluaciones por encima de lo normal",
      desc: `Este mes: ${alert.currentMonth} evaluaciones — promedio de 3 meses: ${alert.avgPrevious}. Verifique si el uso es el esperado.`,
    },
  };

  const l = labels[language as keyof typeof labels] || labels.pt;

  return (
    <Card className="border-amber-300 bg-amber-500/5">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {l.title}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">{l.desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicVolumeAlert;
