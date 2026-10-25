import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PeriodizationCheckin from "@/pages/PeriodizationCheckin";
import { Button } from "@/components/ui/button";

type State = "loading" | "ready" | "none";

/**
 * Check-in de carga e prontidão na página pessoal do paciente.
 *
 * Quando o e-mail da conta está cadastrado como paciente de um fisioterapeuta
 * (ou clínica), a função `periodization-checkin` (ação `my_link`) devolve — ou
 * cria — o link de check-in dele, e o mesmo formulário do link público é
 * embutido aqui. Sem cadastro vinculado, o card não aparece.
 */
const PatientCheckinCard = () => {
  const [state, setState] = useState<State>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("periodization-checkin", {
          body: { action: "my_link" },
        });
        if (cancelled) return;
        if (error || !data?.token) { setState("none"); return; }
        setToken(data.token);
        setState("ready");
      } catch {
        if (!cancelled) setState("none");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === "none") return null;

  if (state === "loading") {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando acompanhamento de carga…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-auto flex items-center justify-between gap-2 px-4 py-3 text-left whitespace-normal"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Check-in de carga e prontidão
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && token && (
        <CardContent className="pt-0">
          <PeriodizationCheckin token={token} embedded />
        </CardContent>
      )}
    </Card>
  );
};

export default PatientCheckinCard;
