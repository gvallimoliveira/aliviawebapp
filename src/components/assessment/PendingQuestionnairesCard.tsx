import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Heart, Footprints, Check, Link as LinkIcon, Trash2, ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getSpecialtyQuestionnaire } from "@/data/specialtyQuestionnaires";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

interface Props {
  assessmentId: string;
  canManage: boolean;
}

export default function PendingQuestionnairesCard({ assessmentId, canManage }: Props) {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pending_questionnaires")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [assessmentId]);

  if (loading || items.length === 0) return null;

  const pending = items.filter((x) => x.status !== "completed");
  const completed = items.filter((x) => x.status === "completed");

  const copyLink = (token: string, id: string) => {
    const link = `${getPublicOrigin()}/q/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(id);
      toast({ title: isPt ? "Link copiado" : "Link copied" });
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const cancel = async (id: string) => {
    await supabase.from("pending_questionnaires").delete().eq("id", id);
    setItems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <Card>
      <CardContent className="py-3">
        <CollapsibleSection
          storageKey={`assessment:${assessmentId}:pending-questionnaires`}
          defaultOpen
          header={
            <div className="text-base font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              {isPt ? "Questionários Especializados" : "Specialty Questionnaires"}
              <Badge variant="outline" className="text-[10px] font-normal">{items.length}</Badge>
            </div>
          }
        >
          <div className="py-2 space-y-3">
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {isPt ? "Pendentes" : "Pending"}
                </p>
                {pending.map((p) => {
                  const q = getSpecialtyQuestionnaire(p.questionnaire_id);
                  if (!q) return null;
                  const Icon = q.domain === "cardio" ? Heart : Footprints;
                  return (
                    <div key={p.id} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${q.domain === "cardio" ? "text-rose-500" : "text-amber-600"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{q.name}</p>
                          <p className="text-[11px] text-muted-foreground">{isPt ? q.fullName_pt : q.fullName_en}</p>
                          {p.suggested_reason && (
                            <p className="text-[10px] italic text-muted-foreground mt-0.5">{p.suggested_reason}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          {isPt ? "Agendado" : "Scheduled"}
                        </Badge>
                      </div>
                      {canManage && p.share_token && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => copyLink(p.share_token, p.id)}>
                            {copied === p.id ? <Check className="h-3 w-3 text-emerald-600" /> : <LinkIcon className="h-3 w-3" />}
                            {isPt ? "Copiar link" : "Copy link"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive gap-1" onClick={() => cancel(p.id)}>
                            <Trash2 className="h-3 w-3" />
                            {isPt ? "Cancelar" : "Cancel"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {isPt ? "Respondidos" : "Completed"}
                </p>
                {completed.map((c) => {
                  const q = getSpecialtyQuestionnaire(c.questionnaire_id);
                  if (!q) return null;
                  const Icon = q.domain === "cardio" ? Heart : Footprints;
                  const score = c.score as any;
                  return (
                    <div key={c.id} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${q.domain === "cardio" ? "text-rose-500" : "text-amber-600"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{q.name}</p>
                          {score && (
                            <p className="text-[11px] text-foreground/80">
                              {isPt ? score.interpretation_pt : score.interpretation_en}
                              {score.total != null && ` (${score.total}/${score.max})`}
                            </p>
                          )}
                          {c.completed_via && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {c.completed_via === "patient_link"
                                ? (isPt ? "Respondido pelo paciente via link" : "Answered by patient via link")
                                : (isPt ? "Aplicado em consulta" : "Applied during session")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
