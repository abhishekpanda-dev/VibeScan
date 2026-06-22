import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import type { ScanSummary } from "@/types/database";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";

type ScanHistoryTableProps = {
  scans: ScanSummary[];
};

export function ScanHistoryTable({ scans }: ScanHistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/8">
          <thead>
            <tr className="text-left">
              {[
                "URL",
                "Date",
                "Status",
                "Security Score",
                "Findings Count",
                "View Report",
                "Export Report",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {scans.map((scan) => (
              <tr key={scan.id} className="align-top">
                <td className="px-6 py-5">
                  <div className="max-w-[280px]">
                    <p className="break-all text-sm font-medium text-[var(--white)]">
                      {scan.url}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  {formatDateTime(scan.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <ScanStatusBadge status={scan.status} />
                </td>
                <td className="px-6 py-5 text-sm text-[var(--white)]">
                  {scan.securityScore}
                </td>
                <td className="px-6 py-5 text-sm text-[var(--white)]">
                  {scan.findingsCount}
                </td>
                <td className="px-6 py-5">
                  <Link
                    href={`/report/${scan.id}`}
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                  >
                    View Report
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/reports/${scan.id}/export?format=markdown`}
                      className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                    >
                      Markdown
                    </a>
                    <a
                      href={`/api/reports/${scan.id}/export?format=pdf`}
                      className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                    >
                      PDF
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
