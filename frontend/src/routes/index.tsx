import { createFileRoute } from '@tanstack/react-router'
import LandingHeader from '../components/landing/LandingHeader'
import HeroSection from '../components/landing/HeroSection'
import StatsStrip from '../components/landing/StatsStrip'
import HowItWorks from '../components/landing/HowItWorks'
import FeaturesCarousel from '../components/landing/FeaturesCarousel'
import UseCases from '../components/landing/UseCases'
import AISpotlight from '../components/landing/AISpotlight'
import TestimonialSection from '../components/landing/TestimonialSection'
import PricingSection from '../components/landing/PricingSection'
import FAQSection from '../components/landing/FAQSection'
import ClosingCTA from '../components/landing/ClosingCTA'
import LandingFooter from '../components/landing/LandingFooter'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsStrip />
        <HowItWorks />
        <FeaturesCarousel />
        <UseCases />
        <AISpotlight />
        <TestimonialSection />
        <PricingSection />
        <FAQSection />
        <ClosingCTA />
      </main>
      <LandingFooter />
    </>
  )
}
