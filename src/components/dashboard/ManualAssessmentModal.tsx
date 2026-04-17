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

  // Questionários
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<string[]>([]);
  const [questionnaireScores, setQuestionnaireScores] = useState<Record<string, string>>({});

  // Testes
  const [functionalTests, setFunctionalTests] = useState("");

  // Diagnóstico
  const [clinicalImpression, setClinicalImpression] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");

  // Tratamento
  const [treatmentText, setTreatmentText] = useState("");

  const allRegions = Object.values(regionsByView).flat();

  const toggleRegion = (id: string) => {
    setPainRegions((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const toggleRedFlag = (rf: string) => {
    setRedFlagsChecked((prev) => prev.includes(rf) ? prev.filter((r) => r !== rf) : [...prev, rf]);
  };

  const toggleQuestionnaire = (id: string) => {
    setSelectedQuestionnaires((prev) => prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]);
  };

  const buildAnamnesisData = () => ({
    manualEntry: true,
    chief_complaint: chiefComplaint,
    history,
    duration,
    onset,
    aggravating_factors: aggravating,
    relieving_factors: relieving,
    medications,
    previous_surgeries: previousSurgeries,
    comorbidities,
    occupation,
    pain_type: painType,
    patient_name: patientName,
    patient_email: patientEmail || null,
  });

  const generateAIDiagnosis = async () => {
    setGeneratingDx(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: {
          anamnesis: buildAnamnesisData(),
          painRegions,
          painScore,
          testResults: { functionalTests, questionnaires: questionnaireScores },
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
        test_results: {
          functional_tests: functionalTests,
          questionnaires: selectedQuestionnaires.map((id) => {
            const q = questionnaires.find((qq) => qq.id === id);
            return {
              questionnaireId: id,
              questionnaireName: q?.name || id,
              manualScore: questionnaireScores[id] || null,
            };
          }),
        },
        diagnosis: diagnosisText
          ? { manual: true, text: diagnosisText, clinical_impression: clinicalImpression }
          : (clinicalImpression ? { manual: true, clinical_impression: clinicalImpression } : null),
        treatment_plan: treatmentText ? { manual: true, text: treatmentText } : null,
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
    setPainRegions([]); setRedFlagsChecked([]); setSelectedQuestionnaires([]);
    setQuestionnaireScores({}); setFunctionalTests(""); setClinicalImpression("");
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
                  <Label className="text-xs mb-2 block">{isPt ? "Regiões com dor" : "Pain regions"}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto border rounded-md p-2">
                    {allRegions.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox checked={painRegions.includes(r.id)} onCheckedChange={() => toggleRegion(r.id)} />
                        <span>{isPt ? r.label_pt : r.label_en}</span>
                      </label>
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

            {/* STEP 3: QUESTIONÁRIOS */}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isPt ? "Selecione os questionários aplicados e informe a pontuação (opcional):" : "Select applied questionnaires and enter the score (optional):"}
                </p>
                {questionnaires.map((q) => (
                  <div key={q.id} className="border rounded-md p-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={selectedQuestionnaires.includes(q.id)} onCheckedChange={() => toggleQuestionnaire(q.id)} className="mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.name} — <span className="font-normal text-muted-foreground">{isPt ? q.fullName_pt : q.fullName_en}</span></p>
                        <p className="text-xs text-muted-foreground">{isPt ? q.description_pt : q.description_en}</p>
                      </div>
                    </label>
                    {selectedQuestionnaires.includes(q.id) && (
                      <Input
                        placeholder={isPt ? "Pontuação obtida (ou deixe vazio para aplicar depois)" : "Score (or leave blank for later)"}
                        value={questionnaireScores[q.id] || ""}
                        onChange={(e) => setQuestionnaireScores({ ...questionnaireScores, [q.id]: e.target.value })}
                        className="text-xs h-8"
                      />
                    )}
                  </div>
                ))}
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
                  <Label className="text-xs">{isPt ? "Impressão clínica" : "Clinical impression"}</Label>
                  <Textarea value={clinicalImpression} onChange={(e) => setClinicalImpression(e.target.value)} rows={3} className="mt-1 text-sm" />
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
