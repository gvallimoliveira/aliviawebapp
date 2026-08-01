import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, ClipboardList, Calendar, MapPin, ChevronRight,
  CheckCircle2, Activity, Loader2, RotateCcw, Trash2, X,
} from "lucide-react";
import { buildResumeAssessmentLink } from "@/lib/assessmentLinks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const painRegionLabels: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
  upper_back: "Coluna Torácica", lower_back: "Lombar", chest: "Tórax",
  right_elbow: "Cotovelo D.", left_elbow: "Cotovelo E.",
  right_wrist: "Punho D.", left_wrist: "Punho E.",
  right_hip: "Quadril D.", left_hip: "Quadril E.",
  right_knee: "Joelho D.", left_knee: "Joelho E.",
  right_ankle: "Tornozelo D.", left_ankle: "Tornozelo E.",
  right_gluteal: "Glúteo D.", left_gluteal: "Glúteo E.",
  right_hamstring: "Posterior Coxa D.", left_hamstring: "Posterior Coxa E.",
  right_calf: "Panturrilha D.", left_calf: "Panturrilha E.",
};

interface AssessmentHistoryProps {
  /** avaliações da condição em foco */
  assessments: any[];
  /** todas as avaliações do usuário (todas as condições) */
  allAssessments?: any[];
  /** id da avaliação -> rótulo da condição */
  conditionLabels?: Record<string, string>;
  onDeleted?: (deletedIds: string[]) => void;
}

const AssessmentHistory = ({
  assessments,
  allAssessments,
  conditionLabels,
  onDeleted,
}: AssessmentHistoryProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const all = allAssessments && allAssessments.length ? allAssessments : assessments;
  const hasOtherConditions = all.length > assessments.length;
  // Em modo de gerenciamento mostramos TODAS as avaliações, para que excluir
  // realmente elimine os cards de condições e a nota de dor correspondentes.
  const visible = showAll || selectMode ? all : assessments;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected([]);
  };


  const handleDelete = async () => {
    if (selected.length === 0) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("delete_my_assessments", { _ids: selected });
      if (error) throw error;
      const count = typeof data === "number" ? data : 0;

      if (count === 0) {
        toast.error("Nenhuma avaliação foi excluída", {
          description: "Você não tem permissão para excluir estes registros.",
        });
        return;
      }
      toast.success(
        count === 1
          ? "1 avaliação excluída permanentemente"
          : `${count} avaliações excluídas permanentemente`,
      );
      onDeleted?.(selected);
      exitSelectMode();
    } catch (e: any) {
      toast.error("Não foi possível excluir", { description: e?.message });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };


  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { label: t("dashboard.completed") || "Concluída", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
      case "diagnosis_complete":
        return { label: t("dashboard.diagnosis_done") || "Diagnóstico pronto", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Activity };
      default:
        return { label: t("dashboard.in_progress") || "Em andamento", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Loader2 };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          {t("dashboard.history")}
        </h2>
        {visible.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() =>
                    setSelected(selected.length === visible.length ? [] : visible.map((a) => a.id))
                  }
                >
                  {selected.length === visible.length ? "Limpar seleção" : "Selecionar tudo"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={selected.length === 0 || deleting}
                  onClick={() => setConfirmOpen(true)}
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Excluir ({selected.length})
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={exitSelectMode}>
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {hasOtherConditions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "Ver só a condição em foco" : `Ver todas (${all.length})`}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground"
                  onClick={() => setSelectMode(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Gerenciar histórico
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {selectMode && hasOtherConditions && (
        <p className="text-xs text-muted-foreground mb-3">
          Mostrando todas as avaliações (todas as condições) para que a exclusão remova também os
          cards de condições e a nota de dor.
        </p>
      )}
      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("dashboard.no_assessments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {

            const statusConfig = getStatusConfig(a.status);
            const StatusIcon = statusConfig.icon;
            const hypothesis = (a as any).final_hypothesis?.trim() || a.diagnosis?.hypothesis;
            const regions = (a.pain_regions || [])
              .map((r: string) => painRegionLabels[r] || r)
              .slice(0, 3);
            const extraRegions = (a.pain_regions || []).length - 3;
            const isInProgress = a.status === "in_progress";
            const isClickable = !selectMode && (a.diagnosis || ["completed", "diagnosis_complete"].includes(a.status));
            const resumeCtx = a.clinic_id
              ? { clinicId: a.clinic_id }
              : a.professional_id
                ? { professionalId: a.professional_id }
                : null;
            const resumeLink = isInProgress && resumeCtx
              ? buildResumeAssessmentLink(resumeCtx, a.id)
              : null;
            const isSelected = selected.includes(a.id);

            return (
              <Card
                key={a.id}
                className={`hover:shadow-md transition-all border-border/60 hover:border-border group ${
                  isInProgress ? "border-blue-300/60 bg-blue-50/30" : ""
                } ${isSelected ? "border-destructive/60 bg-destructive/5" : ""} ${
                  isClickable || selectMode ? "cursor-pointer" : ""
                }`}
                onClick={
                  selectMode
                    ? () => toggle(a.id)
                    : isClickable
                      ? () => navigate(`/assessment/view/${a.id}`)
                      : undefined
                }
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    {selectMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                        aria-label="Selecionar avaliação"
                      />
                    )}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${
                              a.type === "premium"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-secondary text-secondary-foreground border-border"
                            }`}
                          >
                            {a.type === "premium" ? "Premium" : t("compare.basic")}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(a.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </div>
                        </div>

                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${statusConfig.color}`}>
                          <StatusIcon className={`h-3 w-3 ${a.status === "in_progress" ? "animate-spin" : ""}`} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {hypothesis && (
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{hypothesis}</p>
                      )}
                      {regions.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {regions.map((r: string, i: number) => (
                            <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                          {extraRegions > 0 && <span className="text-xs text-muted-foreground">+{extraRegions}</span>}
                          {a.pain_score != null && (
                            <span className="text-xs text-muted-foreground ml-1">• Dor: {a.pain_score}/10</span>
                          )}
                        </div>
                      )}
                      {resumeLink && !selectMode && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white self-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(resumeLink, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("dashboard.continue_assessment") || "Continuar avaliação"}
                        </Button>
                      )}
                    </div>
                    {isClickable && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliações selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão apagados permanentemente {selected.length === 1 ? "1 registro" : `${selected.length} registros`} e
              os dados vinculados (laudos, questionários pendentes, notas e vínculos de diário de dor e exercícios).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssessmentHistory;
