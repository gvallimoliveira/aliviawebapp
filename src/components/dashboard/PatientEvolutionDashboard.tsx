import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  ArrowLeft, Activity, Calendar, Mail, User, ChevronRight, TrendingDown, TrendingUp, Minus,
} from "lucide-react";

interface PatientEvolutionDashboardProps {
  assessments: any[];
  professionalId: string;
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

const PatientEvolutionDashboard = ({ assessments }: PatientEvolutionDashboardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  // Group assessments by patient_email
  const patients = useMemo(() => {
    const map = new Map<string, PatientGroup>();
    assessments.forEach((a) => {
      const email = (a as any).patient_email;
      if (!email) return;
      if (!map.has(email)) {
        map.set(email, {
          email,
          name: (a as any).patient_name || email,
          assessments: [],
          lastDate: a.created_at,
        });
      }
      const group = map.get(email)!;
      group.assessments.push(a);
      if (a.created_at > group.lastDate) {
        group.lastDate = a.created_at;
        group.name = (a as any).patient_name || group.name;
      }
    });
    // Sort assessments within each group chronologically
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
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t("pro.patients_title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("pro.patients_desc")}</p>
        </div>
        {patients.map((p) => {
          const firstScore = p.assessments[0]?.pain_score;
          const lastScore = p.assessments[p.assessments.length - 1]?.pain_score;
          const trend = firstScore != null && lastScore != null
            ? lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable"
            : null;
          // Sparkline data for this patient
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
                  {/* Mini sparkline */}
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

  // Evolution detail view
  const patient = patients.find((p) => p.email === selectedEmail)!;
  const painData = patient.assessments
    .filter((a: any) => a.pain_score != null)
    .map((a: any) => ({
      date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      score: a.pain_score,
    }));

  // Extract questionnaire scores across assessments
  const questionnaireMap = new Map<string, { dates: string[]; scores: number[] }>();
  patient.assessments.forEach((a: any) => {
    const results = a.test_results;
    if (!Array.isArray(results)) return;
    results.forEach((r: any) => {
      if (!r.questionnaireId || r.score == null) return;
      const name = r.questionnaireId.toUpperCase();
      if (!questionnaireMap.has(name)) {
        questionnaireMap.set(name, { dates: [], scores: [] });
      }
      const entry = questionnaireMap.get(name)!;
      entry.dates.push(new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }));
      entry.scores.push(r.score);
    });
  });

  // Build questionnaire chart data
  const questionnaireNames = Array.from(questionnaireMap.keys());
  const questionnaireData: any[] = [];
  if (questionnaireNames.length > 0) {
    const maxLen = Math.max(...Array.from(questionnaireMap.values()).map((v) => v.dates.length));
    for (let i = 0; i < maxLen; i++) {
      const point: any = { index: i + 1 };
      // Use the date from the first questionnaire that has this index
      for (const [name, entry] of questionnaireMap) {
        if (i < entry.scores.length) {
          point[name] = entry.scores[i];
          if (!point.date) point.date = entry.dates[i];
        }
      }
      questionnaireData.push(point);
    }
  }

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

      {/* Pain Evolution Chart */}
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
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
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

      {/* Questionnaire Evolution Chart */}
      {questionnaireNames.length > 0 && questionnaireData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
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
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
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
            <p className="text-sm text-muted-foreground">{t("pro.no_questionnaire_data")}</p>
          </CardContent>
        </Card>
      )}

      {/* Assessment list */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("dashboard.history")}</h4>
        <div className="space-y-2">
          {patient.assessments.map((a: any) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => navigate(`/assessment/view/${a.id}`)}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {a.pain_score != null && <span>Dor: {a.pain_score}/10</span>}
                    {a.diagnosis?.hypothesis && (
                      <span className="line-clamp-1">• {a.diagnosis.hypothesis}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientEvolutionDashboard;
