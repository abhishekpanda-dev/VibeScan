import Link from "next/link";
import SectionHeading from "@/components/landing/SectionHeading";

type DemoScanBarProps = {
  isAuthenticated: boolean;
};

const launchHighlights = [
  "Professional report delivery",
  "AI remediation suggestions",
  "PDF export when included in your plan",
] as const;

export default function DemoScanBar({ isAuthenticated }: DemoScanBarProps) {
  const primaryHref = isAuthenticated ? "/scan" : "/auth?next=/scan";

  return (
    <section
      id="demo"
      className="scroll-mt-28 border-y border-[var(--border)] bg-[var(--bg2)] px-6 py-20 md:px-12 md:py-[100px]"
    >
      <div className="mx-auto max-w-[1100px] rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(255,59,59,0.08),rgba(10,15,26,0.96)_42%,rgba(15,24,37,0.92))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-12">
        <SectionHeading
          tag="Launch a Scan"
          title="Ready to review your app the premium way?"
          description="Choose a one-time scan or Pro, sign in securely, and run a full scan from your protected workspace."
          centered
        />

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center rounded-[14px] bg-[var(--red)] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_18px_38px_rgba(255,59,59,0.3)] transition-all duration-200 hover:-translate-y-px hover:brightness-110"
          >
            Get Started
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.14)] bg-white/6 px-6 py-4 text-[15px] font-semibold text-[var(--white)] transition-all duration-200 hover:border-[rgba(255,255,255,0.24)] hover:bg-white/10"
          >
            Compare Plans
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {launchHighlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-white/5 px-5 py-4 text-center text-[14px] text-[#D6DEEF]"
            >
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
