/**
 * FinalHypothesisEditor
 *
 * Allows authorized professionals (PRO autônomo or clinic owner/therapist)
 * to override the AI-suggested diagnostic hypothesis. The final hypothesis
 * — when present — replaces the AI one across the chart, PDF and shares.
 *
 * Visibility is controlled by the parent (gated via useCanEditFinalHypothesis).
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X, Sparkles, UserCheck, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_LEN = 200;

interface FinalHypothesisEditorProps {
  assessmentId: string;
  aiHypothesis: string | null | undefined;
  finalHypothesis: string | null | undefined;
  finalHypothesisAt?: string | null;
  /**
   * "card" (default) renders the standalone card.
   * "inline" renders only the discreet trigger + expandable form, so it can live
   * inside the Diagnostic Hypothesis card.
   */
  variant?: "card" | "inline";
  /** Called after a successful save, with the new value (null if cleared). */
  onSaved?: (newValue: string | null) => void;
}

const FinalHypothesisEditor = ({
  assessmentId,
  aiHypothesis,
  finalHypothesis,
  finalHypothesisAt,
  variant = "card",
  onSaved,
}: FinalHypothesisEditorProps) => {
  const { toast } = useToast();
  const hasOverride = !!finalHypothesis?.trim();

  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"agree" | "override">(hasOverride ? "override" : "agree");
  const [draft, setDraft] = useState(finalHypothesis ?? "");
  const [saving, setSaving] = useState(false);


  const startEdit = () => {
    setMode(hasOverride ? "override" : "agree");
    setDraft(finalHypothesis ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(finalHypothesis ?? "");
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    const newValue = mode === "override" ? trimmed : null;

    if (mode === "override" && !trimmed) {
      toast({
        title: "Hipótese vazia",
        description: "Digite a hipótese final ou marque “Concordo com a IA”.",
        variant: "destructive",
      });
      return;
    }
    if (newValue && newValue.length > MAX_LEN) {
      toast({
        title: "Texto muito longo",
        description: `Máximo de ${MAX_LEN} caracteres.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;

    const { error } = await supabase
      .from("assessments")
      .update({
        final_hypothesis: newValue,
        final_hypothesis_by: newValue ? uid : null,
        final_hypothesis_at: newValue ? new Date().toISOString() : null,
      })
      .eq("id", assessmentId);

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: newValue ? "Hipótese final atualizada" : "Hipótese restaurada para a sugestão da IA",
      description: newValue
        ? "Esta hipótese passa a aparecer no prontuário e no relatório."
        : "A sugestão original da IA voltará a ser exibida.",
    });
    setIsEditing(false);
    onSaved?.(newValue);
  };

  // Format relative time
  const formattedDate = finalHypothesisAt
    ? new Date(finalHypothesisAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card className="rounded-xl border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Hipótese Final (Profissional)
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground font-normal">
            Apenas equipe clínica
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isEditing ? (
          <>
            {hasOverride ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {finalHypothesis}
                </p>
                {formattedDate && (
                  <p className="text-xs text-muted-foreground">
                    Revisada pelo fisioterapeuta · {formattedDate}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Usando a hipótese sugerida pela IA.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              {hasOverride ? "Editar hipótese final" : "Ajustar / Sobrescrever"}
            </Button>
          </>
        ) : (
          <>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "agree" | "override")}
              className="space-y-2"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="agree" id="fh-agree" className="mt-0.5" />
                <Label htmlFor="fh-agree" className="text-sm cursor-pointer leading-snug">
                  Concordo com a hipótese da IA
                  {aiHypothesis && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      “{aiHypothesis}”
                    </span>
                  )}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="override" id="fh-override" className="mt-0.5" />
                <Label htmlFor="fh-override" className="text-sm cursor-pointer">
                  Ajustar / Sobrescrever
                </Label>
              </div>
            </RadioGroup>

            {mode === "override" && (
              <div className="space-y-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                  placeholder="Ex: Síndrome femoropatelar bilateral"
                  className="min-h-[60px] text-sm"
                  maxLength={MAX_LEN}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {draft.length}/{MAX_LEN}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : mode === "agree" && hasOverride ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {mode === "agree" && hasOverride ? "Restaurar IA" : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                disabled={saving}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalHypothesisEditor;
