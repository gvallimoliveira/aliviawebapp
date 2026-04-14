import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, UserPlus, UserCheck, CalendarX2, Loader2 } from "lucide-react";

interface SecretaryReportsCardProps {
  clinicId: string;
  lang: "pt" | "en" | "es";
}

type Period = "30" | "60" | "90";

const SecretaryReportsCard = ({ clinicId, lang }: SecretaryReportsCardProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30");

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));
    const cutoffISO = cutoff.toISOString();

    Promise.all([
      supabase
        .from("professional_appointments")
        .select("id, status, patient_email, appointment_date")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", cutoffISO.slice(0, 10)),
      supabase
        .from("assessments")
        .select("id, patient_email, created_at")
        .eq("clinic_id", clinicId)
        .gte("created_at", cutoffISO),
    ]).then(([apptRes, assessRes]) => {
      setAppointments(apptRes.data || []);
      setAssessments(assessRes.data || []);
      setLoading(false);
    });
  }, [clinicId, period]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const noShow = appointments.filter((a) => a.status === "no_show" || a.status === "cancelled").length;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

    // New vs returning: a patient is "new" if their first assessment in the period is within the period
    const emailFirstDate = new Map<string, string>();
    assessments.forEach((a) => {
      const email = a.patient_email;
      if (!email) return;
      const existing = emailFirstDate.get(email);
      if (!existing || a.created_at < existing) {
        emailFirstDate.set(email, a.created_at);
      }
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));

    // We consider "new" if first assessment is within the period window
    // To do this properly we'd need all-time data, so we approximate:
    // unique emails in this period
    const uniqueEmails = new Set(assessments.map((a) => a.patient_email).filter(Boolean));
    const totalPatients = uniqueEmails.size;

    // Count emails that have only 1 assessment in the period as "likely new"
    const emailCounts = new Map<string, number>();
    assessments.forEach((a) => {
      if (!a.patient_email) return;
      emailCounts.set(a.patient_email, (emailCounts.get(a.patient_email) || 0) + 1);
    });
    const newPatients = Array.from(emailCounts.values()).filter((c) => c === 1).length;
    const returningPatients = totalPatients - newPatients;

    return { total, completed, noShow, noShowRate, totalPatients, newPatients, returningPatients };
  }, [appointments, assessments, period]);

  const periodLabel = (p: Period) => {
    if (lang === "pt") return `${p} dias`;
    return `${p} days`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {lang === "pt" ? "Relatório do Período" : "Period Report"}
          </CardTitle>
          <div className="flex gap-1">
            {(["30", "60", "90"] as Period[]).map((p) => (
              <Badge
                key={p}
                variant={period === p ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0.5"
                onClick={() => setPeriod(p)}
              >
                {periodLabel(p)}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {lang === "pt" ? "Atendimentos" : "Appointments"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className={`text-2xl font-bold ${stats.noShowRate > 20 ? "text-destructive" : stats.noShowRate > 10 ? "text-amber-600" : "text-foreground"}`}>
                {stats.noShowRate}%
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <CalendarX2 className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {lang === "pt" ? "Taxa de faltas" : "No-show rate"}
                </p>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold text-primary">{stats.newPatients}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <UserPlus className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {lang === "pt" ? "Novos" : "New"}
                </p>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold text-foreground">{stats.returningPatients}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <UserCheck className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {lang === "pt" ? "Retorno" : "Returning"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecretaryReportsCard;
