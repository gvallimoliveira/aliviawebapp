import { LANDING_LAYOUT } from "@/lib/landingLayout";
import PatientLandingCinematic from "@/pages/cinematic/PatientLandingCinematic";
import PatientLandingClassic from "@/pages/legacy/PatientLandingClassic";

const PatientLanding = () =>
  LANDING_LAYOUT === "classic" ? <PatientLandingClassic /> : <PatientLandingCinematic />;

export default PatientLanding;
