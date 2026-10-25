import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import SecretaryReportsCard from "../SecretaryReportsCard";

const ClinicOverviewMetrics = ({ clinicId }: { clinicId: string }) => {
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const [totals, setTotals] = useState<{ professionals: number; assessments: number; patients: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setTotals(null);
    setFailed(false);
    const load = async () => {
      try {
        const [members, assessments] = await Promise.all([
          supabase.from("clinic_members").select("user_id").eq("clinic_id", clinicId).eq("status", "active")
            .in("role", ["owner", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"]),
          supabase.from("assessments").select("id, patient_email").eq("clinic_id", clinicId),
        ]);
        if (members.error) throw members.error;
        if (assessments.error) throw assessments.error;
        const userIds = (members.data || []).map((m) => m.user_id);
        let professionals = 0;
        if (userIds.length) {
          const result = await supabase.from("professionals").select("id").in("user_id", userIds);
          if (result.error) throw result.error;
          professionals = result.data?.length || 0;
        }
        if (!cancelled) setTotals({ professionals, assessments: assessments.data?.length || 0,
          patients: new Set((assessments.data || []).map((a) => a.patient_email).filter(Boolean)).size });
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [clinicId]);
  const labels = lang === "pt" ? ["Profissionais", "Avaliações", "Pacientes"] : lang === "es" ? ["Profesionales", "Evaluaciones", "Pacientes"] : ["Therapists", "Assessments", "Patients"];
  return <div className="space-y-4">
    {failed ? <p role="alert" className="text-sm text-destructive">{lang === "pt" ? "Não foi possível carregar os totais da clínica." : lang === "es" ? "No se pudieron cargar los totales de la clínica." : "Could not load clinic totals."}</p> :
      <div className="grid grid-cols-3 gap-3">
        {labels.map((label, index) => <Card key={label}><CardContent className="py-4 text-center">
          <p className={`text-2xl font-bold ${index === 2 ? "text-primary" : "text-foreground"}`}>{totals ? [totals.professionals, totals.assessments, totals.patients][index] : "—"}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 whitespace-nowrap">{label}</p>
        </CardContent></Card>)}
      </div>}
    <SecretaryReportsCard key={clinicId} clinicId={clinicId} lang={lang} />
  </div>;
};

export default ClinicOverviewMetrics;