import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, MessageSquareQuote, Smile, Meh, Frown } from "lucide-react";
import { DEMO_FEEDBACK } from "@/data/mockClinicData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DemoFeedbackMock = () => {
  const F = DEMO_FEEDBACK;
  const promPct = (F.promoters / F.total_responses) * 100;
  const passPct = (F.passives / F.total_responses) * 100;
  const detPct = (F.detractors / F.total_responses) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Pesquisa de satisfação (NPS)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-background p-3">
              <p className="text-[11px] text-muted-foreground uppercase">NPS atual</p>
              <p className="text-3xl font-bold text-primary mt-0.5">{F.nps}</p>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40 text-[10px] mt-1">Zona de excelência</Badge>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Respostas</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{F.total_responses}</p>
              <p className="text-[11px] text-muted-foreground">últimos 30 dias</p>
            </div>
            <div className="rounded-xl border p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[11px] text-emerald-600"><Smile className="h-3.5 w-3.5" /> Promotores</div>
              <Progress value={promPct} className="h-1.5" />
              <p className="text-xs font-semibold">{F.promoters} ({promPct.toFixed(0)}%)</p>
            </div>
            <div className="rounded-xl border p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[11px] text-amber-600"><Meh className="h-3.5 w-3.5" /> Passivos / <Frown className="h-3.5 w-3.5 text-destructive" /> Detratores</div>
              <Progress value={passPct + detPct} className="h-1.5" />
              <p className="text-xs font-semibold">{F.passives + F.detractors} ({(passPct + detPct).toFixed(0)}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-primary" /> Comentários recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {F.recent.map((r) => (
              <div key={r.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold">{r.patient_name}</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < r.score ? "bg-primary" : "bg-muted"}`} />
                    ))}
                    <span className="text-[10px] font-semibold text-primary ml-1">{r.score}/10</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">"{r.comment}"</p>
                <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(r.at), "dd MMM", { locale: ptBR })}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoFeedbackMock;
