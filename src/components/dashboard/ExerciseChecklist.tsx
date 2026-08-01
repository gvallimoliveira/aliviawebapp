import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, CheckCircle2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ProgramWithItems {
  programId: string;
  programName: string;
  professionalName: string;
  assessmentId: string | null;
  items: {
    id: string;
    name: string;
    sets: string;
    reps: string;
    frequency: string;
  }[];
}

interface Props {
  /** IDs das avaliações da condição em foco (vazio/undefined = sem filtro) */
  conditionAssessmentIds?: string[];
  /** Rótulo da condição em foco, usado no aviso de filtro */
  conditionLabel?: string;
  /** Só filtra quando o paciente tem mais de uma condição */
  filterByCondition?: boolean;
}

const ExerciseChecklist = ({
  conditionAssessmentIds,
  conditionLabel,
  filterByCondition = false,
}: Props) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [programs, setPrograms] = useState<ProgramWithItems[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [allDone, setAllDone] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Get ONLY programs that belong to this user (via assessment user_id, patient_email,
    // or matching patient record by email). Uses a security-definer RPC to enforce ownership.
    const { data: myPrograms, error: rpcErr } = await (supabase as any)
      .rpc("get_my_active_exercise_programs");

    if (rpcErr || !myPrograms || myPrograms.length === 0) {
      setPrograms([]);
      setLoading(false);
      return;
    }


    const programIds = myPrograms.map((p: any) => p.program_id);

    // Fetch items for those programs only
    const { data: items } = await (supabase as any)
      .from("exercise_program_items")
      .select(`
        id, sets, reps, frequency, sort_order, custom_name, program_id,
        exercise:exercise_library(name_pt, name_en, name_es)
      `)
      .in("program_id", programIds);

    const itemsByProgram = new Map<string, any[]>();
    (items || []).forEach((it: any) => {
      const arr = itemsByProgram.get(it.program_id) || [];
      arr.push(it);
      itemsByProgram.set(it.program_id, arr);
    });

    const mapped: ProgramWithItems[] = myPrograms
      .map((p: any) => ({
        programId: p.program_id,
        programName: p.patient_name || "",
        professionalName: p.professional_name || "",
        assessmentId: p.assessment_id || null,
        items: (itemsByProgram.get(p.program_id) || [])

          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => ({
            id: item.id,
            name: item.custom_name || (
              language === "en" ? (item.exercise?.name_en || item.exercise?.name_pt) :
              language === "es" ? (item.exercise?.name_es || item.exercise?.name_pt) :
              item.exercise?.name_pt
            ) || "Exercício",
            sets: item.sets,
            reps: item.reps,
            frequency: item.frequency,
          })),
      }))
      .filter((p) => p.items.length > 0);

    setPrograms(mapped);

    // Fetch today's completions
    const allItemIds = mapped.flatMap((p) => p.items.map((i) => i.id));
    if (allItemIds.length > 0) {
      const { data: completions } = await (supabase as any)
        .from("exercise_completions")
        .select("exercise_item_id")
        .eq("user_id", user.id)
        .eq("completed_at", today)
        .in("exercise_item_id", allItemIds);

      const completedSet = new Set<string>(
        (completions || []).map((c: any) => c.exercise_item_id)
      );
      setCompletedToday(completedSet);
    }

    setLoading(false);
  }, [user, today, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mostra apenas os HEP vinculados à condição em foco.
  // Programas sem avaliação vinculada (legado / criados manualmente) seguem visíveis.
  const visiblePrograms = useMemo(() => {
    if (!filterByCondition || !conditionAssessmentIds || conditionAssessmentIds.length === 0) {
      return programs;
    }
    const allowed = new Set(conditionAssessmentIds);
    const matched = programs.filter((p) => p.assessmentId && allowed.has(p.assessmentId));
    const unlinked = programs.filter((p) => !p.assessmentId);
    return [...matched, ...unlinked];
  }, [programs, filterByCondition, conditionAssessmentIds]);

  const hiddenCount = programs.length - visiblePrograms.length;

  // Check if all done
  useEffect(() => {
    const totalItems = visiblePrograms.reduce((sum, p) => sum + p.items.length, 0);
    const doneVisible = visiblePrograms
      .flatMap((p) => p.items)
      .filter((i) => completedToday.has(i.id)).length;
    if (totalItems > 0 && doneVisible === totalItems && !allDone) {
      setAllDone(true);
      setTimeout(() => setAllDone(false), 3000);
    }
  }, [completedToday, visiblePrograms]);


  const toggleExercise = async (programId: string, itemId: string) => {
    if (!user) return;

    const isCompleted = completedToday.has(itemId);
    const newSet = new Set(completedToday);

    if (isCompleted) {
      newSet.delete(itemId);
      setCompletedToday(newSet);
      await (supabase as any)
        .from("exercise_completions")
        .delete()
        .eq("user_id", user.id)
        .eq("exercise_item_id", itemId)
        .eq("completed_at", today);
    } else {
      newSet.add(itemId);
      setCompletedToday(newSet);
      await (supabase as any)
        .from("exercise_completions")
        .insert({
          user_id: user.id,
          program_id: programId,
          exercise_item_id: itemId,
          completed_at: today,
        });

      // Check if all done after this toggle
      const totalItems = programs.reduce((sum, p) => sum + p.items.length, 0);
      if (newSet.size === totalItems) {
        toast.success(t("exercise_checklist.all_done") || "Parabéns! Todos os exercícios concluídos hoje! 🎉");
      }
    }
  };

  if (loading || programs.length === 0) return null;

  const totalItems = programs.reduce((sum, p) => sum + p.items.length, 0);
  const completedCount = completedToday.size;
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Dumbbell className="h-5 w-5 text-muted-foreground" />
        {t("exercise_checklist.title") || "Exercícios do Dia"}
      </h2>

      {/* Progress Card */}
      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 mb-3">
            <AnimatePresence>
              {allDone && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Trophy className="h-6 w-6 text-amber-500" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {t("exercise_checklist.progress") || "Progresso de hoje"}
                </span>
                <span className="font-semibold text-foreground">
                  {completedCount}/{totalItems}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
            </div>
          </div>
          {completedCount === totalItems && totalItems > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("exercise_checklist.completed_msg") || "Todos os exercícios concluídos! Continue assim!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise Items */}
      {programs.map((prog) => (
        <Card key={prog.programId}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>{prog.professionalName}</span>
              <Badge variant="outline" className="text-[10px]">
                {prog.items.length} {prog.items.length === 1
                  ? (t("exercise_checklist.exercise") || "exercício")
                  : (t("exercise_checklist.exercises") || "exercícios")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {prog.items.map((item) => {
              const done = completedToday.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors cursor-pointer ${
                    done ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleExercise(prog.programId, item.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => toggleExercise(prog.programId, item.id)}
                    className="shrink-0"
                  />
                  <div className={`flex-1 min-w-0 ${done ? "opacity-60" : ""}`}>
                    <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.sets}×{item.reps} · {item.frequency}
                    </p>
                  </div>
                  {done && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExerciseChecklist;
