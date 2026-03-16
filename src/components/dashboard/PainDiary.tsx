import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Check, Pencil } from "lucide-react";
import { toast } from "sonner";

interface DiaryEntry {
  id: string;
  pain_score: number;
  notes: string | null;
  logged_at: string;
}

const PainDiary = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [painScore, setPainScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pain_diary_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(30);

    const items = (data || []) as unknown as DiaryEntry[];
    setEntries(items);
    const todayItem = items.find((e) => e.logged_at === today);
    if (todayItem) {
      setTodayEntry(todayItem);
      setPainScore(todayItem.pain_score);
      setNotes(todayItem.notes || "");
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (todayEntry) {
        await supabase
          .from("pain_diary_entries" as any)
          .update({ pain_score: painScore, notes: notes || null } as any)
          .eq("id", todayEntry.id);
      } else {
        await supabase
          .from("pain_diary_entries" as any)
          .insert({ user_id: user.id, pain_score: painScore, notes: notes || null, logged_at: today } as any);
      }
      await fetchEntries();
      setEditing(false);
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        {t("diary.title")}
      </h2>

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
