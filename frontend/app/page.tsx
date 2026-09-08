import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { ProblemSilos } from "@/components/landing/ProblemSilos";
import { EntryModes } from "@/components/landing/EntryModes";
import { Pipeline } from "@/components/landing/Pipeline";
import { Features } from "@/components/landing/Features";
import { Comparison } from "@/components/landing/Comparison";
import { Ecosystem, TrustStrip } from "@/components/landing/EcosystemAndTrust";
import { CTASection, Footer } from "@/components/landing/CTAFooter";

export default function Home() {
  return (
    <div>
      <Nav />
      <Hero />
      <ProblemSilos />
      <EntryModes />
      <Pipeline />
      <Features />
      <Comparison />
      <Ecosystem />
      <TrustStrip />
      <CTASection />
      <Footer />
    </div>
  );
}