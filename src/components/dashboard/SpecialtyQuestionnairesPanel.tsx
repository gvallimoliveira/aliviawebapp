// Specialty (cardio/geri) questionnaires suggestion panel — used inside the
// manual assessment flow. Lets the therapist pick which AI-suggested
// questionnaires to apply now (inline) or schedule for later (pending row +
// optional patient link). Kept self-contained from the mandatory MSK
// questionnaires.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Loader2, Lightbulb, Sparkles, Clock, ChevronDown, ChevronUp, Link as LinkIcon, Check, Heart, Footprints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  SPECIALTY_QUESTIONNAIRES,
  getSpecialtyQuestionnaire,
  scoreSpecialtyQuestionnaire,
  type SpecialtyDomain,
  type SpecQScoreResult,
} from "@/data/specialtyQuestionnaires";

export interface SpecialtyAppliedResult {
  questionnaireId: string;
  questionnaireName: string;
  domain: SpecialtyDomain;
  answers: Record<string, number>;
  score: SpecQScoreResult;
}

interface Suggestion {
  id: string;
  domain: SpecialtyDomain;
  name: string;
  reason: string;
  avgMinutes: number;
}

interface ScheduledItem {
  questionnaireId: string;
  domain: SpecialtyDomain;
  suggestedReason: string;
  share_token?: string;
  shortLink?: string;
}

export interface SpecialtyPanelHandle {
  /** Returns the questionnaires the user opted to schedule for later, so the
   *  parent can insert pending_questionnaires rows once the assessment id is known. */
  getScheduled: () => ScheduledItem[];
  /** Convenience: returns currently applied (inline) results. */
  getApplied: () => SpecialtyAppliedResult[];
}

interface Props {
  anamnesisData: any;
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string;
  /** Existing assessment id when editing — enables creating pending rows immediately. */
  assessmentId?: string | null;
  /** Called whenever an inline questionnaire is completed. */
  onApplied: (results: SpecialtyAppliedResult[]) => void;
  initialApplied?: SpecialtyAppliedResult[];
}

const SpecialtyQuestionnairesPanel = forwardRef<SpecialtyPanelHandle, Props>(
  ({ anamnesisData, professionalId, clinicId, patientName, patientEmail, assessmentId, onApplied, initialApplied }, ref) => {
    const { language } = useLanguage();
    const { toast } = useToast();
    const isPt = language === "pt";

    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [applied, setApplied] = useState<SpecialtyAppliedResult[]>(initialApplied || []);
    const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);
    const [draftAnswers, setDraftAnswers] = useState<Record<string, number>>({});
    const [copied, setCopied] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getScheduled: () => scheduled,
      getApplied: () => applied,
    }), [scheduled, applied]);

    // Notify parent on changes
    useEffect(() => { onApplied(applied); }, [applied, onApplied]);

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("suggest-specialty-questionnaires", {
          body: { anamnesisData },
        });
        if (error) throw error;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setLoaded(true);
      } catch (err) {
        console.error("specialty suggest error:", err);
        setSuggestions([]);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    const isApplied = (id: string) => applied.some((a) => a.questionnaireId === id);
    const isScheduled = (id: string) => scheduled.some((s) => s.questionnaireId === id);

    const openQuestionnaire = (id: string) => {
      const q = getSpecialtyQuestionnaire(id);
      if (!q) return;
      // Pre-fill min values
      const init: Record<string, number> = {};
      q.items.forEach((it) => {
        if (it.type === "choice" && it.options?.length) init[it.id] = it.options[0].value;
        if (it.type === "number") init[it.id] = it.min ?? 0;
      });
      setDraftAnswers(init);
      setOpenId(id);
    };

    const saveInline = () => {
      if (!openId) return;
      const q = getSpecialtyQuestionnaire(openId);
      if (!q) return;
      const score = scoreSpecialtyQuestionnaire(openId, draftAnswers);
      if (!score) return;
      const result: SpecialtyAppliedResult = {
        questionnaireId: openId,
        questionnaireName: q.name,
        domain: q.domain,
        answers: draftAnswers,
        score,
      };
      setApplied((prev) => [...prev.filter((p) => p.questionnaireId !== openId), result]);
      setScheduled((prev) => prev.filter((s) => s.questionnaireId !== openId));
      setOpenId(null);
      toast({ title: isPt ? `${q.name} aplicado` : `${q.name} applied`, description: isPt ? score.interpretation_pt : score.interpretation_en });
    };

    const scheduleForLater = async (s: Suggestion) => {
      // If we already have an assessment id, persist immediately and copy link
      if (assessmentId) {
        try {
          const insertRow: any = {
            assessment_id: assessmentId,
            professional_id: clinicId ? null : professionalId,
            clinic_id: clinicId || null,
            questionnaire_id: s.id,
            domain: s.domain,
            suggested_reason: s.reason,
            status: "pending",
          };
          const { data, error } = await supabase
            .from("pending_questionnaires" as any)
            .insert(insertRow)
            .select("id, share_token")
            .single();
          if (error) throw error;
          const token = (data as any)?.share_token as string;
          const link = `${window.location.origin}/q/${token}`;
          setScheduled((prev) => [...prev.filter((x) => x.questionnaireId !== s.id), {
            questionnaireId: s.id, domain: s.domain, suggestedReason: s.reason, share_token: token, shortLink: link,
          }]);
          toast({ title: isPt ? "Agendado para depois" : "Scheduled for later" });
        } catch (err: any) {
          console.error("schedule pending error:", err);
          toast({ title: isPt ? "Não foi possível agendar" : "Could not schedule", description: err?.message, variant: "destructive" });
        }
      } else {
        // No assessment yet — keep in memory; parent will persist on save
        setScheduled((prev) => [...prev.filter((x) => x.questionnaireId !== s.id), {
          questionnaireId: s.id, domain: s.domain, suggestedReason: s.reason,
        }]);
        toast({
          title: isPt ? "Marcado para agendar" : "Marked to schedule",
          description: isPt ? "Será salvo ao finalizar a avaliação." : "Will be saved when the assessment is finalized.",
        });
      }
    };

    const undoSchedule = async (id: string) => {
      const entry = scheduled.find((s) => s.questionnaireId === id);
      if (entry?.share_token) {
        try {
          await supabase.from("pending_questionnaires" as any)
            .delete()
            .eq("share_token", entry.share_token);
        } catch (err) {
          console.warn("undo schedule failed:", err);
        }
      }
      setScheduled((prev) => prev.filter((s) => s.questionnaireId !== id));
    };

    const copyLink = (link: string, id: string) => {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(id);
        toast({ title: isPt ? "Link copiado" : "Link copied" });
        setTimeout(() => setCopied(null), 1500);
      });
    };

    const openQ = useMemo(() => (openId ? getSpecialtyQuestionnaire(openId) : null), [openId]);
    const visibleSuggestions = suggestions.filter((s) => !isApplied(s.id));

    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            {isPt ? "Questionários especializados (Cardio / Geriátrico)" : "Specialty questionnaires (Cardio / Geri)"}
          </div>
          <Button
            type="button"
            onClick={loadSuggestions}
            disabled={loading || !anamnesisData}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {loaded ? (isPt ? "Atualizar" : "Refresh") : (isPt ? "Sugerir com IA" : "Suggest with AI")}
          </Button>
        </div>

        {!loaded && (
          <p className="text-[11px] text-muted-foreground leading-snug">
            {isPt
              ? "A IA analisa a anamnese e sugere instrumentos validados de fisioterapia cardiorrespiratória ou geriátrica quando aplicável. Você escolhe quais aplicar agora ou enviar ao paciente para responder depois."
              : "AI analyses the anamnesis and proposes validated cardiorespiratory or geriatric instruments when applicable. You pick which to apply now or send to the patient for later."}
          </p>
        )}

        {loaded && visibleSuggestions.length === 0 && applied.length === 0 && scheduled.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            {isPt
              ? "Nenhuma sugestão especializada para esta anamnese. Você pode prosseguir normalmente."
              : "No specialty suggestions for this anamnesis. You can proceed normally."}
          </p>
        )}

        {visibleSuggestions.length > 0 && (
          <div className="space-y-2">
            {visibleSuggestions.map((s) => {
              const sched = scheduled.find((x) => x.questionnaireId === s.id);
              const expanded = openId === s.id;
              const Icon = s.domain === "cardio" ? Heart : Footprints;
              return (
                <div key={s.id} className="rounded-md border bg-background p-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${s.domain === "cardio" ? "text-rose-500" : "text-amber-600"}`} />
                        <span className="text-xs font-semibold text-foreground truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                          ~{s.avgMinutes} min
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!sched && (
                      <Button type="button" size="sm" variant="default" className="h-7 px-2 text-[11px] gap-1" onClick={() => (expanded ? setOpenId(null) : openQuestionnaire(s.id))}>
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isPt ? "Aplicar agora" : "Apply now"}
                      </Button>
                    )}
                    {!sched ? (
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => scheduleForLater(s)}>
                        <Clock className="h-3 w-3" />
                        {isPt ? "Aplicar depois" : "Apply later"}
                      </Button>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-3 w-3" />{isPt ? "Agendado" : "Scheduled"}</Badge>
                        {sched.shortLink && (
                          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => copyLink(sched.shortLink!, s.id)}>
                            {copied === s.id ? <Check className="h-3 w-3 text-emerald-600" /> : <LinkIcon className="h-3 w-3" />}
                            {isPt ? "Copiar link" : "Copy link"}
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-muted-foreground" onClick={() => undoSchedule(s.id)}>
                          <X className="h-3 w-3" /> {isPt ? "Cancelar" : "Cancel"}
                        </Button>
                      </>
                    )}
                  </div>

                  {expanded && openQ && openQ.id === s.id && (
                    <div className="mt-2 rounded-md border bg-muted/30 p-2 space-y-2">
                      <p className="text-[11px] font-medium text-foreground">{isPt ? openQ.fullName_pt : openQ.fullName_en}</p>
                      <p className="text-[10px] text-muted-foreground italic">{isPt ? openQ.description_pt : openQ.description_en}</p>
                      <div className="space-y-2 pt-1">
                        {openQ.items.map((it) => (
                          <div key={it.id} className="space-y-1">
                            <Label className="text-[11px] leading-snug block">{isPt ? it.text_pt : it.text_en}</Label>
                            {it.type === "choice" && it.options && (
                              <div className="grid grid-cols-1 gap-1">
                                {it.options.map((op) => (
                                  <label key={op.value} className="flex items-center gap-2 text-[11px] cursor-pointer rounded px-1.5 py-0.5 hover:bg-background">
                                    <input
                                      type="radio"
                                      name={`${openQ.id}-${it.id}`}
                                      checked={draftAnswers[it.id] === op.value}
                                      onChange={() => setDraftAnswers((d) => ({ ...d, [it.id]: op.value }))}
                                    />
                                    <span>{isPt ? op.label_pt : op.label_en}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {it.type === "number" && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={draftAnswers[it.id] ?? 0}
                                  min={it.min}
                                  max={it.max}
                                  onChange={(e) => setDraftAnswers((d) => ({ ...d, [it.id]: Number(e.target.value) || 0 }))}
                                  className="h-8 text-xs w-24"
                                />
                                <span className="text-[11px] text-muted-foreground">{isPt ? it.unit_pt : it.unit_en}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setOpenId(null)}>
                          {isPt ? "Fechar" : "Close"}
                        </Button>
                        <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={saveInline}>
                          {isPt ? "Salvar resposta" : "Save answer"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {applied.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <p className="text-[11px] font-semibold text-foreground">{isPt ? "Aplicados nesta sessão:" : "Applied this session:"}</p>
            {applied.map((a) => (
              <div key={a.questionnaireId} className="flex items-center justify-between gap-2 rounded bg-emerald-500/10 px-2 py-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">{a.questionnaireName}</p>
                  <p className="text-[10px] text-muted-foreground">{isPt ? a.score.interpretation_pt : a.score.interpretation_en} ({a.score.total}/{a.score.max})</p>
                </div>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => setApplied((p) => p.filter((x) => x.questionnaireId !== a.questionnaireId))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

SpecialtyQuestionnairesPanel.displayName = "SpecialtyQuestionnairesPanel";

export default SpecialtyQuestionnairesPanel;
