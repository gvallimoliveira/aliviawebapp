import { useEffect, useRef, useState } from "react";
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
import { lazy, Suspense } from "react";

// Carregado sob demanda: o modal arrasta gráficos/PDF e não deve pesar
// no bundle inicial das páginas públicas.
const ManualAssessmentModal = lazy(() => import("./ManualAssessmentModal"));

/**
 * Reabre automaticamente o modal de Avaliação Manual quando o app é recarregado
 * com uma sessão ativa no localStorage. Cobre os cenários em que o SO descarrega
 * a PWA (tela bloqueada, troca de app, kill de memória) — o usuário volta
 * exatamente onde estava, com o rascunho restaurado via useAutosaveDraft.
 *
 * Estratégia de detecção brute-force (iOS PWA é teimoso):
 *  - tenta logo no mount,
 *  - re-tenta a cada mudança de auth/rota,
 *  - faz polling de 500ms nos primeiros 30s,
 *  - escuta `storage`, `visibilitychange`, `pageshow` e `focus`.
 *  Qualquer um desses gatilhos abre o modal se houver sessão válida.
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
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return; // já restaurou nesta sessão

    let cancelled = false;

    const tryRestore = async () => {
      if (cancelled || restoredRef.current || tryingRef.current || open) return;

      const stored = getManualAssessmentSession();
      if (!stored) return;

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

      // Espera o auth carregar — se houver usuário e ele bater com a sessão,
      // tudo ok; se a sessão não tiver userId salvo, abrimos mesmo assim
      // (cobre clínicas onde o user.id chega tarde no boot).
      if (loading) return;
      if (stored.userId && user?.id && stored.userId !== user.id) {
        clearManualAssessmentSession();
        return;
      }

      // Evita duplicar: se outro host já montou o modal (clique manual num
      // botão de avaliação no exato momento do boot), não monta o nosso.
      if (document.querySelector("[data-manual-assessment-modal]")) return;

      tryingRef.current = true;
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
        if (cancelled || restoredRef.current) return;
        restoredRef.current = true;
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

    // 1) primeira tentativa síncrona
    void tryRestore();

    // 2) polling agressivo nos primeiros 30s
    const poll = window.setInterval(() => {
      if (restoredRef.current) {
        window.clearInterval(poll);
        return;
      }
      void tryRestore();
    }, 500);
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 30_000);

    // 3) eventos do navegador que indicam "app voltou ao primeiro plano"
    const onVisible = () => { if (document.visibilityState === "visible") void tryRestore(); };
    const onPageShow = () => void tryRestore();
    const onFocus = () => void tryRestore();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("manual-assessment")) void tryRestore();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // re-arma quando auth/rota muda para que a 1ª tentativa "real" rode no
    // momento certo (após login resolvido e BrowserRouter trocar de rota).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, location.pathname]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      clearManualAssessmentSession();
      setSession(null);
      setEditAssessment(null);
      restoredRef.current = false; // permite nova retomada no futuro
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
        editAssessment={editAssessment}
      />
    </Suspense>
  );
};

export default ManualAssessmentResumer;
