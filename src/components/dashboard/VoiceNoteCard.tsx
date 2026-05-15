import { useEffect, useState } from "react";
import { Mic, Loader2, Copy, ChevronDown, ChevronUp, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface VoiceNote {
  id: string;
  status: string;
  transcript: string | null;
  summary: any;
  error: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface Props {
  assessmentId?: string | null;
  patientId?: string | null;
}

export default function VoiceNoteCard({ assessmentId, patientId }: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [expandedTranscript, setExpandedTranscript] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!assessmentId && !patientId) return;
    let cancelled = false;

    const load = async () => {
      let q = supabase.from("assessment_voice_notes").select("*").order("created_at", { ascending: false });
      if (assessmentId) q = q.eq("assessment_id", assessmentId);
      else if (patientId) q = q.eq("patient_id", patientId);
      const { data } = await q;
      if (!cancelled && data) setNotes(data as VoiceNote[]);
    };
    load();

    const channel = supabase
      .channel(`voice_notes_${assessmentId || patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_voice_notes" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [assessmentId, patientId]);

  if (notes.length === 0) return null;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: isPt ? "Copiado!" : "Copied!" });
  };

  const fmtSummary = (s: any): string => {
    if (!s) return "";
    const lines: string[] = [];
    if (s.chiefComplaint) lines.push(`${isPt ? "Queixa principal" : "Chief complaint"}: ${s.chiefComplaint}`);
    if (s.painHistory) lines.push(`${isPt ? "Histórico" : "History"}: ${s.painHistory}`);
    if (s.aggravatingFactors?.length) lines.push(`${isPt ? "Piora com" : "Aggravated by"}: ${s.aggravatingFactors.join(", ")}`);
    if (s.relievingFactors?.length) lines.push(`${isPt ? "Alivia com" : "Relieved by"}: ${s.relievingFactors.join(", ")}`);
    if (s.previousTreatments) lines.push(`${isPt ? "Tratamentos prévios" : "Previous treatments"}: ${s.previousTreatments}`);
    if (s.functionalImpact) lines.push(`${isPt ? "Impacto funcional" : "Functional impact"}: ${s.functionalImpact}`);
    if (s.redFlagsHints?.length) lines.push(`⚠️ ${isPt ? "Sinais de alerta" : "Red flags"}: ${s.redFlagsHints.join(", ")}`);
    if (s.observations) lines.push(`${isPt ? "Observações" : "Notes"}: ${s.observations}`);
    return lines.join("\n");
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          {isPt ? "Gravações da Anamnese (IA)" : "Anamnesis Recordings (AI)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.map((n) => {
          const expanded = expandedTranscript[n.id];
          const date = new Date(n.created_at).toLocaleString(isPt ? "pt-BR" : "en-US");
          const dur = n.duration_seconds
            ? `${Math.floor(n.duration_seconds / 60)}:${String(n.duration_seconds % 60).padStart(2, "0")}`
            : "";
          return (
            <div key={n.id} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{date}</span>
                  {dur && <span>· {dur}</span>}
                </div>
                {n.status === "processing" && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isPt ? "Processando..." : "Processing..."}
                  </Badge>
                )}
                {n.status === "ready" && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    {isPt ? "Pronto" : "Ready"}
                  </Badge>
                )}
                {n.status === "failed" && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {isPt ? "Falhou" : "Failed"}
                  </Badge>
                )}
              </div>

              {n.status === "failed" && n.error && (
                <p className="text-xs text-destructive">{n.error}</p>
              )}

              {n.status === "ready" && n.summary && (
                <div className="space-y-2">
                  <div className="bg-muted/40 rounded-lg p-2.5 text-xs whitespace-pre-wrap leading-relaxed">
                    {fmtSummary(n.summary)}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => copy(fmtSummary(n.summary))}>
                      <Copy className="h-3 w-3" /> {isPt ? "Copiar resumo" : "Copy summary"}
                    </Button>
                    {n.transcript && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                        onClick={() => setExpandedTranscript((p) => ({ ...p, [n.id]: !p[n.id] }))}>
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isPt ? "Transcrição completa" : "Full transcript"}
                      </Button>
                    )}
                    {n.transcript && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => copy(n.transcript!)}>
                        <Copy className="h-3 w-3" /> {isPt ? "Copiar transcrição" : "Copy transcript"}
                      </Button>
                    )}
                  </div>
                  {expanded && n.transcript && (
                    <div className="bg-background border border-border rounded-lg p-2.5 text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {n.transcript}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
