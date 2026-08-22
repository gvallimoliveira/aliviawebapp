import { LANDING_LAYOUT } from "@/lib/landingLayout";
import ClinicLandingCinematic from "@/pages/cinematic/ClinicLandingCinematic";
import ClinicLandingClassic from "@/pages/legacy/ClinicLandingClassic";

const ClinicLanding = () =>
  LANDING_LAYOUT === "classic" ? <ClinicLandingClassic /> : <ClinicLandingCinematic />;

export default ClinicLanding;
