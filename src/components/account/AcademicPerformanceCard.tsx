import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Trophy, Loader2, Route as RouteIcon, GraduationCap } from "lucide-react";
import { levelForXp, levelLabel, ACADEMIC_NICHES, type AcademicLevel } from "@/lib/academicNiche";

type XpRow = { niche: string | null; xp: number; source: string };
type QuizRow = { topic: string; correct: number; total_questions: number; score_pct: number };
type Badge = { niche: string; level: AcademicLevel };

const LEVEL_RANK: Record<AcademicLevel, number> = { aprendiz: 0, praticante: 1, especialista: 2, mestre: 3 };

export default function AcademicPerformanceCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [xpRows, setXpRows] = useState<XpRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = supabase as any;
      const [{ data: xp }, { data: qz }, { data: bd }] = await Promise.all([
        sb.from("academic_xp_log").select("niche, xp, source").eq("user_id", user.id),
        sb.from("academic_quiz_results").select("topic, correct, total_questions, score_pct").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        sb.from("academic_badges").select("niche, level").eq("user_id", user.id),
      ]);
      setXpRows(xp || []);
      setQuizzes(qz || []);
      setBadges(bd || []);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  const totalXp = xpRows.reduce((s, r) => s + (r.xp || 0), 0);
  const xpByNiche: Record<string, number> = {};
  ACADEMIC_NICHES.forEach(n => { xpByNiche[n] = 0; });
  xpRows.forEach(r => { if (r.niche) xpByNiche[r.niche] = (xpByNiche[r.niche] || 0) + (r.xp || 0); });

  // Highest badge per niche
  const topBadges: Record<string, AcademicLevel | undefined> = {};
  badges.forEach(b => {
    const prev = topBadges[b.niche];
    if (!prev || LEVEL_RANK[b.level] > LEVEL_RANK[prev]) topBadges[b.niche] = b.level;
  });

  // Top weak/strong topics by score
  const sortedQuiz = [...quizzes].sort((a, b) => a.score_pct - b.score_pct);
  const weak = sortedQuiz.slice(0, 3);
  const strong = [...sortedQuiz].reverse().slice(0, 3);

  if (totalXp === 0 && quizzes.length === 0 && badges.length === 0) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Desempenho acadêmico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Faça quizzes, conclua módulos de trilhas ou peça casos clínicos ao Mentor para começar a acumular XP.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate("/agente")} className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Abrir Agente Mentor
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/trilhas")} className="gap-1.5">
              <RouteIcon className="h-3.5 w-3.5" /> Ver trilhas
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Desempenho acadêmico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-background/60 border border-border/40 p-3">
          <div>
            <div className="text-xs text-muted-foreground">XP total</div>
            <div className="text-2xl font-bold text-primary">{totalXp}</div>
          </div>
          <Badge variant="secondary" className="text-[10px]">{quizzes.length} quizzes feitos</Badge>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Níveis por nicho</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACADEMIC_NICHES.map(n => {
              const xp = xpByNiche[n] || 0;
              const lvl = topBadges[n] || levelForXp(xp);
              return (
                <div key={n} className="rounded-lg border border-border/50 p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium capitalize">{n}</div>
                    <div className="text-[10px] text-muted-foreground">{xp} XP</div>
                  </div>
                  <Badge
                    variant={lvl === "mestre" ? "default" : "outline"}
                    className="text-[10px] shrink-0"
                  >
                    {levelLabel(n, lvl).replace(` ${n.charAt(0).toUpperCase() + n.slice(1)}`, "")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {(weak.length > 0 || strong.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {strong.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">🏆 Temas mais fortes</div>
                <ul className="space-y-1 text-xs">
                  {strong.map((q, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{q.topic}</span>
                      <span className="font-medium shrink-0">{q.score_pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weak.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">🎯 Para revisar</div>
                <ul className="space-y-1 text-xs">
                  {weak.map((q, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate flex-1">{q.topic}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => navigate(`/agente?seed=${encodeURIComponent(`/quiz ${q.topic}`)}`)}
                      >
                        Treinar
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/trilhas")} className="gap-1.5 flex-1">
            <RouteIcon className="h-3.5 w-3.5" /> Ver trilhas
          </Button>
          <Button size="sm" onClick={() => navigate("/agente")} className="gap-1.5 flex-1">
            <GraduationCap className="h-3.5 w-3.5" /> Abrir Mentor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
