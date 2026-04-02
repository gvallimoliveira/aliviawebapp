import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { questionnaires } from "@/data/questionnaireData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  ArrowLeft, Activity, Calendar, Mail, User, ChevronRight,
  FileText, ClipboardList, Stethoscope, Search, NotebookPen, Download, Loader2, Share2,
  Sparkles, FileCheck, Lock,
} from "lucide-react";
import { PRO_TREATMENT_PRICE_FORMATTED } from "@/constants/pricing";
import { useToast } from "@/hooks/use-toast";
import PainMapView from "@/components/assessment/PainMapView";
import JSZip from "jszip";

// Translate i18n anamnesis keys to display text
function translateKey(key: string): string {
  const map: Record<string, string> = {
    "anamnesis.complaint.neck_pain": "Dor no pescoço",
    "anamnesis.complaint.back_pain": "Dor nas costas",
    "anamnesis.complaint.shoulder_pain": "Dor no ombro",
    "anamnesis.complaint.knee_pain": "Dor no joelho",
    "anamnesis.complaint.hip_pain": "Dor no quadril",
    "anamnesis.complaint.ankle_pain": "Dor no tornozelo",
    "anamnesis.complaint.wrist_pain": "Dor no punho",
    "anamnesis.complaint.elbow_pain": "Dor no cotovelo",
    "anamnesis.complaint.foot_pain": "Dor no pé",
    "anamnesis.complaint.headache": "Cefaleia",
    "anamnesis.onset.sudden": "Início súbito",
    "anamnesis.onset.gradual": "Início gradual",
    "anamnesis.onset.trauma": "Trauma / Lesão",
    "anamnesis.pain_type.local": "Dor local",
    "anamnesis.pain_type.radiating": "Dor irradiada",
    "anamnesis.pain_type.burning": "Queimação",
    "anamnesis.pain_type.tingling": "Formigamento",
    "anamnesis.pain_type.throbbing": "Latejante",
    "anamnesis.pain_type.stabbing": "Pontada",
    "anamnesis.evolution.improving": "Melhorando",
    "anamnesis.evolution.stable": "Estável",
    "anamnesis.evolution.worsening": "Piorando",
    "anamnesis.activity.sedentary": "Sedentário",
    "anamnesis.activity.light": "Atividade leve",
    "anamnesis.activity.regular": "Atividade regular",
    "anamnesis.activity.athlete": "Atleta",
    "anamnesis.duration.less_week": "Menos de uma semana",
    "anamnesis.duration.one_month": "Cerca de 1 mês",
    "anamnesis.duration.three_six_months": "3 a 6 meses",
    "anamnesis.duration.one_year_plus": "1 ano ou mais",
    "anamnesis.gym.yes": "Sim",
    "anamnesis.gym.no": "Não",
    "anamnesis.sex.male": "Masculino",
    "anamnesis.sex.female": "Feminino",
    "anamnesis.age.under_25": "Menos de 25 anos",
    "anamnesis.age.25_34": "25–34 anos",
    "anamnesis.age.35_44": "35–44 anos",
    "anamnesis.age.45_55": "45–55 anos",
    "anamnesis.age.over_55": "Mais de 55 anos",
  };
  return map[key] || key;
}

// Normalize test_results: could be null, {}, or an array
function normalizeTestResults(tr: any): any[] {
  if (Array.isArray(tr)) return tr;
  if (tr && typeof tr === "object" && Object.keys(tr).length > 0) return [tr];
  return [];
}

interface PatientEvolutionDashboardProps {
  assessments: any[];
  professionalId: string;
  lifetimeTreatment?: boolean;
  onDownloadPdf?: (assessment: any) => void;
  onShareWhatsApp?: (assessment: any) => void;
}

interface PatientGroup {
  email: string;
  name: string;
  assessments: any[];
  lastDate: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 60%, 55%)",
];

const SEVERITY_COLORS: Record<string, string> = {
  minimal: "bg-emerald-500",
  mild: "bg-yellow-500",
  moderate: "bg-orange-500",
  severe: "bg-destructive",
  extreme: "bg-destructive",
};
// Inline CTA component for unlocking treatment plans
const TreatmentUnlockCTA = ({ assessmentId, lifetimeTreatment, onUnlocked }: {
  assessmentId: string;
  lifetimeTreatment?: boolean;
  onUnlocked: (treatmentPlan: any) => void;
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-treatment-payment", {
        body: { assessment_id: assessmentId },
      });
      if (error) throw error;

      if (data?.free) {
        // Lifetime treatment — generate treatment directly
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-treatment", {
          body: { assessment_id: assessmentId },
        });
        if (genError) throw genError;
        toast({ title: t("pro.treatment_generated") });
        onUnlocked(genData?.treatment_plan || true);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t("payment.error_title"), description: err?.message || t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-primary/20 pt-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{t("pro.unlock_treatment_cta")}</p>
            <p className="text-[10px] text-muted-foreground">{t("pro.unlock_treatment_desc")}</p>
          </div>
        </div>
        <Button
          onClick={handleUnlock}
          disabled={loading}
          size="sm"
          className="w-full rounded-xl gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          {lifetimeTreatment ? t("pro.unlock_treatment_cta") : `${t("pro.unlock_treatment_cta")} — ${PRO_TREATMENT_PRICE_FORMATTED}`}
        </Button>
      </div>
    </div>
  );
};

const PatientEvolutionDashboard = ({ assessments, professionalId, lifetimeTreatment, onDownloadPdf, onShareWhatsApp }: PatientEvolutionDashboardProps) => {

  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(initialPatient);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<Record<string, boolean>>({});
  const [batchExporting, setBatchExporting] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Load notes for all assessments
  useEffect(() => {
    if (!professionalId || assessments.length === 0) return;
    const assessmentIds = assessments.map((a) => a.id);
    supabase
      .from("professional_notes")
      .select("assessment_id, content")
      .eq("professional_id", professionalId)
      .in("assessment_id", assessmentIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((n: any) => { map[n.assessment_id] = n.content; });
          setNotes(map);
        }
      });
  }, [professionalId, assessments]);

  const saveNote = useCallback((assessmentId: string, content: string) => {
    if (!professionalId) return;
    setNotes((prev) => ({ ...prev, [assessmentId]: content }));
    if (debounceTimers.current[assessmentId]) clearTimeout(debounceTimers.current[assessmentId]);
    debounceTimers.current[assessmentId] = setTimeout(async () => {
      setNoteSaving((prev) => ({ ...prev, [assessmentId]: true }));
      await supabase.from("professional_notes").upsert(
        { professional_id: professionalId, assessment_id: assessmentId, content, updated_at: new Date().toISOString() },
        { onConflict: "professional_id,assessment_id" }
      );
      setNoteSaving((prev) => ({ ...prev, [assessmentId]: false }));
    }, 1000);
  }, [professionalId]);

  const handleBatchExport = useCallback(async (targetAssessments: any[]) => {
    const withDiagnosis = targetAssessments.filter((a) => a.diagnosis);
    if (withDiagnosis.length === 0) {
      toast({ title: t("pro.no_pdfs"), variant: "destructive" });
      return;
    }
    setBatchExporting(true);
    try {
      const { generateAssessmentPdfBlob } = await import("@/utils/generatePdf");
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      if (withDiagnosis.length === 1) {
        // Single PDF — just download directly
        if (onDownloadPdf) { onDownloadPdf(withDiagnosis[0]); }
      } else {
        const zip = new JSZip();
        for (const a of withDiagnosis) {
          const blob = await generateAssessmentPdfBlob({
            diagnosis: a.diagnosis,
            treatmentPlan: a.treatment_plan,
            language: lang as "pt" | "en",
            userName: a.patient_name || "Paciente",
            anamnesisData: a.anamnesis_data,
            painRegions: a.pain_regions,
            testResults: a.test_results,
            professionalNotes: notes[a.id] || undefined,
          });
          const date = new Date(a.created_at).toISOString().slice(0, 10);
          const name = (a.patient_name || "paciente").replace(/\s+/g, "_");
          zip.file(`AliviA_${name}_${date}.pdf`, blob);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `AliviA_Relatorios_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: t("pro.export_done") });
    } catch (e) {
      console.error(e);
      toast({ title: t("pro.export_error"), variant: "destructive" });
    } finally {
      setBatchExporting(false);
    }
  }, [notes, onDownloadPdf, t, toast]);

  // Group assessments by patient_email (fallback to patient_name)
  const patients = useMemo(() => {
    const map = new Map<string, PatientGroup>();
    assessments.forEach((a) => {
      const email = (a as any).patient_email;
      const name = (a as any).patient_name;
      const key = email || name || a.id; // fallback to id if both null
      if (!map.has(key)) {
        map.set(key, {
          email: email || "",
          name: name || email || "Sem nome",
          assessments: [],
          lastDate: a.created_at,
        });
      }
      const group = map.get(key)!;
      group.assessments.push(a);
      if (a.created_at > group.lastDate) {
        group.lastDate = a.created_at;
        group.name = name || group.name;
      }
    });
    map.forEach((g) => g.assessments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    return Array.from(map.values()).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [assessments]);

  // Find selected patient (may be null)
  const patient = selectedEmail ? patients.find((p) => p.email === selectedEmail) || null : null;

  const painData = useMemo(() => {
    if (!patient) return [];
    return patient.assessments
      .filter((a: any) => a.pain_score != null)
      .map((a: any) => ({
        date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        score: a.pain_score,
      }));
  }, [patient]);

  // Build detailed questionnaire evolution data with subscales
  const questionnaireEvolution = useMemo(() => {
    if (!patient) return [];
    const resultsByQuestionnaire = new Map<string, {
      name: string;
      qDef: typeof questionnaires[0] | undefined;
      entries: { date: string; percentageScore: number; subscaleScores: Record<string, number> }[];
    }>();

    patient.assessments.forEach((a: any) => {
      const results = normalizeTestResults(a.test_results);
      results.forEach((r: any) => {
        if (!r.questionnaireId || r.percentageScore == null) return;
        const name = r.questionnaireName || r.questionnaireId.toUpperCase();
        if (!resultsByQuestionnaire.has(r.questionnaireId)) {
          resultsByQuestionnaire.set(r.questionnaireId, {
            name,
            qDef: questionnaires.find((q) => q.id === r.questionnaireId),
            entries: [],
          });
        }
        resultsByQuestionnaire.get(r.questionnaireId)!.entries.push({
          date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          percentageScore: r.percentageScore,
          subscaleScores: r.subscaleScores || {},
        });
      });
    });

    const charts: {
      name: string;
      totalKey: string;
      subscaleKeys: { key: string; label: string }[];
      data: any[];
    }[] = [];

    resultsByQuestionnaire.forEach((info) => {
      const { name, qDef, entries } = info;
      if (entries.length === 0) return;

      const latestEntry = entries[entries.length - 1];
      const subscaleLabels = qDef?.subscaleLabels || {};
      const isHigherWorse = qDef?.scoringDirection === "higher_worse";
      const lang = document.documentElement.lang === "en" ? "en" : "pt";

      const subscaleEntries = Object.entries(latestEntry.subscaleScores)
        .filter(([key]) => subscaleLabels[key])
        .map(([key, value]) => ({
          key,
          label: subscaleLabels[key]?.[lang] || key,
          score: value as number,
        }))
        .sort((a, b) => isHigherWorse ? b.score - a.score : a.score - b.score)
        .slice(0, 3);

      const totalKey = `${name} (Total)`;
      const data = entries.map((entry, i) => {
        const point: any = {
          index: i + 1,
          date: entry.date,
          [totalKey]: Math.round(entry.percentageScore),
        };
        subscaleEntries.forEach((sub) => {
          const rawScore = entry.subscaleScores[sub.key];
          if (rawScore != null) {
            const questions = qDef?.questions.filter((q) => q.subscale === sub.key) || [];
            const maxPerQuestion = questions.length > 0
              ? Math.max(...questions[0].options.map((o) => o.value))
              : 4;
            const maxSubscale = questions.length * maxPerQuestion;
            point[sub.label] = maxSubscale > 0 ? Math.round((rawScore / maxSubscale) * 100) : rawScore;
          }
        });
        return point;
      });

      charts.push({
        name,
        totalKey,
        subscaleKeys: subscaleEntries.map((s) => ({ key: s.label, label: s.label })),
        data,
      });
    });

    return charts;
  }, [patient]);

  const SUBSCALE_COLORS = [
    "hsl(210, 70%, 55%)",
    "hsl(150, 60%, 45%)",
    "hsl(35, 80%, 55%)",
  ];

  // Helper to extract questionnaire results from a single assessment
  const getQuestionnaireResults = (a: any) => {
    const results = normalizeTestResults(a.test_results);
    return results.filter((r: any) => r.questionnaireId && r.percentageScore != null);
  };

  // Helper to get anamnesis summary fields with translated values
  const getAnamnesisFields = (a: any) => {
    const d = a.anamnesis_data;
    if (!d) return [];
    const fields: { label: string; value: string }[] = [];
    const complaints = d.chiefComplaints || (d.chiefComplaint ? [d.chiefComplaint] : []);
    if (complaints.length > 0) fields.push({ label: "Queixa Principal", value: complaints.map((c: string) => translateKey(c)).join(", ") });
    if (d.customComplaint) fields.push({ label: "Queixa (detalhe)", value: d.customComplaint });
    if (d.onset) fields.push({ label: "Modo de Início", value: translateKey(d.onset) });
    if (d.evolution) fields.push({ label: "Evolução", value: translateKey(d.evolution) });
    if (d.painDuration) fields.push({ label: "Duração da Dor", value: translateKey(d.painDuration) });
    if (d.painTypes?.length) fields.push({ label: "Tipos de Dor", value: d.painTypes.map((p: string) => translateKey(p)).join(", ") });
    if (d.activityLevel) fields.push({ label: "Nível de Atividade", value: translateKey(d.activityLevel) });
    if (d.aggravatingFactors) fields.push({ label: "Agravantes", value: d.aggravatingFactors });
    if (d.relievingFactors) fields.push({ label: "Aliviantes", value: d.relievingFactors });
    if (d.hasGymAccess) fields.push({ label: "Acesso a Academia", value: translateKey(d.hasGymAccess) });
    if (d.sex) fields.push({ label: "Sexo Biológico", value: translateKey(d.sex) });
    if (d.ageRange) fields.push({ label: "Faixa Etária", value: translateKey(d.ageRange) });
    return fields;
  };

  // Empty state
  if (patients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("pro.no_patients")}</p>
        </CardContent>
      </Card>
    );
  }

  // Patient list view
  if (!patient) {
    return (
      <div className="space-y-3">
        <div className="mb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t("pro.patients_title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("pro.patients_desc")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl shrink-0"
              disabled={batchExporting}
              onClick={() => handleBatchExport(assessments)}
            >
              {batchExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("pro.export_pdfs")}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {patients
          .filter((p) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
          })
          .map((p) => {
          const firstScore = p.assessments[0]?.pain_score;
          const lastScore = p.assessments[p.assessments.length - 1]?.pain_score;
          const trend = firstScore != null && lastScore != null
            ? lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable"
            : null;

          return (
            <Card
              key={p.email}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20 group"
              onClick={() => setSelectedEmail(p.email)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.name}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {p.assessments.length} {t("pro.assessments_count")}
                      </Badge>
                      {trend === "improving" && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          Melhorando
                        </Badge>
                      )}
                      {trend === "worsening" && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                          Piorando
                        </Badge>
                      )}
                      {trend === "stable" && (
                        <Badge variant="outline" className="text-[10px]">
                          Estável
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {p.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t("pro.last_assessment")}: {new Date(p.lastDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ── Evolution detail view ──
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" /> {t("pro.back_to_patients")}
      </Button>

      <div>
        <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> {patient.email}
          <span className="mx-1">•</span>
          {patient.assessments.length} {t("pro.assessments_count")}
        </p>
      </div>

      {/* ── Pain Evolution Chart ── */}
      {painData.length > 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("pro.pain_evolution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} name="Dor" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : painData.length === 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("pro.pain_evolution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Dor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Pain Map Comparison ── */}
      {patient.assessments.some((a: any) => a.pain_regions?.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Mapa de Dor — Comparativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {patient.assessments.filter((a: any) => a.pain_regions?.length > 0).map((a: any) => (
                <div key={a.id} className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {a.pain_score != null && <span className="ml-1.5 text-foreground font-semibold">• Dor: {a.pain_score}/10</span>}
                  </p>
                  <PainMapView painRegions={a.pain_regions} compact />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Questionnaire Evolution Chart (Enhanced with Subscales) ── */}
      {questionnaireEvolution.length > 0 ? (
        questionnaireEvolution.map((chart) => (
          <Card key={chart.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                {t("pro.questionnaire_evolution")} — {chart.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Pontuação total + 3 maiores limitações funcionais (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chart.data.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={chart.totalKey}
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      {chart.subscaleKeys.map((sub, i) => (
                        <Line
                          key={sub.key}
                          type="monotone"
                          dataKey={sub.key}
                          stroke={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]}
                          strokeWidth={1.5}
                          strokeDasharray="5 3"
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Legend />
                      <Bar dataKey={chart.totalKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      {chart.subscaleKeys.map((sub, i) => (
                        <Bar
                          key={sub.key}
                          dataKey={sub.key}
                          fill={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <ClipboardList className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum questionário funcional foi aplicado nessas avaliações.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Questionários são aplicados automaticamente quando o paciente preenche o mapa de dor.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Per-assessment details ── */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">{t("dashboard.history")}</h4>
        <div className="space-y-4">
          {patient.assessments.map((a: any) => {
            const qResults = getQuestionnaireResults(a);
            const anamnesisFields = getAnamnesisFields(a);
            return (
              <Card key={a.id} className="overflow-hidden">
                <CardContent className="py-4 px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {a.pain_score != null && <span>Dor: {a.pain_score}/10</span>}
                        {a.diagnosis?.hypothesis && (
                          <span className="line-clamp-1">• {a.diagnosis.hypothesis}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.diagnosis && onShareWhatsApp && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="WhatsApp"
                          onClick={() => onShareWhatsApp(a)}
                        >
                          <Share2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {a.diagnosis && onDownloadPdf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="PDF"
                          onClick={() => onDownloadPdf(a)}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {qResults.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> Questionários
                      </p>
                      {qResults.map((r: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{r.questionnaireName || r.questionnaireId}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">{Math.round(r.percentageScore)}%</span>
                              {r.severity && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">
                                  {r.interpretation_pt || r.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Progress value={r.percentageScore} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}

                  {anamnesisFields.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Anamnese</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {anamnesisFields.map((f, i) => (
                          <div key={i}>
                            <span className="text-muted-foreground">{f.label}: </span>
                            <span className="text-foreground">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View full assessment button */}
                  <Button
                    variant="outline"
                    className="w-full justify-between text-sm"
                    onClick={() => navigate(`/assessment/view/${a.id}?from=professional`)}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("pro.view_full_assessment")}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Treatment Plan CTA */}
                  {a.diagnosis && !a.treatment_plan && (
                    <TreatmentUnlockCTA
                      assessmentId={a.id}
                      lifetimeTreatment={lifetimeTreatment}
                      onUnlocked={(treatmentPlan) => {
                        // Update local state to reflect unlocked treatment
                        a.treatment_plan = treatmentPlan;
                        // Force re-render
                        setNotes((prev) => ({ ...prev }));
                      }}
                    />
                  )}
                  {a.treatment_plan && (
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-600">{t("pro.treatment_unlocked")}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary"
                          onClick={() => navigate(`/assessment/view/${a.id}?from=professional`)}
                        >
                          {t("pro.view_treatment")}
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <NotebookPen className="h-3 w-3" />
                      {t("pro.private_notes")}
                      {noteSaving[a.id] && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {notes[a.id] && !noteSaving[a.id] && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{t("pro.notes_saved")}</Badge>}
                    </p>
                    <Textarea
                      placeholder={t("pro.private_notes_placeholder")}
                      value={notes[a.id] || ""}
                      onChange={(e) => saveNote(a.id, e.target.value)}
                      className="text-xs min-h-[60px] resize-y"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PatientEvolutionDashboard;
