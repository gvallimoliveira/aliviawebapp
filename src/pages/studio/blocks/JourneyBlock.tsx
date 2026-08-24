import StickyShowcase, { type ShowcaseStep } from "@/components/scroll/StickyShowcase";
import stepReport from "@/assets/step-report.jpg";
import type { BlockProps } from "./shared";

/** Scrollytelling journey reusing the shared sticky showcase primitive. */
const JourneyBlock = ({ content, rng }: BlockProps) => {
  const journey = rng.pick(content.journeys);
  const steps: ShowcaseStep[] = journey.steps.map((step) => ({
    title: step.title,
    description: step.description,
    image: step.image ?? stepReport,
  }));

  return <StickyShowcase kicker={journey.kicker} heading={journey.heading} steps={steps} />;
};

export default JourneyBlock;
