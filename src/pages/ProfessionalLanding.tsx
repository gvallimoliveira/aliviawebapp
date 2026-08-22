import { Suspense, lazy } from "react";
import { LANDING_LAYOUT } from "@/lib/landingLayout";

// Só o layout ativo é baixado (evita carregar cinematic + classic no mesmo chunk).
const ProfessionalLandingCinematic = lazy(() => import("@/pages/cinematic/ProfessionalLandingCinematic"));
const ProfessionalLandingClassic = lazy(() => import("@/pages/legacy/ProfessionalLandingClassic"));

const ProfessionalLanding = () => (
  <Suspense fallback={<div className="min-h-screen bg-background" />}>
    {LANDING_LAYOUT === "classic" ? <ProfessionalLandingClassic /> : <ProfessionalLandingCinematic />}
  </Suspense>
);

export default ProfessionalLanding;
