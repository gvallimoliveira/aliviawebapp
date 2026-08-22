import { LANDING_LAYOUT } from "@/lib/landingLayout";
import ProfessionalLandingCinematic from "@/pages/cinematic/ProfessionalLandingCinematic";
import ProfessionalLandingClassic from "@/pages/legacy/ProfessionalLandingClassic";

const ProfessionalLanding = () =>
  LANDING_LAYOUT === "classic" ? <ProfessionalLandingClassic /> : <ProfessionalLandingCinematic />;

export default ProfessionalLanding;
