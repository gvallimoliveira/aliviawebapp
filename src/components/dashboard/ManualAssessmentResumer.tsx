import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  clearManualAssessmentSession,
  getManualAssessmentSession,
  type ManualAssessmentSession,
} from "@/lib/manualAssessmentSession";
import ManualAssessmentModal from "./ManualAssessmentModal";

/**
 * Reabre automaticamente o modal de Avaliação Manual quando o app é recarregado
 * com uma sessão ativa no localStorage. Cobre os cenários em que o SO descarrega
 * a PWA (tela bloqueada, troca de app, kill de memória) — o usuário volta
 * exatamente onde estava, com o rascunho restaurado via useAutosaveDraft.
 */
const ManualAssessmentResumer = () => {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const isPt = language === "pt";

  const [session, setSession] = useState<ManualAssessmentSession | null>(null);
  const [editAssessment, setEditAssessment] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user?.id) return;
    if (open) return;

    const stored = getManualAssessmentSession();
    if (!stored) return;

    // Confere se a sessão pertence ao usuário logado
    if (stored.userId && stored.userId !== user.id) {
      clearManualAssessmentSession();
      return;
    }

    // Evita duplicar: se outro host já montou o modal, não monta o nosso.
    if (document.querySelector("[data-manual-assessment-modal]")) return;

    // Não reabrir em rotas onde isso seria intrusivo / sem sentido.
    const skipPrefixes = [
      "/auth",
      "/reset-password",
      "/verificar-email",
      "/auth/callback",
      "/aceitar-convite",
      "/payment-success",
      "/upgrade-welcome",
      "/clinica/demo",
      "/profissionais/demo",
      "/para-pacientes/demo",
      "/assessment/professional/demo",
    ];
    if (skipPrefixes.some((p) => location.pathname.startsWith(p))) return;

    let cancelled = false;
    const restore = async () => {
      let editData: any = null;
      if (stored.editAssessmentId) {
        try {
          const { data } = await supabase
            .from("assessments")
            .select("*")
            .eq("id", stored.editAssessmentId)
            .maybeSingle();
          if (data) editData = data;
        } catch {
          /* ignora — segue como nova */
        }
      }
      if (cancelled) return;
      setEditAssessment(editData);
      setSession(stored);
      setOpen(true);
      toast({
        title: isPt ? "Retomando avaliação manual" : "Resuming manual assessment",
        description: isPt
          ? `Continue de onde parou com ${stored.patientName}.`
          : `Continue where you left off with ${stored.patientName}.`,
      });
    };
    void restore();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      // o próprio modal já limpa a sessão ao confirmar saída/salvar — reforço.
      clearManualAssessmentSession();
      setSession(null);
      setEditAssessment(null);
    }
  };

  if (!open || !session) return null;
  return (
    <ManualAssessmentModal
      open={open}
      onOpenChange={handleOpenChange}
      professionalId={session.professionalId}
      clinicId={session.clinicId}
      patientName={session.patientName}
      patientEmail={session.patientEmail || undefined}
      editAssessment={editAssessment}
    />
  );
};

export default ManualAssessmentResumer;
