import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessmentId: string;
  onDismissed?: () => void;
}

const PRESETS = [
  { id: "referral", label: "Paciente em acompanhamento médico ativo" },
  { id: "cleared", label: "Aval/atestado médico recebido autorizando fisioterapia" },
  { id: "ruled_out", label: "Sinal investigado e descartado pelo médico" },
  { id: "other", label: "Outro motivo (descrever abaixo)" },
];

const DismissRedFlagDialog = ({ open, onOpenChange, assessmentId, onDismissed }: Props) => {
  const { toast } = useToast();
  const [preset, setPreset] = useState("referral");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const presetLabel = PRESETS.find((p) => p.id === preset)?.label || "";
    const finalReason = preset === "other"
      ? reason.trim()
      : `${presetLabel}${reason.trim() ? ` — ${reason.trim()}` : ""}`;

    if (finalReason.length < 10) {
      toast({
        title: "Justificativa muito curta",
        description: "Descreva o motivo da dispensa com pelo menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await (supabase.rpc as any)("dismiss_assessment_red_flags", {
      _assessment_id: assessmentId,
      _reason: finalReason,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Não foi possível dispensar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Red flag dispensada", description: "Hipótese liberada para uso clínico." });
    onOpenChange(false);
    setReason("");
    setPreset("referral");
    onDismissed?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispensar red flag</DialogTitle>
          <DialogDescription>
            Registre por que o sinal de alerta pode ser dispensado. Essa informação fica no PDF e no histórico do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <RadioGroup value={preset} onValueChange={setPreset} className="space-y-2">
              {PRESETS.map((p) => (
                <div key={p.id} className="flex items-start gap-2">
                  <RadioGroupItem value={p.id} id={`rf-${p.id}`} className="mt-0.5" />
                  <Label htmlFor={`rf-${p.id}`} className="text-sm font-normal cursor-pointer leading-tight">
                    {p.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rf-reason">
              {preset === "other" ? "Descreva o motivo *" : "Observações (opcional)"}
            </Label>
            <Textarea
              id="rf-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: paciente apresentou exame oncológico atualizado liberando atividade física orientada."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar dispensa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DismissRedFlagDialog;
