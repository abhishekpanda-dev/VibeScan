import DemoScanBar from "@/components/landing/DemoScanBar";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Pricing from "@/components/landing/Pricing";
import ReportPreview from "@/components/landing/ReportPreview";
import SecurityTicker from "@/components/landing/SecurityTicker";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden bg-[var(--bg)] text-[var(--white)]">
        <Hero />
        <SecurityTicker />
        <HowItWorks />
        <div className="h-px bg-[var(--border)]" />
        <FeaturesGrid />
        <div className="h-px bg-[var(--border)]" />
        <ReportPreview />
        <div className="h-px bg-[var(--border)]" />
        <DemoScanBar />
        <div className="h-px bg-[var(--border)]" />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
