import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, GraduationCap, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { detectNiche, awardBadgesIfEligible } from "@/lib/academicNiche";

type Question = {
  type: "multiple_choice" | "open";
  question: string;
  options?: string[];
  correct?: string;
  explanation?: string;
  model_answer?: string;
  key_points?: string[];
};

export type Quiz = {
  topic: string;
  questions: Question[];
};

export default function QuizCard({ quiz, threadId }: { quiz: Quiz; threadId?: string }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = quiz.questions.length;
  const q = quiz.questions[idx];

  const score = useMemo(() => {
    if (!finished) return 0;
    let c = 0;
    quiz.questions.forEach((qq, i) => {
      if (qq.type === "multiple_choice" && qq.correct && answers[i]?.toUpperCase() === qq.correct.toUpperCase()) c++;
    });
    return c;
  }, [finished, answers, quiz.questions]);

  const mcTotal = quiz.questions.filter((qq) => qq.type === "multiple_choice").length;
  const pct = mcTotal > 0 ? Math.round((score / mcTotal) * 100) : 0;

  const finish = async () => {
    setFinished(true);
    if (!saved && mcTotal > 0) {
      try {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        if (!uid) return;
        await (supabase as any).from("academic_quiz_results").insert({
          user_id: uid,
          thread_id: threadId || null,
          topic: quiz.topic.slice(0, 200),
          total_questions: mcTotal,
          correct: score,
          score_pct: pct,
        });
        const xp = score * 10;
        const niche = detectNiche(quiz.topic);
        if (xp > 0) {
          await (supabase as any).from("academic_xp_log").insert({
            user_id: uid,
            source: "quiz",
            source_ref: quiz.topic.slice(0, 200),
            niche,
            xp,
          });
          if (niche) {
            const { data: agg } = await (supabase as any)
              .from("academic_xp_log")
              .select("xp")
              .eq("user_id", uid)
              .eq("niche", niche);
            const total = (agg || []).reduce((s: number, r: any) => s + (r.xp || 0), 0);
            await awardBadgesIfEligible(supabase, uid, niche, total);
          }
          toast.success(`+${xp} XP${niche ? ` (${niche})` : ""}`);
        }
        setSaved(true);
      } catch (e) {
        console.warn("[quiz] save failed", e);
      }
    }
  };

  if (finished) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent mt-2">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Resultado · {quiz.topic}</div>
              <div className="text-xs text-muted-foreground">
                {score} / {mcTotal} acertos em múltipla escolha · {pct}%
              </div>
            </div>
            <Badge variant={pct >= 70 ? "default" : "secondary"} className="text-xs">
              {pct >= 90 ? "🏆 Excelente" : pct >= 70 ? "👍 Bom" : pct >= 50 ? "📚 Reveja" : "🎯 Pratique"}
            </Badge>
          </div>

          <div className="space-y-3">
            {quiz.questions.map((qq, i) => {
              const user = answers[i] || "";
              const correct = qq.type === "multiple_choice" && qq.correct && user.toUpperCase() === qq.correct.toUpperCase();
              return (
                <div key={i} className="rounded-lg border border-border/50 p-3 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    {qq.type === "multiple_choice" ? (
                      correct ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                              : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : <GraduationCap className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                    <div className="font-medium text-foreground/90">{i + 1}. {qq.question}</div>
                  </div>
                  {qq.type === "multiple_choice" ? (
                    <>
                      <div className="pl-6 text-muted-foreground">
                        Sua resposta: <span className={correct ? "text-green-600" : "text-destructive"}>{user || "—"}</span>
                        {!correct && <> · Correta: <span className="text-green-600">{qq.correct}</span></>}
                      </div>
                      {!correct && qq.explanation && (
                        <div className="pl-6 text-foreground/80 border-l-2 border-primary/40 ml-2 py-1 pl-3">
                          💡 {qq.explanation}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="pl-6 text-muted-foreground italic">Sua resposta: {user || "(em branco)"}</div>
                      <div className="pl-6 text-foreground/80 border-l-2 border-primary/40 ml-2 py-1 pl-3">
                        <div className="font-semibold mb-0.5">Resposta esperada:</div>
                        {qq.model_answer}
                        {qq.key_points && qq.key_points.length > 0 && (
                          <ul className="list-disc pl-4 mt-1">
                            {qq.key_points.map((kp, j) => <li key={j}>{kp}</li>)}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { setIdx(0); setAnswers({}); setFinished(false); setSaved(false); }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refazer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent mt-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Quiz · {quiz.topic}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">Questão {idx + 1} / {total}</Badge>
        </div>

        <div className="text-sm font-medium">{q.question}</div>

        {q.type === "multiple_choice" && q.options ? (
          <div className="space-y-1.5">
            {q.options.map((opt) => {
              const letter = opt.trim().charAt(0).toUpperCase();
              const selected = answers[idx]?.toUpperCase() === letter;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [idx]: letter }))}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                    selected ? "border-primary bg-primary/10 text-foreground" : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <Textarea
            value={answers[idx] || ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [idx]: e.target.value }))}
            placeholder="Sua resposta…"
            className="min-h-[80px] text-xs"
          />
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
            ← Anterior
          </Button>
          {idx < total - 1 ? (
            <Button size="sm" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} disabled={!answers[idx]}>
              Próxima →
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={Object.keys(answers).length < total}>
              Finalizar quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
