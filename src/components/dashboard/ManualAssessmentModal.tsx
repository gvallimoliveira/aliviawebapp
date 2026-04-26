import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Sparkles, ChevronLeft, ChevronRight, Save, AlertTriangle } from "lucide-react";
import { questionnaires, type QuestionnaireResult } from "@/data/questionnaireData";
import { regionsByView } from "@/components/assessment/painMapData";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";

// ─── Body region grouping: proximal → distal, alphabetical within each group ───
type RegionGroup = { key: string; label_pt: string; label_en: string; ids: string[] };

const REGION_GROUPS_DEF: { key: string; label_pt: string; label_en: string; match: (id: string) => boolean }[] = [
  { key: "head_neck", label_pt: "Cabeça e Pescoço", label_en: "Head & Neck",
    match: (id) => id.startsWith("head") || id.startsWith("cervical") },
  { key: "trunk", label_pt: "Tronco (Tórax / Abdômen / Coluna)", label_en: "Trunk (Chest / Abdomen / Spine)",
    match: (id) => ["chest", "abdomen", "thoracic", "lower_back"].includes(id) || id.startsWith("thoracic_") || id.startsWith("lumbar_") },
  { key: "upper_proximal", label_pt: "Membro Superior — Proximal (Ombro / Braço)", label_en: "Upper Limb — Proximal (Shoulder / Arm)",
    match: (id) => id.includes("shoulder") || (id.includes("arm") && !id.includes("forearm")) },
  { key: "upper_distal", label_pt: "Membro Superior — Distal (Cotovelo / Antebraço / Mão)", label_en: "Upper Limb — Distal (Elbow / Forearm / Hand)",
    match: (id) => id.includes("elbow") || id.includes("forearm") || id.includes("hand") },
  { key: "pelvis_hip", label_pt: "Pelve e Quadril (incl. Glúteo)", label_en: "Pelvis & Hip (incl. Gluteal)",
    match: (id) => id.includes("hip") || id.includes("gluteal") },
  { key: "lower_proximal", label_pt: "Membro Inferior — Proximal (Coxa / Joelho)", label_en: "Lower Limb — Proximal (Thigh / Knee)",
    match: (id) => id.includes("thigh") || id.includes("knee") },
  { key: "lower_distal", label_pt: "Membro Inferior — Distal (Perna / Panturrilha / Tornozelo / Pé)", label_en: "Lower Limb — Distal (Leg / Calf / Ankle / Foot)",
    match: (id) => id.includes("shin") || id.includes("calf") || id.includes("ankle") || id.includes("foot") },
];

interface ManualAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string;
}

const RED_FLAGS_PT = [
  "Perda de força progressiva",
  "Perda de sensibilidade em sela (períneo)",
  "Incontinência urinária/fecal recente",
  "Febre persistente associada à dor",
  "Perda de peso inexplicada",
  "Dor noturna intensa que não alivia",
  "Trauma significativo recente",
  "História de câncer",
];

const STEPS = [
  { id: "anamnese", label: "Anamnese" },
  { id: "dor", label: "Dor & Mapa" },
  { id: "redflags", label: "Red Flags" },
  { id: "questionarios", label: "Questionários" },
  { id: "testes", label: "Testes" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "tratamento", label: "Tratamento" },
];

const ManualAssessmentModal = ({ open, onOpenChange, professionalId, clinicId, patientName, patientEmail }: ManualAssessmentModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generatingDx, setGeneratingDx] = useState(false);
  const [generatingTx, setGeneratingTx] = useState(false);
  const [generatingCi, setGeneratingCi] = useState(false);
  const [aiClinicalImpression, setAiClinicalImpression] =
    useState<{ overview: string; therapeuticObjectives: string[] } | null>(null);

  // Anamnese
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [duration, setDuration] = useState("");
  const [onset, setOnset] = useState("");
  const [aggravating, setAggravating] = useState("");
  const [relieving, setRelieving] = useState("");
  const [medications, setMedications] = useState("");
  const [previousSurgeries, setPreviousSurgeries] = useState("");
  const [comorbidities, setComorbidities] = useState("");
  const [occupation, setOccupation] = useState("");

  // Dor
  const [painScore, setPainScore] = useState<number>(5);
  const [painType, setPainType] = useState("");
  const [painRegions, setPainRegions] = useState<string[]>([]);

  // Red Flags
  const [redFlagsChecked, setRedFlagsChecked] = useState<string[]>([]);

  // Questionários (mesmo fluxo da avaliação premium/link)
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);

  // Testes
  const [functionalTests, setFunctionalTests] = useState("");

  // Diagnóstico
  const [clinicalImpression, setClinicalImpression] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");

  // Tratamento
  const [treatmentText, setTreatmentText] = useState("");

  // Build region groups: dedupe by id, sort alphabetically by current language label
  const regionGroups: RegionGroup[] = (() => {
    const seen = new Map<string, { label_pt: string; label_en: string }>();
    for (const view of Object.values(regionsByView)) {
      for (const r of view) {
        if (!seen.has(r.id)) seen.set(r.id, { label_pt: r.label_pt, label_en: r.label_en });
      }
    }
    return REGION_GROUPS_DEF.map((g) => {
      const ids = Array.from(seen.keys())
        .filter((id) => g.match(id))
        .sort((a, b) => {
          const la = isPt ? seen.get(a)!.label_pt : seen.get(a)!.label_en;
          const lb = isPt ? seen.get(b)!.label_pt : seen.get(b)!.label_en;
          return la.localeCompare(lb, isPt ? "pt-BR" : "en");
        });
      return { key: g.key, label_pt: g.label_pt, label_en: g.label_en, ids };
    }).filter((g) => g.ids.length > 0);
  })();
  const regionLabelMap: Record<string, { label_pt: string; label_en: string }> = (() => {
    const m: Record<string, { label_pt: string; label_en: string }> = {};
    for (const view of Object.values(regionsByView)) {
      for (const r of view) if (!m[r.id]) m[r.id] = { label_pt: r.label_pt, label_en: r.label_en };
    }
    return m;
  })();

  const toggleRegion = (id: string) => {
    setPainRegions((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const toggleRedFlag = (rf: string) => {
    setRedFlagsChecked((prev) => prev.includes(rf) ? prev.filter((r) => r !== rf) : [...prev, rf]);
  };

  const generateAIClinicalImpression = async () => {
    setGeneratingCi(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-clinical-impression", {
        body: {
          anamnesisData: buildAnamnesisData(),
          painRegions,
          painScore,
          questionnaireResults,
          diagnosis: diagnosisText
            ? { hypothesis: diagnosisText.split("\n")[0]?.slice(0, 280), summary: diagnosisText }
            : (clinicalImpression ? { summary: clinicalImpression } : null),
          language,
        },
      });
      if (error) throw error;
      const ci = data?.clinicalImpression;
      if (!ci?.overview) throw new Error("Empty AI response");
      setAiClinicalImpression(ci);
      // Reflect overview into the editable text field for convenience
      setClinicalImpression(ci.overview);
      toast({ title: isPt ? "Impressão clínica gerada!" : "Clinical impression generated!" });
    } catch (err: any) {
      console.error("Clinical impression error:", err);
      toast({
        title: isPt ? "Erro na IA" : "AI error",
        description: err?.message || (isPt ? "Não foi possível gerar a impressão clínica." : "Could not generate clinical impression."),
        variant: "destructive",
      });
    } finally {
      setGeneratingCi(false);
    }
  };


  // IMPORTANT: keep keys in camelCase to match the rest of the app
  // (AssessmentView, generatePdf, generate-clinical-impression, ResumeSummary, etc.)
  const buildAnamnesisData = () => ({
    manualEntry: true,
    // Chief complaint — store both the array form (used by AssessmentView/Resume/Pro dashboards)
    // and the legacy single string for backward compatibility.
    chiefComplaints: chiefComplaint ? [chiefComplaint] : [],
    chiefComplaint,
    customComplaint: chiefComplaint,
    history,
    duration,
    painDuration: duration,
    onset,
    aggravatingFactors: aggravating,
    relievingFactors: relieving,
    medications,
    previousSurgeries,
    previousTreatments: previousSurgeries,
    comorbidities,
    occupation,
    painType,
    painTypes: painType ? [painType] : [],
    functionalTests, // free-text observations from Step 4 (kept inside anamnesis_data so it persists and shows up in views)
    patientName,
    patientEmail: patientEmail || null,
  });

  const generateAIDiagnosis = async () => {
    setGeneratingDx(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: {
          anamnesis: buildAnamnesisData(),
          painRegions,
          painScore,
          testResults: { functionalTests, questionnaires: questionnaireResults },
          language,
        },
      });
      if (error) throw error;
      const dx = data?.diagnosis || data;
      setDiagnosisText(typeof dx === "string" ? dx : JSON.stringify(dx, null, 2));
      toast({ title: isPt ? "Diagnóstico gerado!" : "Diagnosis generated!" });
    } catch (err: any) {
      toast({ title: isPt ? "Erro na IA" : "AI error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingDx(false);
    }
  };

  const generateAITreatment = async () => {
    setGeneratingTx(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-treatment", {
        body: {
          anamnesis: buildAnamnesisData(),
          painRegions,
          painScore,
          diagnosis: diagnosisText,
          language,
        },
      });
      if (error) throw error;
      const tx = data?.treatment_plan || data?.treatment || data;
      setTreatmentText(typeof tx === "string" ? tx : JSON.stringify(tx, null, 2));
      toast({ title: isPt ? "Plano gerado!" : "Plan generated!" });
    } catch (err: any) {
      toast({ title: isPt ? "Erro na IA" : "AI error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingTx(false);
    }
  };

  const handleSave = async () => {
    if (!patientName.trim()) {
      toast({ title: isPt ? "Nome do paciente é obrigatório" : "Patient name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const row: any = {
        type: "professional",
        status: "completed",
        patient_name: patientName,
        patient_email: patientEmail || null,
        anamnesis_data: buildAnamnesisData(),
        pain_regions: painRegions,
        pain_score: painScore,
        red_flags: redFlagsChecked.length > 0 ? { detected: redFlagsChecked } : null,
        // test_results MUST be an array of questionnaire results — that's what AssessmentView,
        // generatePdf and clinical-impression all expect. Free-text functional observations
        // already live inside anamnesis_data.functionalTests.
        test_results: questionnaireResults.map((r) => {
          const q = questionnaires.find((qq) => qq.id === r.questionnaireId);
          return {
            questionnaireId: r.questionnaireId,
            questionnaireName: r.questionnaireName,
            fullName_pt: q?.fullName_pt,
            fullName_en: q?.fullName_en,
            answers: r.answers,
            subscaleScores: r.subscaleScores,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
            percentageScore: r.percentageScore,
            interpretation_pt: r.interpretation_pt,
            interpretation_en: r.interpretation_en,
            severity: r.severity,
          };
        }),
        // Diagnosis: use the shape the rest of the app reads — `hypothesis` + `summary`.
        // Keep `manual: true` flag and the legacy `text`/`clinicalImpression` keys for backward compat.
        diagnosis: (diagnosisText || clinicalImpression)
          ? {
              manual: true,
              hypothesis: (diagnosisText || clinicalImpression).split("\n")[0]?.slice(0, 280) || null,
              summary: diagnosisText || clinicalImpression,
              text: diagnosisText || null,
              clinicalImpression: aiClinicalImpression
                ? aiClinicalImpression
                : (clinicalImpression
                    ? { overview: clinicalImpression, therapeuticObjectives: [] }
                    : undefined),
            }
          : null,
        // Treatment plan: keep the manual flag + the free text under both `text` and `summary`
        // so PDF/AssessmentView can render it.
        treatment_plan: treatmentText
          ? { manual: true, text: treatmentText, summary: treatmentText }
          : null,
      };
      if (clinicId) row.clinic_id = clinicId;
      else row.professional_id = professionalId;

      const { data, error } = await supabase.from("assessments").insert(row).select("id").single();
      if (error) throw error;

      toast({ title: isPt ? "Avaliação criada!" : "Assessment created!" });
      onOpenChange(false);
      resetForm();
      if (data?.id) navigate(`/assessment/view/${data.id}?from=professional`);
    } catch (err: any) {
      console.error("Save assessment error:", err);
      toast({ title: isPt ? "Erro ao salvar" : "Save error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setChiefComplaint(""); setHistory(""); setDuration(""); setOnset("");
    setAggravating(""); setRelieving(""); setMedications(""); setPreviousSurgeries("");
    setComorbidities(""); setOccupation(""); setPainScore(5); setPainType("");
    setPainRegions([]); setRedFlagsChecked([]); setQuestionnaireResults([]);
    setFunctionalTests(""); setClinicalImpression("");
    setDiagnosisText(""); setTreatmentText("");
  };

  const stepLabels = isPt
    ? ["Anamnese", "Dor & Mapa", "Red Flags", "Questionários", "Testes", "Diagnóstico", "Tratamento"]
    : ["Anamnesis", "Pain & Map", "Red Flags", "Questionnaires", "Tests", "Diagnosis", "Treatment"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-6 pb-2 shrink-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isPt ? "Avaliação Manual" : "Manual Assessment"} — {patientName}
          </DialogTitle>
          <DialogDescription>
            {isPt
              ? `Etapa ${step + 1} de ${STEPS.length}: ${stepLabels[step]}`
              : `Step ${step + 1} of ${STEPS.length}: ${stepLabels[step]}`}
          </DialogDescription>
        </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1 px-1 mt-3">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 py-4">
            {/* STEP 0: ANAMNESE */}
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{isPt ? "Queixa principal" : "Chief complaint"} *</Label>
                  <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2}
                    placeholder={isPt ? "Ex: Dor lombar à esquerda há 3 semanas" : "E.g. Left lumbar pain for 3 weeks"} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Histórico" : "History"}</Label>
                  <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} className="mt-1 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Tempo de evolução" : "Duration"}</Label>
                    <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 text-sm h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Início" : "Onset"}</Label>
                    <Select value={onset} onValueChange={setOnset}>
                      <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sudden">{isPt ? "Súbito" : "Sudden"}</SelectItem>
                        <SelectItem value="gradual">{isPt ? "Gradual" : "Gradual"}</SelectItem>
                        <SelectItem value="trauma">{isPt ? "Trauma" : "Trauma"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Fatores agravantes" : "Aggravating factors"}</Label>
                    <Textarea value={aggravating} onChange={(e) => setAggravating(e.target.value)} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Fatores aliviantes" : "Relieving factors"}</Label>
                    <Textarea value={relieving} onChange={(e) => setRelieving(e.target.value)} rows={2} className="mt-1 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Medicações em uso" : "Current medications"}</Label>
                    <Textarea value={medications} onChange={(e) => setMedications(e.target.value)} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Cirurgias prévias" : "Previous surgeries"}</Label>
                    <Textarea value={previousSurgeries} onChange={(e) => setPreviousSurgeries(e.target.value)} rows={2} className="mt-1 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Comorbidades" : "Comorbidities"}</Label>
                    <Input value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} className="mt-1 text-sm h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Ocupação" : "Occupation"}</Label>
                    <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="mt-1 text-sm h-9" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: DOR */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">{isPt ? "Intensidade da dor (0-10)" : "Pain intensity (0-10)"}: <span className="font-bold text-primary">{painScore}</span></Label>
                  <Slider value={[painScore]} onValueChange={(v) => setPainScore(v[0])} min={0} max={10} step={1} className="mt-2" />
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Tipo de dor" : "Pain type"}</Label>
                  <Select value={painType} onValueChange={setPainType}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">{isPt ? "Local" : "Local"}</SelectItem>
                      <SelectItem value="radiating">{isPt ? "Irradiada" : "Radiating"}</SelectItem>
                      <SelectItem value="burning">{isPt ? "Queimação" : "Burning"}</SelectItem>
                      <SelectItem value="tingling">{isPt ? "Formigamento" : "Tingling"}</SelectItem>
                      <SelectItem value="throbbing">{isPt ? "Latejante" : "Throbbing"}</SelectItem>
                      <SelectItem value="stabbing">{isPt ? "Pontada" : "Stabbing"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">{isPt ? "Regiões com dor (proximais → distais, em ordem alfabética)" : "Pain regions (proximal → distal, alphabetical)"}</Label>
                  <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-3">
                    {regionGroups.map((g) => (
                      <div key={g.key}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                          {isPt ? g.label_pt : g.label_en}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {g.ids.map((id) => {
                            const lbl = regionLabelMap[id];
                            return (
                              <label key={id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                                <Checkbox checked={painRegions.includes(id)} onCheckedChange={() => toggleRegion(id)} />
                                <span>{isPt ? lbl.label_pt : lbl.label_en}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {painRegions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{painRegions.length} {isPt ? "selecionadas" : "selected"}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: RED FLAGS */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isPt ? "Marque qualquer sinal de alerta presente no paciente:" : "Check any warning signs present in the patient:"}
                </p>
                {RED_FLAGS_PT.map((rf) => (
                  <label key={rf} className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={redFlagsChecked.includes(rf)} onCheckedChange={() => toggleRedFlag(rf)} className="mt-0.5" />
                    <span className="text-sm">{rf}</span>
                  </label>
                ))}
                {redFlagsChecked.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      {isPt
                        ? `${redFlagsChecked.length} sinal(is) de alerta detectado(s). Considere encaminhamento médico.`
                        : `${redFlagsChecked.length} warning sign(s) detected. Consider medical referral.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: QUESTIONÁRIOS — mesmo fluxo da avaliação premium/link */}
            {step === 3 && (
              <div className="space-y-3">
                {painRegions.length === 0 ? (
                  <div className="p-4 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    {isPt
                      ? "Selecione ao menos uma região com dor na etapa anterior para que os questionários aplicáveis sejam carregados automaticamente."
                      : "Select at least one pain region in the previous step to load the applicable questionnaires."}
                  </div>
                ) : (
                  <QuestionnaireStep
                    painRegions={painRegions}
                    previousAnswers={undefined}
                    onComplete={(results) => {
                      setQuestionnaireResults(results);
                      setStep((s) => Math.min(STEPS.length - 1, s + 1));
                    }}
                    onBack={() => setStep((s) => Math.max(0, s - 1))}
                    onSkip={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  />
                )}
                {questionnaireResults.length > 0 && (
                  <div className="text-xs text-muted-foreground p-2 rounded bg-primary/5 border border-primary/20">
                    {isPt ? "Já aplicados: " : "Already applied: "}
                    {questionnaireResults.map((r) => r.questionnaireName).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: TESTES */}
            {step === 4 && (
              <div>
                <Label className="text-xs">{isPt ? "Testes funcionais e observações" : "Functional tests and observations"}</Label>
                <Textarea
                  value={functionalTests}
                  onChange={(e) => setFunctionalTests(e.target.value)}
                  rows={12}
                  placeholder={isPt
                    ? "Ex:\n- Slump test: positivo à esquerda\n- Lasègue 45° positivo\n- Força MMII grau 4\n- ADM lombar limitada em flexão\n..."
                    : "E.g. Slump test: positive on the left, etc."}
                  className="mt-1 text-sm font-mono"
                />
              </div>
            )}

            {/* STEP 5: DIAGNÓSTICO */}
            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{isPt ? "Impressão clínica" : "Clinical impression"}</Label>
                    <Button
                      onClick={generateAIClinicalImpression}
                      disabled={generatingCi}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                    >
                      {generatingCi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {isPt ? "Gerar com IA" : "Generate with AI"}
                    </Button>
                  </div>
                  <Textarea value={clinicalImpression} onChange={(e) => setClinicalImpression(e.target.value)} rows={3} className="mt-1 text-sm" />
                  {aiClinicalImpression?.therapeuticObjectives?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {aiClinicalImpression.therapeuticObjectives.map((obj, i) => (
                        <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button onClick={generateAIDiagnosis} disabled={generatingDx} variant="outline" size="sm" className="gap-2">
                  {generatingDx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isPt ? "Gerar diagnóstico com IA" : "Generate diagnosis with AI"}
                </Button>
                <div>
                  <Label className="text-xs">{isPt ? "Diagnóstico / Hipótese" : "Diagnosis / Hypothesis"}</Label>
                  <Textarea value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} rows={8} className="mt-1 text-sm" />
                </div>
              </div>
            )}

            {/* STEP 6: TRATAMENTO */}
            {step === 6 && (
              <div className="space-y-3">
                <Button onClick={generateAITreatment} disabled={generatingTx} variant="outline" size="sm" className="gap-2">
                  {generatingTx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isPt ? "Gerar plano de tratamento com IA" : "Generate treatment plan with AI"}
                </Button>
                <div>
                  <Label className="text-xs">{isPt ? "Plano de tratamento" : "Treatment plan"}</Label>
                  <Textarea value={treatmentText} onChange={(e) => setTreatmentText(e.target.value)} rows={12} className="mt-1 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between border-t p-4 shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPt ? "Salvar agora" : "Save now"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                {isPt ? "Avançar" : "Next"} <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isPt ? "Finalizar e abrir" : "Finish & open"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAssessmentModal;
