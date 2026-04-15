import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart3, Loader2, Star, ThumbsUp, ThumbsDown } from "lucide-react";

const SERVICE_LABELS: Record<string, string> = {
  fisioterapia: "Fisio",
  pilates: "Pilates",
  osteopatia: "Osteopatia",
  massoterapia: "Massot.",
  rpg: "RPG",
};

const SERVICE_COLORS: Record<string, string> = {
  fisioterapia: "bg-teal-100 text-teal-800",
  pilates: "bg-purple-100 text-purple-800",
  osteopatia: "bg-orange-100 text-orange-800",
  massoterapia: "bg-pink-100 text-pink-800",
  rpg: "bg-indigo-100 text-indigo-800",
};

interface FeedbackResultsCardProps {
  clinicId: string;
  lang: "pt" | "en" | "es";
}

const FeedbackResultsCard = ({ clinicId, lang }: FeedbackResultsCardProps) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    supabase
      .from("clinic_feedback_surveys")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setFeedbacks(data || []);
        setLoading(false);
      });
  }, [clinicId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const filtered = serviceFilter === "all" ? feedbacks : feedbacks.filter((f) => f.service_type === serviceFilter);

  // NPS-like: count recommends
  const recommends = filtered.filter((f) => (f.service_answers as any)?.recommend === "sim").length;
  const detractors = filtered.filter((f) => (f.service_answers as any)?.recommend === "nao").length;
  const nps = filtered.length > 0 ? Math.round(((recommends - detractors) / filtered.length) * 100) : 0;

  // Quality summary
  const qualityCounts: Record<string, number> = {};
  filtered.forEach((f) => {
    const q = (f.service_answers as any)?.quality;
    if (q) qualityCounts[q] = (qualityCounts[q] || 0) + 1;
  });

  const activeServices = [...new Set(feedbacks.map((f) => f.service_type))];

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">
              {lang === "pt" ? "Resultados de Feedback" : "Feedback Results"}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">{filtered.length} respostas</Badge>
        </div>

        {/* Service filter */}
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              {lang === "pt" ? "Todos os serviços" : "All services"}
            </SelectItem>
            {activeServices.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {SERVICE_LABELS[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {lang === "pt" ? "Nenhum feedback recebido ainda." : "No feedback received yet."}
          </p>
        ) : (
          <>
            {/* NPS score */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className={`text-2xl font-bold ${nps >= 0 ? "text-emerald-600" : "text-red-500"}`}>{nps}</p>
                <p className="text-[10px] text-muted-foreground">NPS</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-lg font-bold text-emerald-600">{recommends}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Promotores</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-lg font-bold text-red-500">{detractors}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Detratores</p>
              </div>
            </div>

            {/* Quality breakdown */}
            {Object.keys(qualityCounts).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {lang === "pt" ? "Qualidade do atendimento" : "Service quality"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(qualityCounts).map(([key, count]) => (
                    <Badge key={key} variant="outline" className="text-[10px]">
                      {key}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent feedbacks */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">
                {lang === "pt" ? "Feedbacks recentes" : "Recent feedback"}
              </p>
              {filtered.slice(0, 10).map((f) => (
                <div key={f.id} className="border border-border/50 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{f.patient_name || "Anônimo"}</span>
                    <Badge className={`text-[9px] ${SERVICE_COLORS[f.service_type] || ""}`}>
                      {SERVICE_LABELS[f.service_type] || f.service_type}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(f.service_answers as any)?.quality && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" /> {(f.service_answers as any).quality}
                      </span>
                    )}
                    {(f.service_answers as any)?.recommend && (
                      <span className="text-[10px] text-muted-foreground">
                        Recomenda: {(f.service_answers as any).recommend}
                      </span>
                    )}
                  </div>
                  {f.general_observations && (
                    <p className="text-[10px] text-muted-foreground italic">"{f.general_observations}"</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/60">
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackResultsCard;
