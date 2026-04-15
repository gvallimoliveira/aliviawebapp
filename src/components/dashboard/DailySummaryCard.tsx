import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, Users, AlertCircle, ChevronRight, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";

interface DailySummaryCardProps {
  professionalId?: string;
  clinicId?: string;
  onNavigateToAgenda?: () => void;
  onNavigateToPatients?: () => void;
}

interface TodayAppointment {
  id: string;
  patient_name: string;
  appointment_time: string;
  type: string;
  status: string;
}

interface PendingAssessment {
  id: string;
  patient_name: string | null;
  patient_email: string | null;
  created_at: string;
  status: string;
}

const DailySummaryCard = ({
  professionalId,
  clinicId,
  onNavigateToAgenda,
  onNavigateToPatients,
}: DailySummaryCardProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isPt = language === "pt";
  const locale = language === "en" ? enUS : language === "es" ? es : ptBR;

  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [pendingAssessmentsList, setPendingAssessmentsList] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [professionalId, clinicId]);

  const loadSummary = async () => {
    if (!professionalId && !clinicId) return;
    setLoading(true);

    const today = format(new Date(), "yyyy-MM-dd");

    // Load today's appointments
    let aptQuery = supabase
      .from("professional_appointments")
      .select("id, patient_name, appointment_time, type, status")
      .eq("appointment_date", today)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });

    if (clinicId) {
      aptQuery = aptQuery.eq("clinic_id", clinicId);
    } else if (professionalId) {
      aptQuery = aptQuery.eq("professional_id", professionalId);
    }

    const { data: apts } = await aptQuery;
    setTodayAppointments((apts as TodayAppointment[]) || []);

    // Load pending assessments (in_progress) with details
    let assessQuery = supabase
      .from("assessments")
      .select("id, patient_name, patient_email, created_at, status")
      .eq("status", "in_progress")
      .order("created_at", { ascending: false });

    if (clinicId) {
      assessQuery = assessQuery.eq("clinic_id", clinicId);
    } else if (professionalId) {
      assessQuery = assessQuery.eq("professional_id", professionalId);
    }

    const { data: pendingData } = await assessQuery;
    setPendingAssessmentsList((pendingData as PendingAssessment[]) || []);

    setLoading(false);
  };

  const now = new Date();
  const currentTime = format(now, "HH:mm");

  const nextAppointment = useMemo(() => {
    return todayAppointments.find(
      (a) => a.appointment_time >= currentTime && a.status === "scheduled"
    );
  }, [todayAppointments, currentTime]);

  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;
  const remainingCount = todayAppointments.filter(
    (a) => a.status === "scheduled" && a.appointment_time >= currentTime
  ).length;

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="py-5 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = pendingAssessmentsList.length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <CardContent className="py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {isPt ? "Resumo do dia" : "Daily Summary"}
            </h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(now, "EEEE, d MMM", { locale })}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-background/60 border border-border/50">
            <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {isPt ? "Agendamentos" : "Appointments"}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/60 border border-border/50">
            <p className="text-2xl font-bold text-primary">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {isPt ? "Concluídos" : "Completed"}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/60 border border-border/50">
            <p className="text-2xl font-bold text-primary">{remainingCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {isPt ? "Restantes" : "Remaining"}
            </p>
          </div>
        </div>

        {/* Next appointment */}
        {nextAppointment && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {isPt ? "Próximo atendimento" : "Next appointment"}
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {nextAppointment.appointment_time.slice(0, 5)} — {nextAppointment.patient_name}
              </p>
            </div>
            {onNavigateToAgenda && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 w-7 p-0"
                onClick={onNavigateToAgenda}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Pending assessments alert - clickable with expandable list */}
        {pendingCount > 0 && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 overflow-hidden">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center gap-3 p-3 hover:bg-destructive/10 transition-colors"
            >
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm text-foreground">
                  <span className="font-medium text-destructive">
                    {pendingCount} {isPt ? "avaliação(ões) pendente(s)" : "pending assessment(s)"}
                  </span>
                </p>
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {expanded && (
              <div className="border-t border-destructive/10 divide-y divide-destructive/10">
                {pendingAssessmentsList.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/assessment/${a.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {a.patient_name || a.patient_email || (isPt ? "Paciente anônimo" : "Anonymous patient")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700 bg-amber-50">
                      {isPt ? "Em andamento" : "In progress"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {todayAppointments.length === 0 && pendingCount === 0 && (
          <div className="text-center py-2">
            <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isPt ? "Nenhum agendamento para hoje" : "No appointments for today"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySummaryCard;
