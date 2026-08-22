import { Suspense, lazy } from "react";
import { LANDING_LAYOUT } from "@/lib/landingLayout";

const AcademicLandingCinematic = lazy(() => import("@/pages/cinematic/AcademicLandingCinematic"));
const AcademicLandingClassic = lazy(() => import("@/pages/legacy/AcademicLandingClassic"));

const AcademicLanding = () => (
  <Suspense fallback={<div className="min-h-screen bg-background" />}>
    {LANDING_LAYOUT === "classic" ? <AcademicLandingClassic /> : <AcademicLandingCinematic />}
  </Suspense>
);

export default AcademicLanding;
