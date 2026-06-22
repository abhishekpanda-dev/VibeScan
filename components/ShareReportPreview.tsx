import Link from "next/link";
import type { ReportFinding, ScanStatus, SeverityCounts } from "@/types/database";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { createFindingsTotal, derivePassChecks } from "@/lib/reporting";

type ShareReportPreviewProps = {
  counts: SeverityCounts;
  findings: ReportFinding[];
  passCount: number;
  securityScore: number;
  status: ScanStatus;
  url: string;
};

function renderCount(label: string, value: number) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[var(--white)]">{value}</p>
    </div>
  );
}

function renderSeverityBadge(severity: ReportFinding["severity"]) {
  const badgeClasses =
    severity === "critical"
      ? "border-[rgba(255,59,59,0.35)] bg-[rgba(255,59,59,0.12)] text-[#FF8E8E]"
      : severity === "high"
        ? "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.1)] text-[#FFD166]"
        : severity === "medium"
          ? "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.1)] text-[var(--cyan)]"
          : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${badgeClasses}`}
    >
      {severity}
    </span>
  );
}

export function ShareReportPreview({
  counts,
  findings,
  passCount,
  securityScore,
  status,
  url,
}: ShareReportPreviewProps) {
  const passChecks = derivePassChecks(findings, {
    expectedFindingsCount: createFindingsTotal(counts),
  });

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Public Share Preview
            </p>
            <h2 className="text-2xl font-semibold text-[var(--white)]">
              Findings summary for {url}
            </h2>
          </div>
          <ScanStatusBadge status={status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {renderCount("Security Score", securityScore)}
          {renderCount("Critical", counts.critical)}
          {renderCount("High", counts.high)}
          {renderCount("Medium", counts.medium)}
          {renderCount("Low", counts.low)}
          {renderCount("Pass", passCount)}
        </div>
      </div>

      <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Finding Summary
            </p>
            <h2 className="text-2xl font-semibold text-[var(--white)]">
              Public findings overview
            </h2>
            <p className="max-w-2xl text-sm text-slate-400">
              This public share page shows the report score, issue details, and a
              locked preview of AI-generated fixes.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Pass checks detected: {passCount}
          </div>
        </div>

        {passChecks.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {passChecks.map((passCheck) => (
              <div
                key={passCheck.id}
                className="rounded-2xl border border-[rgba(125,240,160,0.18)] bg-[rgba(125,240,160,0.06)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[#7DF0A0]">
                  Pass Check
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--white)]">
                  {passCheck.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300">{passCheck.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {findings.length === 0 ? (
        <EmptyState
          eyebrow="No Findings Yet"
          title="This shared report does not have findings to preview yet."
          description="When the scan finishes and findings are stored, severity counts and finding cards will appear here automatically."
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Finding Details
            </p>
            <h2 className="text-2xl font-semibold text-[var(--white)]">
              Public finding cards
            </h2>
          </div>

          {findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--cyan)]">
                    {finding.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--white)]">
                    {finding.title}
                  </h3>
                </div>
                {renderSeverityBadge(finding.severity)}
              </div>

              <p className="mt-4 text-sm text-slate-300">{finding.description}</p>

              {finding.location ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Location: {finding.location}
                </p>
              ) : null}

              <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/8 bg-white/5 p-5">
                <div className="select-none blur-md">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">
{`## Problem
${finding.title}

## Why It Matters
This finding needs a targeted remediation path with framework-aware security guidance.

## Fix
Upgrade to unlock the AI-generated step-by-step patch plan for this issue.

## Files To Update
Likely project files are included in the locked Pro report.`}
                  </pre>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,rgba(5,8,15,0.12),rgba(5,8,15,0.82))] p-6 text-center">
                  <p className="text-sm font-semibold text-[var(--white)]">
                    Unlock AI-ready fixes with VibeScan Pro
                  </p>
                  <Link
                    href="/#pricing"
                    className="inline-flex rounded-2xl bg-[var(--red)] px-5 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-[2rem] border border-[rgba(0,212,255,0.24)] bg-[rgba(0,212,255,0.08)] p-6 text-center">
        <p className="text-sm font-medium text-cyan-100">
          Unlock AI-ready fixes with Pro
        </p>
        <p className="mt-2 text-sm text-cyan-50/80">
          Export remediation markdown for Claude or your preferred coding agent.
        </p>
        <Link
          href="/#pricing"
          className="mt-5 inline-flex rounded-2xl bg-[var(--red)] px-5 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
        >
          Upgrade to Pro
        </Link>
      </div>
    </section>
  );
}
