import { Suspense, lazy } from "react";
import { LANDING_LAYOUT } from "@/lib/landingLayout";

const PatientLandingCinematic = lazy(() => import("@/pages/cinematic/PatientLandingCinematic"));
const PatientLandingClassic = lazy(() => import("@/pages/legacy/PatientLandingClassic"));

const PatientLanding = () => (
  <Suspense fallback={<div className="min-h-screen bg-background" />}>
    {LANDING_LAYOUT === "classic" ? <PatientLandingClassic /> : <PatientLandingCinematic />}
  </Suspense>
);

export default PatientLanding;
