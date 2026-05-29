import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DEMO_APPOINTMENTS, DEMO_CLINIC_ASSESSMENTS } from "@/data/mockClinicData";

interface Props {
  /** Optional filter; if provided only that professional's appts are summarized */
  professionalId?: string;
}

const DemoDailySummaryMock = ({ professionalId }: Props) => {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayApts = DEMO_APPOINTMENTS.filter((a) =>
    a.appointment_date === todayStr && (!professionalId || a.professional_id === professionalId)
  );
  const unassigned = DEMO_CLINIC_ASSESSMENTS.filter((a) => !a.professional_id && a.status === "completed");
  const completed = todayApts.filter((a) => a.status === "completed").length;
  const scheduled = todayApts.length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Resumo de hoje</p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <Calendar className="h-3 w-3" /> Agendados
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{scheduled}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <CheckCircle2 className="h-3 w-3" /> Concluídos
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completed}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <Users className="h-3 w-3" /> No pool
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{unassigned.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <TrendingUp className="h-3 w-3" /> Ocupação
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">78%</p>
          </div>
        </div>

        {unassigned.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-500/5 p-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">{unassigned.length} avaliação(ões) aguardando atribuição</span> a um fisioterapeuta.
              <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px]">Pool</Badge>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DemoDailySummaryMock;
