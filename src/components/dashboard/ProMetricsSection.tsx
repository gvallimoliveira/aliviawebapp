import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import ProAnalyticsCharts from "./ProAnalyticsCharts";
import AiCreditsWidget from "./AiCreditsWidget";

interface Props {
  professionalId?: string;
  clinicId?: string;
}

/**
 * Self-fetched metrics block (totals + analytics charts) for the Insights tab.
 * Mirrors the slim columns used by ProDashboard so the two stay aligned.
 */
const ProMetricsSection = ({ professionalId, clinicId }: Props) => {
  const { t } = useLanguage();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLUMNS =
    "id, professional_id, clinic_id, status, pain_regions, " +
    "diagnosis, treatment_plan, red_flags, reviewed_at, created_at";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let merged: any[] = [];
      if (professionalId) {
        const { data } = await supabase
          .from("assessments")
          .select(COLUMNS)
          .eq("professional_id", professionalId)
          .order("created_at", { ascending: false })
          .limit(500);
        merged = (data as any[]) || [];
      }
      if (clinicId) {
        const { data } = await supabase
          .from("assessments")
          .select(COLUMNS)
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false })
          .limit(500);
        const ids = new Set(merged.map((a: any) => a.id));
        for (const a of (data as any[]) || []) {
          if (!ids.has(a.id)) merged.push(a);
        }
      }
      if (!cancelled) {
        setAssessments(merged);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [professionalId, clinicId]);

  const thisMonth = useMemo(() => {
    const d = new Date();
    const m = d.getMonth();
    const y = d.getFullYear();
    return assessments.filter((a) => {
      const dt = new Date(a.created_at);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
  }, [assessments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Credits stay visible even before the first assessment.
  if (assessments.length === 0) return <AiCreditsWidget />;

  return (
    <div className="space-y-4">
      {/* Mobile: horizontal peek carousel */}
      <div className="md:hidden -mx-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-3 px-4 pb-1">
          <Card className="snap-start shrink-0 basis-[40%]">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t("pro.total_assessments")}</p>
            </CardContent>
          </Card>
          <Card className="snap-start shrink-0 basis-[40%]">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-primary">{thisMonth}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t("pro.this_month")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Desktop / tablet: grid */}
      <div className="hidden md:grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">{assessments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.total_assessments")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{thisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.this_month")}</p>
          </CardContent>
        </Card>
      </div>
      <ProAnalyticsCharts assessments={assessments} />
      <AiCreditsWidget />
    </div>
  );
};

export default ProMetricsSection;
