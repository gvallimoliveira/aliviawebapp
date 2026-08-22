import { LANDING_LAYOUT } from "@/lib/landingLayout";
import type { ComponentType } from "react";

type LandingModule = { default: ComponentType };

let professionalLandingPromise: Promise<LandingModule> | null = null;

/**
 * Shared loader used by React.lazy and navigation intent preloading.
 * Keeping one promise prevents duplicate requests while removing the old
 * wrapper -> active layout request waterfall.
 */
export const loadProfessionalLanding = (): Promise<LandingModule> => {
  if (!professionalLandingPromise) {
    professionalLandingPromise = LANDING_LAYOUT === "classic"
      ? import("@/pages/legacy/ProfessionalLandingClassic")
      : import("@/pages/cinematic/ProfessionalLandingShell");
  }

  return professionalLandingPromise;
};

export const preloadProfessionalLanding = () => {
  void loadProfessionalLanding();
};