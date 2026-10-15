import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Stethoscope, Activity, Dumbbell, Heart, MapPin, Brain, Scissors, RotateCcw, Loader2, ShieldAlert, HeartHandshake } from "lucide-react";
import {
  ANAMNESIS_SUB_IDS,
  DEFAULT_REASSESS_STEPS,
  type ReassessStepId,
} from "@/lib/reassessmentSteps";
import { useState } from "react";

interface ReassessmentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (steps: ReassessStepId[]) => void;
  loading?: boolean;
  patientName?: string | null;
}

type Option = {
  id: ReassessStepId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "anamnesis" | "other";
};

const OPTIONS: Option[] = [
  { id: "complaint", group: "anamnesis", icon: ClipboardList, label: "Queixa principal e caracterização da dor", desc: "Tipo, evolução, fatores que pioram/aliviam, duração e frequência." },
  { id: "painmap", group: "anamnesis", icon: MapPin, label: "Mapa de dor", desc: "Regiões corporais acometidas." },
  { id: "painscore", group: "anamnesis", icon: Heart, label: "Intensidade da dor (EVA)", desc: "Escala 0–10, geral ou por região." },
  { id: "painmechanism", group: "anamnesis", icon: Brain, label: "Triagem do tipo/mecanismo de dor", desc: "Opcional para o paciente — como a dor se comporta (linguagem simples)." },
  { id: "surgery", group: "anamnesis", icon: Scissors, label: "Histórico de cirurgia", desc: "Cirurgias prévias e detalhes." },
  { id: "activity", group: "anamnesis", icon: Activity, label: "Atividade física", desc: "Nível de atividade e acesso a academia." },
  { id: "questionnaire", group: "other", icon: Dumbbell, label: "Questionários validados", desc: "Reaplica os questionários funcionais com destaque das respostas anteriores." },
  { id: "functionaltests", group: "other", icon: Activity, label: "Testes funcionais autoaplicados", desc: "Opcional — o paciente marca quais movimentos/testes provocam dor, por região." },
  { id: "psychosocial", group: "other", icon: HeartHandshake, label: "Perfil psicossocial (FABQ)", desc: "Opcional — crenças de medo-evitação e catastrofização (yellow flags). Indicado em dor persistente, recidivas ou mecanismo nociplástico." },
  { id: "spine", group: "other", icon: HeartHandshake, label: "Escoliose / coluna torácica (SRS-22r)", desc: "Opcional — impacto da condição da coluna nas atividades diárias, dor, autoimagem e saúde mental. Quando marcado, o paciente responde obrigatoriamente." },
  { id: "redflags", group: "other", icon: ShieldAlert, label: "Triagem de Red Flags", desc: "Opcional — a reavaliação pula esta etapa por padrão." },
];

const ReassessmentConfigDialog = ({ open, onOpenChange, onConfirm, loading, patientName }: ReassessmentConfigDialogProps) => {
  const [selected, setSelected] = useState<Set<ReassessStepId>>(() => new Set(DEFAULT_REASSESS_STEPS));

  const toggle = (id: ReassessStepId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Vínculo: questionários dependem do mapa de dor (as regiões marcadas
      // definem quais questionários serão aplicados). Se ativar questionário,
      // força painmap ON. Se desligar painmap, remove questionário.
      if (id === "questionnaire" && next.has("questionnaire")) {
        next.add("painmap");
      }
      if (id === "functionaltests" && next.has("functionaltests")) {
        next.add("painmap");
      }
      if (id === "painmap" && !next.has("painmap")) {
        next.delete("questionnaire");
        next.delete("functionaltests");
      }
      return next;
    });
  };

  const anamnesisCount = ANAMNESIS_SUB_IDS.filter((id) => selected.has(id)).length;
  const hasQuestionnaire = selected.has("questionnaire");
  const canConfirm = anamnesisCount > 0 || hasQuestionnaire || selected.has("functionaltests") || selected.has("psychosocial") || selected.has("spine");

  const handleConfirm = () => {
    // Preserve a stable order for the URL
    const order: ReassessStepId[] = ["redflags", "complaint", "painmap", "surgery", "painscore", "painmechanism", "activity", "questionnaire", "functionaltests", "psychosocial", "spine"];
    onConfirm(order.filter((id) => selected.has(id)));
  };

  const anamnesisOptions = OPTIONS.filter((o) => o.group === "anamnesis");
  const otherOptions = OPTIONS.filter((o) => o.group === "other");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary" /> Configurar reavaliação</DialogTitle>
          <DialogDescription>
            {patientName ? `Para ${patientName}. ` : ""}Selecione apenas as etapas que você quer que o paciente refaça. As etapas não marcadas serão preenchidas automaticamente com os dados da avaliação anterior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sempre obrigatório */}
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 flex items-start gap-3">
            <Checkbox checked disabled className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Dados do paciente</span>
                <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Necessário para vincular a nova avaliação ao paciente.</p>
            </div>
          </div>

          {/* Anamnese (subgrupos) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Anamnese — selecione os blocos</h4>
              <Badge variant="secondary" className="text-[10px]">{anamnesisCount}/{ANAMNESIS_SUB_IDS.length}</Badge>
            </div>
            <div className="space-y-2">
              {anamnesisOptions.map((opt) => {
                const Icon = opt.icon;
                const checked = selected.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 flex items-start gap-3 transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outras etapas */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Outras etapas</h4>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Os questionários são aplicados conforme as <strong>regiões marcadas no mapa de dor</strong>, por isso só podem ser ativados em conjunto com a etapa "Mapa de dor". Marcar questionários liga o mapa automaticamente; desmarcar o mapa também remove os questionários.
            </p>
            <div className="space-y-2">
              {otherOptions.map((opt) => {
                const Icon = opt.icon;
                const checked = selected.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 flex items-start gap-3 transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!canConfirm && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Selecione pelo menos um bloco da anamnese ou os questionários para gerar o link.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Gerar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReassessmentConfigDialog;
