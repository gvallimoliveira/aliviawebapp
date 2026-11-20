import { lazy } from "react";
import BlogHighlights from "@/components/blog/BlogHighlights";
import BrandMarquee from "@/components/scroll/BrandMarquee";
import LgpdBadge from "@/components/LgpdBadge";
import LazySection from "./professional/LazySection";

/**
 * Orchestrator for everything below the professional hero.
 * Each block is its own chunk and only mounts when it approaches the
 * viewport, so scrolling never competes with building the whole page.
 */
const StatementSection = lazy(() => import("./professional/sections/StatementSection"));
const EarlyCtaSection = lazy(() => import("./professional/sections/EarlyCtaSection"));
const ReasoningSection = lazy(() => import("./professional/sections/ReasoningSection"));
const BenefitsSection = lazy(() => import("./professional/sections/BenefitsSection"));
const PanelShowcaseSection = lazy(() => import("./professional/sections/PanelShowcaseSection"));
const EvidenceLibrarySection = lazy(() => import("./professional/sections/EvidenceLibrarySection"));
const HowItWorksSection = lazy(() => import("./professional/sections/HowItWorksSection"));
const PricingSection = lazy(() => import("./professional/sections/PricingSection"));
const FaqSection = lazy(() => import("./professional/sections/FaqSection"));
const ClosingSection = lazy(() => import("./professional/sections/ClosingSection"));

const ProfessionalLandingBody = () => (
  <>
    <BrandMarquee />

    <LazySection minHeight={800}><StatementSection /></LazySection>
    <LazySection minHeight={320}><EarlyCtaSection /></LazySection>
    <LazySection minHeight={520}><ReasoningSection /></LazySection>
    <LazySection minHeight={900}><BenefitsSection /></LazySection>
    <LazySection minHeight={600}><PanelShowcaseSection /></LazySection>
    <LazySection minHeight={520}><EvidenceLibrarySection /></LazySection>
    <LazySection minHeight={700}><HowItWorksSection /></LazySection>

    <LgpdBadge />

    <LazySection minHeight={760}><PricingSection /></LazySection>
    <LazySection minHeight={520}><FaqSection /></LazySection>
    <BlogHighlights audience="professional" />
    <LazySection minHeight={700}><ClosingSection /></LazySection>
  </>
);

export default ProfessionalLandingBody;
