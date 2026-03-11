import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TrustBar from "../components/TrustBar";
import Problem from "../components/Problem";
import FeatureCards from "../components/FeatureCards";
import HowItWorks from "../components/HowItWorks";
import FeaturesDeep from "../components/FeaturesDeep";
import Pricing from "../components/Pricing";
import FAQ from "../components/FAQ";
import FinalCTA from "../components/FinalCTA";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Problem />
        <FeatureCards />
        <HowItWorks />
        <FeaturesDeep />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
