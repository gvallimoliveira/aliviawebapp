import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, MapPin, ExternalLink, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ProScheduleCardProps {
  professionalId: string;
  onNavigateToSchedule: () => void;
}

const TYPE_ICONS: Record<string, typeof Video> = {
  video_call: Video,
  in_person: MapPin,
  external: ExternalLink,
};

const TYPE_COLORS: Record<string, string> = {
  video_call: "bg-blue-500/10 text-blue-600 border-blue-200",
  in_person: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  external: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const ProScheduleCard = ({ professionalId, onNavigateToSchedule }: ProScheduleCardProps) => {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    (supabase.from("professional_appointments" as any) as any)
      .select("*")
      .eq("professional_id", professionalId)
      .eq("appointment_date", today)
      .eq("status", "scheduled")
      .order("appointment_time", { ascending: true })
      .then(({ data }: any) => {
        setAppointments(data || []);
        setLoading(false);
      });
  }, [professionalId]);

  return (
    <Card
      className="border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onNavigateToSchedule}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t("schedule.today_title")}
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardDescription className="text-xs">
          {appointments.length > 0
            ? `${appointments.length} ${t("schedule.appointments_count")}`
            : t("schedule.no_appointments")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t("schedule.empty_day")}</p>
        ) : (
          <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
            {appointments.map((apt: any) => {
              const Icon = TYPE_ICONS[apt.type] || MapPin;
              const colorClass = TYPE_COLORS[apt.type] || TYPE_COLORS.in_person;
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {apt.appointment_time?.slice(0, 5)}
                    </span>
                  </div>
                  <span className="text-xs text-foreground truncate flex-1">{apt.patient_name}</span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                    {t(`schedule.type_${apt.type}`)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProScheduleCard;
