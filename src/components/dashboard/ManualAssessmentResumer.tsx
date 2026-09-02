import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  closeManualAssessmentSession,
  clearManualAssessmentSession,
  getResumableManualAssessmentSession,
  type ManualAssessmentSession,
} from "@/lib/manualAssessmentSession";
import { lazy, Suspense } from "react";

// Carregado sob demanda: o modal arrasta gráficos/PDF e não deve pesar
// no bundle inicial das páginas públicas.
const ManualAssessmentModal = lazy(() => import("./ManualAssessmentModal"));

/**
 * Reabre o modal de Avaliação Manual quando o app foi descarregado pelo SO
 * (tela bloqueada, troca de app, kill de memória) com uma avaliação em
 * andamento — e SOMENTE nesse caso.
 *
 * Regras de estabilidade (evitam reabertura fantasma durante navegação):
 *  - uma única tentativa por boot do app, após o auth resolver;
 *  - só retoma sessões com conteúdo real (`hasContent`);
 *  - sessões encerradas explicitamente nunca voltam;
 *  - nunca monta se já existe um diálogo aberto na tela;
 *  - sem polling e sem escuta de `focus`/`visibilitychange` (era isso que
 *    reabria o modal ao alternar de aba/app).
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
  const tryingRef = useRef(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (loading) return; // espera o auth resolver antes da única tentativa

    let cancelled = false;

    const tryRestore = async () => {
      if (cancelled || tryingRef.current) return;

      const stored = getResumableManualAssessmentSession();
      if (!stored) {
        attemptedRef.current = true;
        return;
      }

      // Rotas onde nunca devemos interromper o usuário
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
      const path = window.location.pathname;
      if (skipPrefixes.some((p) => path.startsWith(p))) return;

      if (stored.userId && user?.id && stored.userId !== user.id) {
        clearManualAssessmentSession();
        attemptedRef.current = true;
        return;
      }

      // Não empilha em cima de outro modal/diálogo já aberto.
      if (
        document.querySelector("[data-manual-assessment-modal]") ||
        document.querySelector("[role='dialog'],[data-state='open'][role='alertdialog']")
      ) {
        return;
      }

      tryingRef.current = true;
      attemptedRef.current = true;
      try {
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
      } finally {
        tryingRef.current = false;
      }
    };

    // Pequeno atraso: deixa a rota inicial estabilizar antes de decidir.
    const t = window.setTimeout(() => void tryRestore(), 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, location.pathname]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      closeManualAssessmentSession();
      setSession(null);
      setEditAssessment(null);
    }
  };

  if (!open || !session) return null;
  return (
    <Suspense fallback={null}>
      <ManualAssessmentModal
        open={open}
        onOpenChange={handleOpenChange}
        professionalId={session.professionalId}
        clinicId={session.clinicId}
        patientName={session.patientName}
        patientEmail={session.patientEmail || undefined}
        patientId={session.patientId || undefined}
        editAssessment={editAssessment}
      />
    </Suspense>
  );
};

export default ManualAssessmentResumer;
