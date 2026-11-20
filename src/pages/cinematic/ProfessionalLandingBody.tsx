import { MotionConfig } from "framer-motion";
import BlogHighlights from "@/components/blog/BlogHighlights";
import BrandMarquee from "@/components/scroll/BrandMarquee";
import LgpdBadge from "@/components/LgpdBadge";

/**
 * Orchestrator for everything below the professional hero.
 * Mount content together so fast scrolling cannot expose blank placeholders.
 * Reduced motion is scoped to this landing, not the rest of the application.
 */
import StatementSection from "./professional/sections/StatementSection";
import EarlyCtaSection from "./professional/sections/EarlyCtaSection";
import ReasoningSection from "./professional/sections/ReasoningSection";
import BenefitsSection from "./professional/sections/BenefitsSection";
import PanelShowcaseSection from "./professional/sections/PanelShowcaseSection";
import EvidenceLibrarySection from "./professional/sections/EvidenceLibrarySection";
import HowItWorksSection from "./professional/sections/HowItWorksSection";
import PricingSection from "./professional/sections/PricingSection";
import FaqSection from "./professional/sections/FaqSection";
import ClosingSection from "./professional/sections/ClosingSection";

const ProfessionalLandingBody = () => (
  <MotionConfig reducedMotion="always">
    <BrandMarquee />

    <StatementSection />
    <EarlyCtaSection />
    <ReasoningSection />
    <BenefitsSection />
    <PanelShowcaseSection />
    <EvidenceLibrarySection />
    <HowItWorksSection />

    <LgpdBadge />

    <PricingSection />
    <FaqSection />
    <BlogHighlights audience="professional" />
    <ClosingSection />
  </MotionConfig>
);

export default ProfessionalLandingBody;
