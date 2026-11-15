import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { activateClinicTrial, CLINIC_TRIAL_ENTRY, PENDING_TRIAL_KEY, readPendingClinicTrial } from "@/lib/clinicTrialEntry";

export default function ClinicTrialEntry() {
  const { user, ready } = useAuth();
  const { setActiveContext } = useClinic();
  const navigate = useNavigate();
  const running = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || running.current) return;
    const pending = readPendingClinicTrial();
    if (!pending) { navigate("/clinica#pricing", { replace: true }); return; }
    if (!user) { navigate(`/auth?clinic_trial=1&redirect=${encodeURIComponent(CLINIC_TRIAL_ENTRY)}`, { replace: true }); return; }
    running.current = true;
    setError("");
    void (async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data.user) throw new Error("Entre novamente na sua conta para ativar o teste.");
        if (data.user.email?.trim().toLowerCase() !== pending.email) throw new Error("O e-mail da conta conectada é diferente do informado. Volte e use o e-mail desta conta, ou saia dela para entrar na conta correta.");
        const result = await activateClinicTrial(pending);
        if (result.requires_login || result.requires_signup || !result.clinic_id) throw new Error("Entre novamente na sua conta para ativar o teste.");
        setActiveContext("clinic", result.clinic_id);
        sessionStorage.removeItem(PENDING_TRIAL_KEY);
        sessionStorage.removeItem("clinicActivationSkipped");
        // Reload the clinic provider only after provisioning has completed.
        window.location.replace("/dashboard?tab=clinic");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível ativar o teste. Tente novamente.");
        running.current = false;
      }
    })();
  }, [ready, user?.id, navigate, attempt]);

  return <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
    <Building2 className="h-9 w-9 text-primary" />
    <h1 className="text-2xl font-semibold text-foreground">{error ? "Não foi possível ativar o teste" : "Ativando sua clínica"}</h1>
    {error ? <><p className="max-w-md text-muted-foreground" role="alert">{error}</p>
      <Button onClick={() => setAttempt(a => a + 1)}>Tentar novamente</Button>
      <Button variant="outline" onClick={() => navigate("/clinica#pricing")}>Voltar aos dados do teste</Button></> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
  </main>;
}