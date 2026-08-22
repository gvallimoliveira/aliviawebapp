import { Suspense, lazy } from "react";
import { LANDING_LAYOUT } from "@/lib/landingLayout";

const ClinicLandingCinematic = lazy(() => import("@/pages/cinematic/ClinicLandingCinematic"));
const ClinicLandingClassic = lazy(() => import("@/pages/legacy/ClinicLandingClassic"));

const ClinicLanding = () => (
  <Suspense fallback={<div className="min-h-screen bg-background" />}>
    {LANDING_LAYOUT === "classic" ? <ClinicLandingClassic /> : <ClinicLandingCinematic />}
  </Suspense>
);

export default ClinicLanding;
