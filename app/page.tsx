import DemoScanBar from "@/components/landing/DemoScanBar";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Pricing from "@/components/landing/Pricing";
import ReportPreview from "@/components/landing/ReportPreview";
import SecurityTicker from "@/components/landing/SecurityTicker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getDisplayName(email: string | null | undefined, metadata: Record<string, unknown>) {
  const displayNameCandidates = [
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    email?.split("@")[0],
  ];

  for (const candidate of displayNameCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "VibeScan User";
}

function getInitials(displayName: string) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "VS";
}

function getAvatarUrl(metadata: Record<string, unknown>) {
  const candidates = [metadata.avatar_url, metadata.picture];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const displayName = getDisplayName(user?.email, metadata);
  const isAuthenticated = Boolean(user);
  const viewer = user
    ? {
        avatarUrl: getAvatarUrl(metadata),
        displayEmail: user.email ?? displayName,
        displayName,
        initials: getInitials(displayName),
      }
    : null;

  return (
    <>
      <Navbar viewer={viewer} />
      <main className="overflow-x-hidden bg-[var(--bg)] text-[var(--white)]">
        <Hero isAuthenticated={isAuthenticated} />
        <SecurityTicker />
        <HowItWorks />
        <div className="h-px bg-[var(--border)]" />
        <FeaturesGrid />
        <div className="h-px bg-[var(--border)]" />
        <ReportPreview />
        <div className="h-px bg-[var(--border)]" />
        <DemoScanBar isAuthenticated={isAuthenticated} />
        <div className="h-px bg-[var(--border)]" />
        <Pricing isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </>
  );
}
