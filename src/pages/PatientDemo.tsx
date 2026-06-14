import { lazy, Suspense, useEffect } from "react";
import { Activity, HeartPulse } from "lucide-react";
import { setSeo } from "@/lib/seo";
import { hideNavOverlay, showNavOverlay } from "@/lib/navigationOverlay";

const PatientDemoContent = lazy(() => import("@/components/demo/PatientDemoContent"));
export const warmPatientDemoRoute = () => Promise.all([
  import("@/components/demo/PatientDemoContent"),
  import("@/components/demo/PatientDemoHealth"),
]);

const PatientDemoShell = () => (
  <div className="min-h-screen bg-background">
    <div className="container flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeartPulse className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Abrindo demo do paciente…</p>
            <p className="text-xs text-muted-foreground">Carregando o painel interativo…</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-foreground">
                <Activity className="h-4 w-4 text-primary" /> Minha Saúde
              </div>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-foreground">
                <HeartPulse className="h-4 w-4 text-primary" /> Mensagens
              </div>
              <div className="space-y-2">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PatientDemo = () => {
  useEffect(() => {
    // If the user arrived here directly (deep link), still show the global
    // overlay so the indicator is consistent across entry points.
    if (!sessionStorage.getItem("patient-demo-opening")) {
      showNavOverlay("Abrindo demo do paciente…");
      sessionStorage.setItem("patient-demo-opening", String(Date.now()));
    }

    setSeo({
      title: "Demo Premium — Aliv.iA",
      description: "Veja como funciona o painel Premium do paciente Aliv.iA com autoavaliações, diário de dor e exercícios.",
      url: `${window.location.origin}/para-pacientes/demo`,
      type: "website",
    });

    void warmPatientDemoRoute();
  }, []);

  // Hide the global overlay once the heavy content has mounted (handled by
  // PatientDemoContent itself).
  useEffect(() => () => {
    hideNavOverlay();
    sessionStorage.removeItem("patient-demo-opening");
  }, []);

  return (
    <Suspense fallback={<PatientDemoShell />}>
      <PatientDemoContent />
    </Suspense>
  );
};

export default PatientDemo;
