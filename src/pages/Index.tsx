import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import HighlightsSection from "@/components/HighlightsSection";
import ComparisonSection from "@/components/ComparisonSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FaqSection from "@/components/FaqSection";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <HighlightsSection />
        <ComparisonSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FaqSection />
        <SocialSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
