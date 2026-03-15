import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  ArrowLeft, Activity, Calendar, Mail, User, ChevronRight, TrendingDown, TrendingUp, Minus,
  FileText, ClipboardList, Stethoscope, Search,
} from "lucide-react";
import PainMapView from "@/components/assessment/PainMapView";

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
  onDownloadPdf?: (assessment: any) => void;
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

const PatientEvolutionDashboard = ({ assessments, onDownloadPdf }: PatientEvolutionDashboardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  if (!selectedEmail) {
    return (
      <div className="space-y-3">
        <div className="mb-2 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("pro.patients_title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("pro.patients_desc")}</p>
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
          const sparkData = p.assessments
            .filter((a: any) => a.pain_score != null)
            .map((a: any, i: number) => ({ i, s: a.pain_score }));
          const sparkColor = trend === "improving" ? "hsl(150, 60%, 45%)" : trend === "worsening" ? "hsl(0, 70%, 55%)" : "hsl(var(--primary))";

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
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-0.5">
                          <TrendingDown className="h-3 w-3" /> Melhorando
                        </Badge>
                      )}
                      {trend === "worsening" && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                          <TrendingUp className="h-3 w-3" /> Piorando
                        </Badge>
                      )}
                      {trend === "stable" && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Minus className="h-3 w-3" /> Estável
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
                  {sparkData.length >= 2 && (
                    <div className="w-20 h-8 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <Area
                            type="monotone"
                            dataKey="s"
                            stroke={sparkColor}
                            fill={sparkColor}
                            fillOpacity={0.15}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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
  const patient = patients.find((p) => p.email === selectedEmail)!;
  const painData = patient.assessments
    .filter((a: any) => a.pain_score != null)
    .map((a: any) => ({
      date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      score: a.pain_score,
    }));

  // Questionnaire scores across assessments
  const questionnaireMap = new Map<string, { dates: string[]; scores: number[]; severities: string[]; names: string[] }>();
  patient.assessments.forEach((a: any) => {
    const results = normalizeTestResults(a.test_results);
    if (results.length === 0) return;
    results.forEach((r: any) => {
      if (!r.questionnaireId || r.percentageScore == null) return;
      const name = r.questionnaireName || r.questionnaireId.toUpperCase();
      if (!questionnaireMap.has(name)) {
        questionnaireMap.set(name, { dates: [], scores: [], severities: [], names: [] });
      }
      const entry = questionnaireMap.get(name)!;
      entry.dates.push(new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }));
      entry.scores.push(r.percentageScore);
      entry.severities.push(r.severity || "");
      entry.names.push(r.questionnaireName || name);
    });
  });

  const questionnaireNames = Array.from(questionnaireMap.keys());
  const questionnaireData: any[] = [];
  if (questionnaireNames.length > 0) {
    const maxLen = Math.max(...Array.from(questionnaireMap.values()).map((v) => v.dates.length));
    for (let i = 0; i < maxLen; i++) {
      const point: any = { index: i + 1 };
      for (const [name, entry] of questionnaireMap) {
        if (i < entry.scores.length) {
          point[name] = entry.scores[i];
          if (!point.date) point.date = entry.dates[i];
        }
      }
      questionnaireData.push(point);
    }
  }

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
    if (d.chiefComplaint) fields.push({ label: "Queixa Principal", value: translateKey(d.chiefComplaint) });
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

      {/* ── Questionnaire Evolution Chart ── */}
      {questionnaireNames.length > 0 && questionnaireData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              {t("pro.questionnaire_evolution")}
            </CardTitle>
            <CardDescription className="text-xs">
              {questionnaireNames.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={questionnaireData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Legend />
                  {questionnaireNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/assessment/view/${a.id}?from=professional`)}
                  >
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
                      {a.diagnosis && onDownloadPdf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="PDF"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadPdf(a);
                          }}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Questionnaire results */}
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
                          <Progress
                            value={r.percentageScore}
                            className="h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Anamnesis summary */}
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
