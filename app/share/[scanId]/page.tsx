import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ShareReportPreview } from "@/components/ShareReportPreview";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import { formatDateTime } from "@/lib/date";
import { getPublicShareReport } from "@/lib/scan-data";

export const dynamic = "force-dynamic";

type ShareReportPageProps = {
  params: Promise<{
    scanId: string;
  }>;
};

function statusMessage(status: string) {
  switch (status) {
    case "pending":
      return "This shared preview is live, but the scan is still queued.";
    case "running":
      return "This shared preview is live while the scan continues running.";
    case "failed":
      return "This shared preview is available, but the scan ended in a failed state.";
    default:
      return "This shared preview shows the public-facing findings summary.";
  }
}

export default async function ShareReportPage({ params }: ShareReportPageProps) {
  const { scanId } = await params;
  let report = null;
  let shareError: string | null = null;

  try {
    report = await getPublicShareReport(scanId);
  } catch (error) {
    shareError =
      error instanceof Error
        ? error.message
        : "Public share preview is temporarily unavailable.";
  }

  if (
    shareError?.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    shareError?.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_38%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-12 text-[var(--white)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <EmptyState
            eyebrow="Configuration Required"
            title="Public share preview is waiting for Supabase environment variables."
            description="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then apply the Phase 3 migration so the public share RPC can return real report data."
            actionHref="/auth"
            actionLabel="Sign In"
          />
        </div>
      </main>
    );
  }

  if (!report && shareError) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_38%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-12 text-[var(--white)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <EmptyState
            eyebrow="Preview Unavailable"
            title="This shared report could not be loaded."
            description={shareError}
            actionHref="/auth"
            actionLabel="Sign In"
          />
        </div>
      </main>
    );
  }

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_38%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-12 text-[var(--white)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--cyan)]">
                Shared Report
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Public preview for {report.scan.url}
              </h1>
              <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                {statusMessage(report.scan.status)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ScanStatusBadge status={report.scan.status} />
              <Link
                href="/auth"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Scanned URL
              </p>
              <p className="mt-3 break-all text-sm text-[var(--white)]">
                {report.scan.url}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Created
              </p>
              <p className="mt-3 text-sm text-[var(--white)]">
                {formatDateTime(report.scan.createdAt)}
              </p>
            </div>
          </div>
        </section>

        <ShareReportPreview
          counts={report.counts}
          findings={report.findings}
          passCount={report.scan.passCount}
          securityScore={report.scan.securityScore}
          status={report.scan.status}
          url={report.scan.url}
        />
      </div>
    </main>
  );
}
