import { redirect } from "next/navigation";
import { UrlScanForm } from "@/components/UrlScanForm";
import { getAuthenticatedAppContext } from "@/lib/scan-data";
import { getScanEligibility } from "@/lib/scan-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function ScanPage() {
  const context = await getAuthenticatedAppContext();

  if (!context) {
    redirect("/auth");
  }

  const eligibility = getScanEligibility(context.profile);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,59,59,0.12),_transparent_35%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-12 text-[var(--white)]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full max-w-2xl rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--cyan)]">
              New Scan
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Start a new VibeScan report
            </h1>
            <p className="mx-auto max-w-xl text-sm text-slate-400 sm:text-base">
              Submit a public HTTPS URL and we will create the scan record, reserve
              credits if needed, and send you straight to the report shell.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Tier
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--white)]">
                {context.profile.subscription_tier}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Credits
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--white)]">
                {context.profile.scan_credits}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Eligibility
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--white)]">
                {eligibility.allowed ? "Ready to scan" : "Upgrade required"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <UrlScanForm
              canStartScan={eligibility.allowed}
              creditsRemaining={context.profile.scan_credits}
              subscriptionStatus={context.profile.subscription_status}
              subscriptionTier={context.profile.subscription_tier}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
