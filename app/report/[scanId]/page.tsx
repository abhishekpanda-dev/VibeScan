import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ProfessionalReportWorkspace } from "@/components/ProfessionalReportWorkspace";
import { ReportLayout } from "@/components/ReportLayout";
import { TerminalLoader } from "@/components/TerminalLoader";
import { getAuthenticatedAppContext, getOwnedScanReport } from "@/lib/scan-data";

export const dynamic = "force-dynamic";

type ReportPageProps = {
  params: Promise<{
    scanId: string;
  }>;
};

function reportDescription(status: string) {
  switch (status) {
    case "pending":
      return "The scan has been queued on the server. Refresh shortly to see when execution begins.";
    case "running":
      return "The scanner is running bundle, header, API, CORS, and Supabase exposure checks. Refresh shortly to load stored findings.";
    case "complete":
      return "These findings come from the advanced scanner backend and are ranked with a security score.";
    case "failed":
      return "The scanner could not finish this target. The scan record was preserved and marked failed.";
    default:
      return "Scan report";
  }
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { scanId } = await params;
  const context = await getAuthenticatedAppContext();

  if (!context) {
    redirect("/auth");
  }

  const report = await getOwnedScanReport(context.supabase, scanId, {
    userId: context.user.id,
  });

  if (!report) {
    notFound();
  }

  console.info("[report] ReportPage render", {
    completedAt: report.scan.completedAt,
    findingsCount: report.findings.length,
    renderedStatus: report.scan.status,
    scanId,
  });

  return (
    <ReportLayout
      status={report.scan.status}
      url={report.scan.url}
      createdAt={report.scan.createdAt}
      title="Scan report"
      description={reportDescription(report.scan.status)}
      actions={
        <>
          <Link
            href={`/share/${report.scan.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
          >
            Public Share Preview
          </Link>
          <Link
            href="/scan"
            className="rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
          >
            New Scan
          </Link>
        </>
      }
    >
      {report.scan.status === "pending" || report.scan.status === "running" ? (
        <section className="space-y-4">
          <TerminalLoader status={report.scan.status} url={report.scan.url} />
          <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">
            This report stays fully server-rendered. Refresh in a few seconds to
            load the latest scan status and any stored findings.
          </div>
        </section>
      ) : null}

      {report.scan.status === "complete" ? (
        report.findings.length === 0 && report.passChecks.length === 0 ? (
          <EmptyState
            eyebrow="Complete"
            title="No findings were detected by the advanced scanner."
            description={`This scan completed successfully with a security score of ${report.scan.securityScore}.`}
            actionHref="/scan"
            actionLabel="Start Another Scan"
          />
        ) : (
          <ProfessionalReportWorkspace report={report} />
        )
      ) : null}

      {report.scan.status === "failed" ? (
        <section className="rounded-[2rem] border border-[rgba(255,59,59,0.3)] bg-[rgba(255,59,59,0.08)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[#FF8E8E]">
            Scan Failed
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--white)]">
            This scan could not complete its checks.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-rose-100/80 sm:text-base">
            Common causes include an invalid URL, DNS failure, blocked requests,
            or a target that did not respond before timeout. Start a fresh scan to
            try again.
          </p>
          <div className="mt-6">
            <Link
              href="/scan"
              className="inline-flex rounded-2xl bg-[var(--red)] px-5 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
            >
              Start Another Scan
            </Link>
          </div>
        </section>
      ) : null}
    </ReportLayout>
  );
}
