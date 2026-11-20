/**
 * Diagnóstico Diferencial Assistido — painel discreto e colapsável.
 *
 * Só é renderizado quando a hipótese tem confiança baixa/moderada
 * (gate em `shouldOfferDifferential`). Nunca gera nada sozinho:
 * a IA só é chamada no clique do profissional.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import {
  PLAUSIBILITY_LABEL,
  buildDemoDifferential,
  confidenceLabelPt,
  getDifferentialData,
  sanitizeDifferentials,
  type DifferentialDiagnosisData,
  type DifferentialItem,
} from "@/lib/differentialDiagnosis";


interface Props {
  /** Avaliação (prontuário) — quando presente, o resultado é persistido. */
  assessment?: any;
  /** Contexto clínico já montado (fluxo manual, antes de salvar). */
  context?: Record<string, unknown>;
  /** Diagnóstico atual quando não vem de `assessment`. */
  diagnosis?: any;
  /** Notas de sessão para enriquecer o raciocínio. */
  sessionNotes?: Array<{ session_date?: string; content?: string }>;
  assessmentTimeline?: any[];
  /** Permite adotar a alternativa como hipótese final (prontuário). */
  canAdopt?: boolean;
  onAdopted?: (hypothesis: string) => void;
  /** Recebe os discriminadores escolhidos como texto pronto. */
  onAppendDiscriminators?: (text: string) => void;
  isDemo?: boolean;
}

const plausibilityStyle: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const DifferentialDiagnosisPanel = ({
  assessment,
  context,
  diagnosis,
  sessionNotes,
  assessmentTimeline,
  canAdopt,
  onAdopted,
  onAppendDiscriminators,
  isDemo,
}: Props) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const lang = (["pt", "en", "es"].includes(language) ? language : "pt") as "pt" | "en" | "es";

  const dx = diagnosis ?? assessment?.diagnosis;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<DifferentialDiagnosisData | null>(() => getDifferentialData(assessment));
  const [includeInPdf, setIncludeInPdf] = React.useState<boolean>(() => !!getDifferentialData(assessment)?.includeInPdf);
  const [adoptingId, setAdoptingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const existing = getDifferentialData(assessment);
    setData(existing);
    setIncludeInPdf(!!existing?.includeInPdf);
  }, [assessment?.id, assessment?.diagnosis?.differentialDiagnosis]);

  const persist = async (payload: DifferentialDiagnosisData) => {
    if (!assessment?.id || isDemo) return;
    const updated = { ...(assessment.diagnosis || {}), differentialDiagnosis: payload };
    const { error } = await supabase.from("assessments").update({ diagnosis: updated as any }).eq("id", assessment.id);
    if (error) console.warn("persist differential failed", error.message);
    else if (assessment.diagnosis) assessment.diagnosis.differentialDiagnosis = payload;
  };

  const generate = async (forceRefresh = false) => {
    setLoading(true);
    setOpen(true);
    // Ambiente simulado (demo profissional / demo clínica): 1 alternativa, sem IA.
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 700));
      setData(buildDemoDifferential(dx));
      setLoading(false);
      return;
    }
    try {
      const body = {

        anamnesisData: context?.anamnesisData ?? assessment?.anamnesis_data,
        painRegions: context?.painRegions ?? assessment?.pain_regions,
        painScore: context?.painScore ?? assessment?.pain_score,
        questionnaireResults: context?.questionnaireResults ?? assessment?.test_results,
        diagnosis: dx,
        painMechanism: context?.painMechanism ?? assessment?.diagnosis?.pain_mechanism ?? assessment?.pain_mechanism,
        painExtent: context?.painExtent ?? assessment?.pain_extent,
        redFlags: context?.redFlags ?? assessment?.red_flags ?? assessment?.anamnesis_data?.redFlags,
        healthHistory: context?.healthHistory ?? assessment?.anamnesis_data?.healthHistory,
        sessionNotes,
        assessmentTimeline,
        language: lang,
        forceRefresh,
      };
      const { data: res, error } = await supabase.functions.invoke("generate-differential-diagnosis", { body });
      if (error) throw error;
      const differentials = sanitizeDifferentials(res);
      if (differentials.length === 0) throw new Error("A IA não retornou diferenciais utilizáveis.");
      const payload: DifferentialDiagnosisData = {
        differentials,
        generatedAt: new Date().toISOString(),
        includeInPdf,
      };
      setData(payload);
      await persist(payload);
    } catch (err: any) {
      toast({
        title: "Não foi possível gerar os diferenciais",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePdf = async (checked: boolean) => {
    setIncludeInPdf(checked);
    if (data) {
      const payload = { ...data, includeInPdf: checked };
      setData(payload);
      await persist(payload);
    }
  };

  const adopt = async (item: DifferentialItem) => {
    if (!assessment?.id || isDemo) {
      onAdopted?.(item.hypothesis);
      return;
    }
    setAdoptingId(item.hypothesis);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const { error } = await supabase
      .from("assessments")
      .update({
        final_hypothesis: item.hypothesis.slice(0, 200),
        final_hypothesis_by: uid,
        final_hypothesis_at: new Date().toISOString(),
      })
      .eq("id", assessment.id);
    setAdoptingId(null);
    if (error) {
      toast({ title: "Erro ao adotar hipótese", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Hipótese final atualizada",
      description: "A alternativa escolhida passa a aparecer no prontuário e no relatório.",
    });
    onAdopted?.(item.hypothesis);
  };

  const appendDiscriminators = (item: DifferentialItem) => {
    const text = `Diferencial a investigar — ${item.hypothesis}:\n${item.discriminators.map((d) => `• ${d}`).join("\n")}`;
    onAppendDiscriminators?.(text);
    toast({ title: "Discriminadores adicionados" });
  };

  return (
    <div className="pt-2 mt-2 border-t border-border/60">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (data ? setOpen((v) => !v) : generate())}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
          <span>
            {confidenceLabelPt({ diagnosis: dx })} — {data ? "hipóteses diferenciais" : "ver hipóteses diferenciais"}
          </span>
          {data ? (open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
        </button>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        {data && !loading && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={() => generate(true)}>
            <RefreshCw className="h-3 w-3" />
            Regenerar
          </Button>
        )}
      </div>

      {loading && !data && (
        <p className="mt-2 text-[11px] text-muted-foreground">Comparando hipóteses concorrentes com os dados do paciente…</p>
      )}

      {open && data && (
        <div className="mt-3 space-y-2">
          {data.differentials.map((item, i) => (
            <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs font-semibold text-foreground flex-1 min-w-[160px]">{item.hypothesis}</p>
                <Badge variant="outline" className={`text-[10px] ${plausibilityStyle[item.plausibility]}`}>
                  {PLAUSIBILITY_LABEL[item.plausibility][lang]}
                </Badge>
                {item.referralFlag && (
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Triagem médica
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Por que compete: </span>
                {item.competesBecause}
              </p>
              {item.arguesAgainst && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">O que fala contra: </span>
                  {item.arguesAgainst}
                </p>
              )}
              {item.discriminators.length > 0 && (
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Como diferenciar:</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {item.discriminators.map((d, j) => (
                      <li key={j} className="flex gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Por que importa: </span>
                {item.whyItMatters}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {canAdopt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    disabled={adoptingId === item.hypothesis}
                    onClick={() => adopt(item)}
                  >
                    {adoptingId === item.hypothesis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stethoscope className="h-3 w-3" />}
                    Adotar como hipótese final
                  </Button>
                )}
                {onAppendDiscriminators && item.discriminators.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={() => appendDiscriminators(item)}>
                    <ClipboardCheck className="h-3 w-3" />
                    Registrar discriminadores
                  </Button>
                )}
              </div>
            </div>
          ))}

          {assessment?.id && !isDemo && (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer pt-0.5">
              <Checkbox checked={includeInPdf} onCheckedChange={(c) => togglePdf(!!c)} className="h-3.5 w-3.5" />
              Incluir “Diagnósticos diferenciais considerados” no relatório em PDF
            </label>
          )}
          <p className="text-[10px] text-muted-foreground/80">
            Apoio ao raciocínio clínico. A decisão diagnóstica permanece do fisioterapeuta responsável.
          </p>
        </div>
      )}
    </div>
  );
};

export default DifferentialDiagnosisPanel;
