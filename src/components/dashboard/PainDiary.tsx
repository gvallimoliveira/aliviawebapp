import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Check, Pencil, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PainCondition } from "@/lib/painConditions";

interface DiaryEntry {
  id: string;
  pain_score: number;
  notes: string | null;
  logged_at: string;
  condition_key: string | null;
}

interface PainDiaryProps {
  /** todas as condições clínicas do usuário (opcional — sem elas o diário é global) */
  conditions?: PainCondition[];
  /** condição em foco */
  activeConditionKey?: string | null;
}

function calculateStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = new Set(entries.map((e) => e.logged_at));
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0;

  let streak = 0;
  const start = dates.has(todayStr) ? today : yesterday;
  const cursor = new Date(start);
  while (true) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (dates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getWeekProgress(entries: DiaryEntry[]): number {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDates = new Set<string>();
  for (const e of entries) {
    const d = new Date(e.logged_at + "T00:00:00");
    if (d >= startOfWeek) weekDates.add(e.logged_at);
  }
  return weekDates.size;
}

function getMotivationalKey(streak: number): string {
  if (streak === 0) return "diary.motivation_restart";
  if (streak < 3) return "diary.motivation_start";
  if (streak < 7) return "diary.motivation_growing";
  if (streak < 14) return "diary.motivation_strong";
  if (streak < 30) return "diary.motivation_amazing";
  return "diary.motivation_legendary";
}

const PainDiary = ({ conditions = [], activeConditionKey = null }: PainDiaryProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);
  const [painScore, setPainScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [extraOpen, setExtraOpen] = useState<string | null>(null);
  const [extraScore, setExtraScore] = useState(5);

  const today = new Date().toISOString().split("T")[0];

  // Diário multi-condição só quando o usuário tem mais de uma condição
  const multiCondition = conditions.length > 1;
  const focusKey = multiCondition ? activeConditionKey ?? null : null;
  const focusCondition = conditions.find((c) => c.key === focusKey) || null;

  // Streak/semana contam o dia se QUALQUER condição foi registrada
  const streak = useMemo(() => calculateStreak(allEntries), [allEntries]);
  const weekProgress = useMemo(() => getWeekProgress(allEntries), [allEntries]);

  const entries = useMemo(
    () =>
      multiCondition
        ? allEntries.filter((e) => (e.condition_key ?? null) === focusKey)
        : allEntries,
    [allEntries, focusKey, multiCondition],
  );

  const todayEntry = useMemo(
    () => entries.find((e) => e.logged_at === today) || null,
    [entries, today],
  );

  const otherConditions = useMemo(
    () => (multiCondition ? conditions.filter((c) => c.key !== focusKey) : []),
    [conditions, focusKey, multiCondition],
  );

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pain_diary_entries")
      .select("id, pain_score, notes, logged_at, condition_key")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(180);

    setAllEntries(((data || []) as unknown as DiaryEntry[]));
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  // Sincroniza o formulário com o registro do dia da condição em foco
  useEffect(() => {
    if (todayEntry) {
      setPainScore(todayEntry.pain_score);
      setNotes(todayEntry.notes || "");
    } else {
      setPainScore(5);
      setNotes("");
    }
    setEditing(false);
  }, [todayEntry?.id, focusKey]);

  const saveEntry = async (conditionKey: string | null, score: number, note: string | null) => {
    if (!user) return;
    const existing = allEntries.find(
      (e) => e.logged_at === today && (e.condition_key ?? null) === conditionKey,
    );
    if (existing) {
      await supabase
        .from("pain_diary_entries" as any)
        .update({ pain_score: score, notes: note } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("pain_diary_entries" as any).insert({
        user_id: user.id,
        pain_score: score,
        notes: note,
        logged_at: today,
        condition_key: conditionKey,
      } as any);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveEntry(focusKey, painScore, notes || null);
      await fetchEntries();
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success(t("diary.saved"));
    } catch {
      toast.error(t("diary.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExtra = async (conditionKey: string) => {
    setSaving(true);
    try {
      await saveEntry(conditionKey, extraScore, null);
      await fetchEntries();
      setExtraOpen(null);
      setExtraScore(5);
      toast.success(t("diary.saved"));
    } catch {
      toast.error(t("diary.error"));
    } finally {
      setSaving(false);
    }
  };

  const chartData = entries.map((e) => ({
    date: new Date(e.logged_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    score: e.pain_score,
  }));

  const showForm = !todayEntry || editing;

  const getPainColor = (score: number) => {
    if (score <= 3) return "text-emerald-600";
    if (score <= 6) return "text-amber-500";
    return "text-destructive";
  };

  const getStreakColor = () => {
    if (streak >= 14) return "text-orange-500";
    if (streak >= 7) return "text-amber-500";
    if (streak >= 3) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const loggedTodayFor = (key: string) =>
    allEntries.find((e) => e.logged_at === today && (e.condition_key ?? null) === key) || null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          {t("diary.title")}
        </h2>
        {focusCondition && (
          <p className="text-xs text-muted-foreground">
            {t("conditions.tracking_for")}:{" "}
            <span className="font-medium text-foreground">{focusCondition.label}</span>
          </p>
        )}
      </div>

      {/* Streak & Weekly Progress */}
      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Streak badge */}
            <AnimatePresence>
              <motion.div
                className="flex items-center gap-2"
                key={streak}
                initial={justSaved ? { scale: 1.3 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Flame className={`h-6 w-6 ${getStreakColor()}`} />
                <div>
                  <p className={`text-lg font-bold ${getStreakColor()}`}>
                    {streak} {streak === 1 ? t("diary.streak_day") : t("diary.streak_days")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("diary.streak_label")}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Divider */}
            <div className="h-10 w-px bg-border" />

            {/* Weekly progress */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{t("diary.week_progress")}</span>
                <span className="font-medium">{weekProgress}/7</span>
              </div>
              <Progress value={(weekProgress / 7) * 100} className="h-2" />
            </div>
          </div>

          {/* Motivational message */}
          <p className="text-xs text-muted-foreground mt-3 italic">
            {t(getMotivationalKey(streak))}
          </p>
        </CardContent>
      </Card>

      {/* Quick log or today's entry */}
      <Card>
        <CardContent className="py-5 space-y-4">
          {showForm ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{t("diary.log_pain")}</span>
                  <span className={`text-2xl font-bold ${getPainColor(painScore)}`}>{painScore}/10</span>
                </div>
                <Slider
                  value={[painScore]}
                  onValueChange={([v]) => setPainScore(v)}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("anamnesis.no_pain")}</span>
                  <span>{t("anamnesis.worst_pain")}</span>
                </div>
              </div>
              <Input
                placeholder={t("diary.notes_placeholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {todayEntry ? t("diary.update") : t("diary.register")}
                </Button>
                {editing && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    {t("diagnosis.back")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("diary.today_logged")}</p>
                <p className={`text-2xl font-bold ${getPainColor(todayEntry!.pain_score)}`}>
                  {todayEntry!.pain_score}/10
                </p>
                {todayEntry!.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{todayEntry!.notes}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                {t("diary.edit")}
              </Button>
            </div>
          )}

          {/* Registrar também as outras condições */}
          {otherConditions.length > 0 && (
            <div className="border-t border-border/60 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("diary.also_log")}</p>
              <div className="flex flex-wrap gap-2">
                {otherConditions.map((c) => {
                  const logged = loggedTodayFor(c.key);
                  return (
                    <Button
                      key={c.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => {
                        setExtraOpen(extraOpen === c.key ? null : c.key);
                        setExtraScore(logged?.pain_score ?? 5);
                      }}
                    >
                      {logged ? <Check className="h-3 w-3 text-emerald-600" /> : <Plus className="h-3 w-3" />}
                      <span className="max-w-[130px] truncate">{c.label}</span>
                      {logged && (
                        <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] border-0 bg-muted">
                          {logged.pain_score}/10
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {extraOpen && (
                <div className="rounded-lg border border-border/60 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate max-w-[70%]">
                      {conditions.find((c) => c.key === extraOpen)?.label}
                    </span>
                    <span className={`text-lg font-bold ${getPainColor(extraScore)}`}>{extraScore}/10</span>
                  </div>
                  <Slider
                    value={[extraScore]}
                    onValueChange={([v]) => setExtraScore(v)}
                    min={0}
                    max={10}
                    step={1}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={saving} onClick={() => handleSaveExtra(extraOpen)} className="gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      {t("diary.register")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExtraOpen(null)}>
                      {t("diagnosis.back")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("diary.evolution")}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">{t("diary.no_entries")}</p>
      )}
    </div>
  );
};

export default PainDiary;
