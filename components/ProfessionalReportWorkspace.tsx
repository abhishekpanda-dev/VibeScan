"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DatabaseZap,
  KeyRound,
  Radar,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  startTransition,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createFindingSearchText } from "@/lib/report-model";
import type { ReportListFilter, ReportPassItem } from "@/lib/reporting";
import { isFixGeneratedSeverity } from "@/lib/reporting";
import { normalizeSeverityLevel } from "@/lib/scan-utils";
import type { SecurityRiskLevel } from "@/lib/scanner/types";
import type {
  ReportDistributionItem,
  ReportExecutiveSummary,
  ReportFinding,
  ReportScoreBreakdown,
  SeverityCounts,
} from "@/types/database";

type ReportWorkspaceProps = {
  report: {
    categoryDistribution: ReportDistributionItem[];
    counts: SeverityCounts;
    executiveSummary: ReportExecutiveSummary;
    findings: ReportFinding[];
    findingsCount: number;
    passChecks: ReportPassItem[];
    passCount: number;
    riskLevel: SecurityRiskLevel;
    scan: {
      completedAt: string | null;
      createdAt: string;
      id: string;
      securityScore: number;
      status: string;
      url: string;
    };
    scoreBreakdown: ReportScoreBreakdown;
    severityDistribution: ReportDistributionItem[];
    topRisks: ReportFinding[];
  };
};

type ReportListItem = ReportFinding | ReportPassItem;

const reportFilters: Array<{
  label: string;
  value: ReportListFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
  { label: "Pass", value: "pass" },
];

const confidenceTone = {
  high: "border-[rgba(125,240,160,0.3)] bg-[rgba(125,240,160,0.12)] text-[#7DF0A0]",
  low: "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.12)] text-[#FFD166]",
  medium:
    "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]",
} as const;

const validationTone = {
  confirmed:
    "border-[rgba(125,240,160,0.3)] bg-[rgba(125,240,160,0.12)] text-[#7DF0A0]",
  likely:
    "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.12)] text-[#FFD166]",
  review:
    "border-[rgba(148,163,184,0.28)] bg-[rgba(148,163,184,0.12)] text-slate-200",
} as const;

const severityTone = {
  critical:
    "border-[rgba(255,82,82,0.36)] bg-[rgba(255,82,82,0.14)] text-[#FF9A9A]",
  high: "border-[rgba(255,168,77,0.34)] bg-[rgba(255,168,77,0.14)] text-[#FFC57A]",
  info: "border-[rgba(148,163,184,0.28)] bg-[rgba(148,163,184,0.12)] text-slate-200",
  low: "border-[rgba(96,165,250,0.32)] bg-[rgba(96,165,250,0.14)] text-[#8FD0FF]",
  medium:
    "border-[rgba(245,213,101,0.34)] bg-[rgba(245,213,101,0.14)] text-[#F5D565]",
  pass: "border-[rgba(125,240,160,0.32)] bg-[rgba(125,240,160,0.14)] text-[#7DF0A0]",
} as const;

function isPassItem(item: ReportListItem): item is ReportPassItem {
  return item.severity === "pass";
}

function getRiskTone(riskLevel: SecurityRiskLevel) {
  switch (riskLevel) {
    case "Secure":
      return severityTone.pass;
    case "Needs Attention":
      return "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]";
    case "High Risk":
      return "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.12)] text-[#FFD166]";
    case "Critical Risk":
      return "border-[rgba(255,59,59,0.32)] bg-[rgba(255,59,59,0.12)] text-[#FF8E8E]";
  }
}

function getCategoryMeta(category: string): {
  icon: LucideIcon;
  tone: string;
} {
  switch (category) {
    case "Bundle Exposure":
      return {
        icon: KeyRound,
        tone: "border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]",
      };
    case "Security Headers":
      return {
        icon: ShieldCheck,
        tone: "border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.1)] text-[#8FD0FF]",
      };
    case "Environment Exposure":
      return {
        icon: ScanSearch,
        tone: "border-[rgba(245,213,101,0.2)] bg-[rgba(245,213,101,0.1)] text-[#F5D565]",
      };
    case "Supabase RLS":
      return {
        icon: DatabaseZap,
        tone: "border-[rgba(255,82,82,0.2)] bg-[rgba(255,82,82,0.1)] text-[#FF8E8E]",
      };
    case "API Route Exposure":
      return {
        icon: Sparkles,
        tone: "border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]",
      };
    case "Client-side Authorization":
      return {
        icon: ShieldAlert,
        tone: "border-[rgba(148,163,184,0.18)] bg-[rgba(148,163,184,0.1)] text-slate-200",
      };
    case "CORS & Auth":
      return {
        icon: TriangleAlert,
        tone: "border-[rgba(245,213,101,0.2)] bg-[rgba(245,213,101,0.1)] text-[#F5D565]",
      };
    default:
      return {
        icon: AlertTriangle,
        tone: "border-white/10 bg-white/5 text-slate-200",
      };
  }
}

function formatLabel(value: string) {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ItemBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${className}`}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  title,
  description,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
        {title}
      </p>
      <p className="max-w-3xl text-sm leading-7 text-slate-400">{description}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--white)]">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function createChartBackground(items: ReportDistributionItem[]) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return "conic-gradient(rgba(148,163,184,0.24) 0deg 360deg)";
  }

  let currentPercent = 0;
  const stops = items.map((item) => {
    const start = currentPercent * 360;
    currentPercent += item.value / total;
    const end = currentPercent * 360;
    return `${item.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function DistributionChart({
  description,
  items,
  title,
}: {
  description: string;
  items: ReportDistributionItem[];
  title: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--white)]">{title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
        </div>
        <div
          className="relative h-24 w-24 shrink-0 rounded-full"
          style={{
            backgroundImage: createChartBackground(items),
          }}
        >
          <div className="absolute inset-[16px] flex items-center justify-center rounded-full bg-[#07101b] text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Total
              </p>
              <p className="text-lg font-semibold text-[var(--white)]">{total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No data available for this chart.</p>
        ) : (
          items.map((item) => {
            const percent = total === 0 ? 0 : Math.round((item.value / total) * 100);

            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-200">{item.label}</span>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <div>{item.value}</div>
                  <div>{percent}%</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StepList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5">
      <p className="text-sm font-semibold text-[var(--white)]">{title}</p>
      <ol className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-7 text-slate-300">
            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-200">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DetailCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5">
      <p className="text-sm font-semibold text-[var(--white)]">{title}</p>
      <div className="mt-3 text-sm leading-7 text-slate-300">{children}</div>
    </div>
  );
}

function parseMarkdownBlocks(content: string) {
  const blocks: Array<
    | { content: string; type: "code" }
    | { content: string; type: "heading" }
    | { content: string; type: "paragraph" }
  > = [];
  const lines = content.replace(/\r/g, "").split("\n");
  let inCodeBlock = false;
  let paragraphLines: string[] = [];
  let codeLines: string[] = [];

  const flushParagraph = () => {
    const paragraph = paragraphLines.join("\n").trim();

    if (paragraph) {
      blocks.push({
        content: paragraph,
        type: "paragraph",
      });
    }

    paragraphLines = [];
  };

  const flushCode = () => {
    if (codeLines.length > 0) {
      blocks.push({
        content: codeLines.join("\n"),
        type: "code",
      });
    }

    codeLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushParagraph();
      }

      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({
        content: line.slice(3).trim(),
        type: "heading",
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushCode();

  return blocks;
}

function MarkdownFixPreview({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`${block.type}-${index}`}
              className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--cyan)]"
            >
              {block.content}
            </h3>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 text-xs text-slate-200"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className="whitespace-pre-wrap text-sm leading-7 text-slate-200"
          >
            {block.content}
          </p>
        );
      })}
    </div>
  );
}

export function ProfessionalReportWorkspace({
  report,
}: ReportWorkspaceProps) {
  const [filter, setFilter] = useState<ReportListFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const shareHref = `/share/${report.scan.id}`;
  const markdownExportHref = `/api/reports/${report.scan.id}/export?format=markdown`;
  const pdfExportHref = `/api/reports/${report.scan.id}/export?format=pdf`;

  const filterCounts = useMemo(
    () => ({
      all: report.findings.length,
      critical: report.counts.critical,
      high: report.counts.high,
      low: report.counts.low,
      medium: report.counts.medium,
      pass: report.passChecks.length,
    }),
    [report.counts, report.findings.length, report.passChecks.length],
  );

  const filteredFindings = useMemo(() => {
    if (filter === "pass") {
      return [];
    }

    return report.findings.filter((finding) => {
      const normalizedSeverity = normalizeSeverityLevel(finding.severity);

      if (filter !== "all" && normalizedSeverity !== filter) {
        return false;
      }

      if (!deferredSearch) {
        return true;
      }

      return createFindingSearchText(finding).includes(deferredSearch);
    });
  }, [deferredSearch, filter, report.findings]);

  const filteredPassChecks = useMemo(() => {
    if (filter !== "pass") {
      return [];
    }

    return report.passChecks.filter((item) =>
      `${item.title} ${item.category} ${item.description}`
        .toLowerCase()
        .includes(deferredSearch),
    );
  }, [deferredSearch, filter, report.passChecks]);

  const visibleItems = filter === "pass" ? filteredPassChecks : filteredFindings;
  const activeFilterCount = visibleItems.length;

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const effectiveSelectedId =
    visibleItems.find((item) => item.id === selectedId)?.id ??
    visibleItems[0]?.id ??
    null;
  const selectedItem =
    visibleItems.find((item) => item.id === effectiveSelectedId) ?? null;
  const selectedFixMarkdown =
    !selectedItem || isPassItem(selectedItem)
      ? null
      : selectedItem.fixMarkdown ??
        (isFixGeneratedSeverity(selectedItem.severity)
          ? "Fix generation unavailable."
          : null);

  const copyText = async (value: string, successMessage: string) => {
    await navigator.clipboard.writeText(value);
    setToastMessage(successMessage);
  };

  const resetFilters = () => {
    startTransition(() => {
      setFilter("all");
      setSearch("");
      setSelectedId(null);
    });
  };

  return (
    <>
      <section className="space-y-8">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeading
              title="Executive Summary"
              description={report.executiveSummary.primaryMessage}
            />

            <div className="flex flex-wrap gap-3">
              <ItemBadge className={getRiskTone(report.riskLevel)}>
                {report.riskLevel}
              </ItemBadge>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `${window.location.origin}${shareHref}`,
                    "Share link copied",
                  )
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              >
                Copy Share Link
              </button>
              <a
                href={markdownExportHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              >
                Export Markdown
              </a>
              <a
                href={pdfExportHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              >
                Export PDF
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Radar}
              label="Security Score"
              tone={getRiskTone(report.riskLevel)}
              value={report.scan.securityScore}
            />
            <MetricCard
              icon={ShieldAlert}
              label="Total Findings"
              tone="border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]"
              value={report.findingsCount}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Critical + High"
              tone="border-[rgba(255,82,82,0.2)] bg-[rgba(255,82,82,0.1)] text-[#FF8E8E]"
              value={report.executiveSummary.criticalFindings + report.executiveSummary.highFindings}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Passed Checks"
              tone="border-[rgba(125,240,160,0.2)] bg-[rgba(125,240,160,0.1)] text-[#7DF0A0]"
              value={report.passCount}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={ShieldAlert}
              label="Critical"
              tone={severityTone.critical}
              value={report.executiveSummary.criticalFindings}
            />
            <MetricCard
              icon={TriangleAlert}
              label="High"
              tone={severityTone.high}
              value={report.executiveSummary.highFindings}
            />
            <MetricCard
              icon={BarChart3}
              label="Medium"
              tone={severityTone.medium}
              value={report.executiveSummary.mediumFindings}
            />
            <MetricCard
              icon={ShieldCheck}
              label="Low"
              tone={severityTone.low}
              value={report.executiveSummary.lowFindings}
            />
          </div>

          <div className="mt-6 rounded-[1.7rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5">
            <p className="text-sm font-semibold text-[var(--white)]">Top categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.executiveSummary.topCategories.length === 0 ? (
                <span className="text-sm text-slate-400">No finding categories recorded.</span>
              ) : (
                report.executiveSummary.topCategories.map((category) => (
                  <ItemBadge
                    key={category}
                    className="border-white/10 bg-white/5 text-slate-200"
                  >
                    {category}
                  </ItemBadge>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <DistributionChart
            title="Severity Distribution"
            description="This chart is driven directly from the report severity counts that back the tabs and executive summary."
            items={report.severityDistribution}
          />
          <DistributionChart
            title="Category Distribution"
            description="This chart groups findings by scanner category so developers can see which control families need the most work."
            items={report.categoryDistribution}
          />
          <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-semibold text-[var(--white)]">
              Security Score Breakdown
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              The score starts at 100 and is reduced by severity-weighted penalties.
            </p>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Base score</span>
                <span>{report.scoreBreakdown.baseScore}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[var(--white)]">
                <span>Final score</span>
                <span>{report.scoreBreakdown.finalScore}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {report.scoreBreakdown.penalties.map((penalty) => (
                <div
                  key={penalty.label}
                  className="rounded-2xl border border-white/8 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <ItemBadge className={severityTone[penalty.severity]}>
                      {penalty.severity}
                    </ItemBadge>
                    <span className="text-sm text-slate-400">
                      {penalty.count} x {penalty.penaltyPerItem}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                    <span>{penalty.label}</span>
                    <span>-{penalty.totalPenalty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <SectionHeading
            title="Top Risks"
            description="These are the most important issues first, ranked by severity and confidence so remediation can start with the highest-value work."
          />

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {report.topRisks.length === 0 ? (
              <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-5 text-sm text-slate-400">
                No top risks are available because this scan did not produce actionable findings.
              </div>
            ) : (
              report.topRisks.map((finding) => {
                const categoryMeta = getCategoryMeta(finding.category);
                const CategoryIcon = categoryMeta.icon;

                return (
                  <button
                    key={finding.id}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setFilter(
                          finding.severity === "critical" ||
                            finding.severity === "high" ||
                            finding.severity === "medium" ||
                            finding.severity === "low"
                            ? finding.severity
                            : "all",
                        );
                        setSelectedId(finding.id);
                      });
                    }}
                    className="rounded-[1.7rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${categoryMeta.tone}`}
                      >
                        <CategoryIcon className="h-5 w-5" />
                      </span>
                      <ItemBadge className={severityTone[finding.severity]}>
                        {finding.severity}
                      </ItemBadge>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-[var(--white)]">
                      {finding.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {finding.riskExplanation}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ItemBadge className={confidenceTone[finding.confidence.label]}>
                        {finding.confidence.label} confidence
                      </ItemBadge>
                      <ItemBadge className={validationTone[finding.validationState]}>
                        {formatLabel(finding.validationState)}
                      </ItemBadge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <SectionHeading
                title="Findings"
                description="Filter by severity, search across evidence and mappings, and open any item for technical details and remediation guidance."
              />

              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, evidence, impact, OWASP, CWE, or affected path"
                    className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--white)] outline-none placeholder:text-slate-500 focus:border-[var(--cyan)] lg:max-w-xl"
                  />

                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={filter === "all" && search.trim().length === 0}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {reportFilters.map((filterOption) => {
                    const isActive = filterOption.value === filter;

                    return (
                      <button
                        key={filterOption.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          startTransition(() => {
                            setFilter(filterOption.value);
                            setSelectedId(null);
                          });
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition duration-200 ${
                          isActive
                            ? filterOption.value === "all"
                              ? "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]"
                              : severityTone[filterOption.value]
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-[var(--white)]"
                        }`}
                      >
                        <span>{filterOption.label}</span>
                        <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[11px] text-current">
                          {filterCounts[filterOption.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
                  Active view:{" "}
                  <span className="font-semibold text-[var(--white)]">
                    {
                      reportFilters.find((filterOption) => filterOption.value === filter)
                        ?.label
                    }
                  </span>{" "}
                  ({activeFilterCount})
                  {search.trim() ? (
                    <span className="ml-2 text-slate-400">
                      Search: &ldquo;{search.trim()}&rdquo;
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {visibleItems.length === 0 ? (
                  <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-6 text-sm leading-7 text-slate-300">
                    No items match the current severity filter or search term.
                  </div>
                ) : (
                  visibleItems.map((item) => {
                    const isSelected = item.id === effectiveSelectedId;
                    const categoryMeta = getCategoryMeta(item.category);
                    const CategoryIcon = categoryMeta.icon;

                    if (isPassItem(item)) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            startTransition(() => {
                              setSelectedId(item.id);
                            });
                          }}
                          className={`w-full rounded-[1.7rem] border p-5 text-left transition ${
                            isSelected
                              ? "border-[rgba(125,240,160,0.28)] bg-[rgba(125,240,160,0.08)]"
                              : "border-white/10 bg-[rgba(255,255,255,0.03)] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                              <span
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${categoryMeta.tone}`}
                              >
                                <CategoryIcon className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-[var(--white)]">
                                  {item.title}
                                </p>
                                <p className="mt-2 text-sm leading-7 text-slate-400">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <ItemBadge className={severityTone.pass}>pass</ItemBadge>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedId(item.id);
                          });
                        }}
                        className={`w-full rounded-[1.7rem] border p-5 text-left transition ${
                          isSelected
                            ? "border-[var(--cyan)] bg-[rgba(0,212,255,0.08)]"
                            : "border-white/10 bg-[rgba(255,255,255,0.03)] hover:border-white/20"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex gap-4">
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${categoryMeta.tone}`}
                            >
                              <CategoryIcon className="h-5 w-5" />
                            </span>
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <ItemBadge className={severityTone[item.severity]}>
                                  {item.severity}
                                </ItemBadge>
                                <ItemBadge className={confidenceTone[item.confidence.label]}>
                                  {item.confidence.label} confidence
                                </ItemBadge>
                                <ItemBadge className={validationTone[item.validationState]}>
                                  {formatLabel(item.validationState)}
                                </ItemBadge>
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-[var(--white)]">
                                  {item.title}
                                </p>
                                <p className="mt-2 text-sm leading-7 text-slate-400">
                                  {item.riskExplanation}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                            <span>{item.checkLabel}</span>
                            <span>-</span>
                            <span>{item.affectedPath ?? item.affectedTarget}</span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Impact
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-300">
                              {item.impact}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Technical Evidence
                            </p>
                            <p className="mt-2 break-words font-mono text-xs text-slate-300">
                              {item.technicalEvidence}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {filter !== "pass" ? (
              <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                <SectionHeading
                  title="Passed Checks"
                  description="These controls did not generate findings for the current scan. They are listed separately so passes never replace real issues."
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {report.passChecks.length === 0 ? (
                    <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-5 text-sm text-slate-400">
                      No pass checks were recorded for this scan.
                    </div>
                  ) : (
                    report.passChecks.map((passCheck) => (
                      <div
                        key={passCheck.id}
                        className="rounded-[1.7rem] border border-[rgba(125,240,160,0.2)] bg-[rgba(125,240,160,0.06)] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--white)]">
                              {passCheck.title}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-300">
                              {passCheck.description}
                            </p>
                          </div>
                          <ItemBadge className={severityTone.pass}>pass</ItemBadge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)] xl:sticky xl:top-6 xl:self-start">
            {!selectedItem ? (
              <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.08)] text-[var(--cyan)]">
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <p className="mt-4 text-lg font-semibold text-[var(--white)]">
                  Select an item
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Choose a finding or pass check to inspect technical details,
                  reproduction guidance, and remediation steps.
                </p>
              </div>
            ) : isPassItem(selectedItem) ? (
              <div className="space-y-5">
                <ItemBadge className={severityTone.pass}>pass</ItemBadge>
                <p className="text-2xl font-semibold text-[var(--white)]">
                  {selectedItem.title}
                </p>
                <p className="text-sm leading-7 text-slate-300">
                  {selectedItem.description}
                </p>
                <DetailCard title="Assessment">
                  This check completed without generating a finding, which means the
                  current scanner logic did not observe evidence strong enough to
                  raise a report item for this control family.
                </DetailCard>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ItemBadge className={severityTone[selectedItem.severity]}>
                    {selectedItem.severity}
                  </ItemBadge>
                  <ItemBadge className={confidenceTone[selectedItem.confidence.label]}>
                    {selectedItem.confidence.label} confidence
                  </ItemBadge>
                  <ItemBadge className={validationTone[selectedItem.validationState]}>
                    {formatLabel(selectedItem.validationState)}
                  </ItemBadge>
                </div>

                <div>
                  <p className="text-2xl font-semibold text-[var(--white)]">
                    {selectedItem.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <DetailCard title="Source Check">
                    <div className="flex items-center justify-between gap-3">
                      <span>{selectedItem.checkLabel}</span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </DetailCard>
                  <DetailCard title="Affected Target">
                    <div className="break-all font-mono text-xs text-slate-300">
                      {selectedItem.affectedTarget}
                    </div>
                  </DetailCard>
                </div>

                <DetailCard title="Risk Explanation">
                  {selectedItem.riskExplanation}
                </DetailCard>
                <DetailCard title="Impact">{selectedItem.impact}</DetailCard>
                <DetailCard title="Why This Finding Was Created">
                  {selectedItem.whyItWasCreated}
                </DetailCard>
                <DetailCard title="Technical Evidence">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
                    {selectedItem.technicalEvidence}
                  </pre>
                </DetailCard>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <StepList
                    title="Reproduction Steps"
                    items={selectedItem.reproductionSteps}
                  />
                  <StepList
                    title="Baseline Remediation Steps"
                    items={selectedItem.remediationSteps}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <DetailCard title="OWASP Mapping">
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.owasp.map((value) => (
                        <ItemBadge
                          key={value}
                          className="border-white/10 bg-white/5 text-slate-200"
                        >
                          {value}
                        </ItemBadge>
                      ))}
                    </div>
                  </DetailCard>
                  <DetailCard title="CWE Mapping">
                    {selectedItem.cwe.length === 0 ? (
                      "No CWE mapping recorded."
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.cwe.map((value) => (
                          <ItemBadge
                            key={value}
                            className="border-white/10 bg-white/5 text-slate-200"
                          >
                            {value}
                          </ItemBadge>
                        ))}
                      </div>
                    )}
                  </DetailCard>
                </div>

                <DetailCard title="Confidence Assessment">
                  <p>
                    {formatLabel(selectedItem.validationState)} issue with{" "}
                    {selectedItem.confidence.score}/100 confidence.
                  </p>
                  <p className="mt-2 text-slate-400">
                    {selectedItem.confidence.rationale}
                  </p>
                </DetailCard>

                <DetailCard title="Remediation Guidance">
                  <p className="text-slate-300">{selectedItem.remediationSummary}</p>

                  {selectedFixMarkdown ? (
                    <div className="mt-4">
                      <p className="mb-3 text-sm font-semibold text-[var(--white)]">
                        AI remediation
                      </p>
                      <MarkdownFixPreview content={selectedFixMarkdown} />
                    </div>
                  ) : (
                    <p className="mt-3 text-slate-400">
                      AI remediation is currently generated for critical and high
                      findings. The baseline remediation steps above remain available
                      for every finding.
                    </p>
                  )}
                </DetailCard>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedFixMarkdown) {
                        return;
                      }

                      copyText(selectedFixMarkdown, "Fix copied");
                    }}
                    disabled={!selectedFixMarkdown}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy AI Fix
                  </button>
                  <Link
                    href="/scan"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                  >
                    New Scan
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </section>
      </section>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-[rgba(0,212,255,0.3)] bg-[rgba(5,8,15,0.96)] px-4 py-3 text-sm font-semibold text-[var(--white)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}
