import { LANDING_LAYOUT } from "@/lib/landingLayout";
import AcademicLandingCinematic from "@/pages/cinematic/AcademicLandingCinematic";
import AcademicLandingClassic from "@/pages/legacy/AcademicLandingClassic";

const AcademicLanding = () =>
  LANDING_LAYOUT === "classic" ? <AcademicLandingClassic /> : <AcademicLandingCinematic />;

export default AcademicLanding;
