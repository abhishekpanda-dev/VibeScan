"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  DatabaseZap,
  KeyRound,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReportListFilter, ReportPassItem } from "@/lib/reporting";
import { isFixGeneratedSeverity } from "@/lib/reporting";
import type { SecurityRiskLevel } from "@/lib/scanner/types";
import { createSeverityCounts, normalizeSeverityLevel } from "@/lib/scan-utils";
import type { ReportFinding, SeverityCounts } from "@/types/database";

type ReportWorkspaceProps = {
  report: {
    counts: SeverityCounts;
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
  };
};

type ReportListItem = ReportFinding | ReportPassItem;

type SeverityTone = {
  badge: string;
  card: string;
  featuredCard: string;
  icon: string;
  text: string;
};

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

const severityTones: Record<ReportListItem["severity"], SeverityTone> = {
  critical: {
    badge:
      "border-[rgba(255,82,82,0.36)] bg-[rgba(255,82,82,0.14)] text-[#FF9A9A]",
    card:
      "border-[rgba(255,82,82,0.28)] bg-[linear-gradient(180deg,rgba(255,82,82,0.12),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(255,59,59,0.12)]",
    featuredCard:
      "border-[rgba(255,82,82,0.28)] bg-[linear-gradient(180deg,rgba(255,82,82,0.24),rgba(255,82,82,0.08))] shadow-[0_24px_65px_rgba(255,59,59,0.16)]",
    icon: "border-[rgba(255,82,82,0.24)] bg-[rgba(255,82,82,0.12)] text-[#FF8E8E]",
    text: "text-[#FF8E8E]",
  },
  high: {
    badge:
      "border-[rgba(255,168,77,0.34)] bg-[rgba(255,168,77,0.14)] text-[#FFC57A]",
    card:
      "border-[rgba(255,168,77,0.24)] bg-[linear-gradient(180deg,rgba(255,168,77,0.1),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(255,168,77,0.1)]",
    featuredCard:
      "border-[rgba(255,168,77,0.24)] bg-[linear-gradient(180deg,rgba(255,168,77,0.2),rgba(255,168,77,0.06))] shadow-[0_22px_60px_rgba(255,168,77,0.12)]",
    icon: "border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]",
    text: "text-[#FFC57A]",
  },
  medium: {
    badge:
      "border-[rgba(245,213,101,0.34)] bg-[rgba(245,213,101,0.14)] text-[#F5D565]",
    card:
      "border-[rgba(245,213,101,0.22)] bg-[linear-gradient(180deg,rgba(245,213,101,0.09),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(245,213,101,0.08)]",
    featuredCard:
      "border-[rgba(245,213,101,0.22)] bg-[linear-gradient(180deg,rgba(245,213,101,0.18),rgba(245,213,101,0.05))] shadow-[0_22px_60px_rgba(245,213,101,0.1)]",
    icon: "border-[rgba(245,213,101,0.2)] bg-[rgba(245,213,101,0.1)] text-[#F5D565]",
    text: "text-[#F5D565]",
  },
  low: {
    badge:
      "border-[rgba(96,165,250,0.32)] bg-[rgba(96,165,250,0.14)] text-[#8FD0FF]",
    card:
      "border-[rgba(96,165,250,0.22)] bg-[linear-gradient(180deg,rgba(96,165,250,0.09),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(96,165,250,0.09)]",
    featuredCard:
      "border-[rgba(96,165,250,0.22)] bg-[linear-gradient(180deg,rgba(96,165,250,0.18),rgba(96,165,250,0.05))] shadow-[0_22px_60px_rgba(96,165,250,0.1)]",
    icon: "border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.1)] text-[#8FD0FF]",
    text: "text-[#8FD0FF]",
  },
  info: {
    badge:
      "border-[rgba(148,163,184,0.28)] bg-[rgba(148,163,184,0.12)] text-slate-200",
    card:
      "border-[rgba(148,163,184,0.18)] bg-[linear-gradient(180deg,rgba(148,163,184,0.08),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(148,163,184,0.07)]",
    featuredCard:
      "border-[rgba(148,163,184,0.18)] bg-[linear-gradient(180deg,rgba(148,163,184,0.16),rgba(148,163,184,0.04))] shadow-[0_22px_60px_rgba(148,163,184,0.08)]",
    icon: "border-[rgba(148,163,184,0.18)] bg-[rgba(148,163,184,0.1)] text-slate-200",
    text: "text-slate-200",
  },
  pass: {
    badge:
      "border-[rgba(125,240,160,0.32)] bg-[rgba(125,240,160,0.14)] text-[#7DF0A0]",
    card:
      "border-[rgba(125,240,160,0.22)] bg-[linear-gradient(180deg,rgba(125,240,160,0.09),rgba(15,24,37,0.96))] shadow-[0_20px_45px_rgba(125,240,160,0.08)]",
    featuredCard:
      "border-[rgba(125,240,160,0.22)] bg-[linear-gradient(180deg,rgba(125,240,160,0.18),rgba(125,240,160,0.05))] shadow-[0_22px_60px_rgba(125,240,160,0.1)]",
    icon: "border-[rgba(125,240,160,0.18)] bg-[rgba(125,240,160,0.1)] text-[#7DF0A0]",
    text: "text-[#7DF0A0]",
  },
};

function getRiskTone(riskLevel: SecurityRiskLevel) {
  switch (riskLevel) {
    case "Secure":
      return {
        badge:
          "border-[rgba(125,240,160,0.28)] bg-[rgba(125,240,160,0.12)] text-[#7DF0A0]",
        glow: "rgba(125,240,160,0.4)",
      };
    case "Needs Attention":
      return {
        badge:
          "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]",
        glow: "rgba(0,212,255,0.35)",
      };
    case "High Risk":
      return {
        badge:
          "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.12)] text-[#FFD166]",
        glow: "rgba(255,184,0,0.38)",
      };
    case "Critical Risk":
      return {
        badge:
          "border-[rgba(255,59,59,0.32)] bg-[rgba(255,59,59,0.12)] text-[#FF8E8E]",
        glow: "rgba(255,59,59,0.42)",
      };
  }
}

function getSeverityBadge(severity: ReportListItem["severity"]) {
  return severityTones[severity].badge;
}

function getSeverityTextTone(severity: ReportListItem["severity"]) {
  return severityTones[severity].text;
}

function getFilterChipTone(filter: ReportListFilter) {
  switch (filter) {
    case "all":
      return "border-[rgba(0,212,255,0.32)] bg-[rgba(0,212,255,0.14)] text-[var(--cyan)] shadow-[0_16px_40px_rgba(0,212,255,0.12)]";
    case "critical":
    case "high":
    case "medium":
    case "low":
    case "pass":
      return severityTones[filter].badge;
  }
}

function isPassItem(item: ReportListItem): item is ReportPassItem {
  return item.severity === "pass";
}

function itemMatchesSearch(
  item: Pick<ReportListItem, "title" | "category" | "description">,
  searchTerm: string,
) {
  return `${item.title} ${item.category} ${item.description}`
    .toLowerCase()
    .includes(searchTerm);
}

function getCategoryMeta(category: string): {
  icon: LucideIcon;
  iconTone: string;
} {
  switch (category) {
    case "Bundle Exposure":
      return {
        icon: KeyRound,
        iconTone: "border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]",
      };
    case "Security Headers":
      return {
        icon: ShieldCheck,
        iconTone: "border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.1)] text-[#8FD0FF]",
      };
    case "Environment Exposure":
      return {
        icon: ScanSearch,
        iconTone: "border-[rgba(245,213,101,0.2)] bg-[rgba(245,213,101,0.1)] text-[#F5D565]",
      };
    case "Supabase RLS":
      return {
        icon: DatabaseZap,
        iconTone: "border-[rgba(255,82,82,0.2)] bg-[rgba(255,82,82,0.1)] text-[#FF8E8E]",
      };
    case "API Route Exposure":
      return {
        icon: Sparkles,
        iconTone: "border-[rgba(255,168,77,0.2)] bg-[rgba(255,168,77,0.1)] text-[#FFC57A]",
      };
    case "Client-side Authorization":
      return {
        icon: ShieldAlert,
        iconTone: "border-[rgba(255,82,82,0.2)] bg-[rgba(255,82,82,0.1)] text-[#FF8E8E]",
      };
    case "CORS & Auth":
      return {
        icon: TriangleAlert,
        iconTone: "border-[rgba(245,213,101,0.2)] bg-[rgba(245,213,101,0.1)] text-[#F5D565]",
      };
    default:
      return {
        icon: ScanSearch,
        iconTone: "border-white/10 bg-white/5 text-slate-200",
      };
  }
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

function SummaryMetricCard({
  featured = false,
  icon: Icon,
  label,
  severity,
  value,
}: {
  featured?: boolean;
  icon: LucideIcon;
  label: string;
  severity: Exclude<ReportListItem["severity"], "info">;
  value: number;
}) {
  const tone = severityTones[severity];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.8rem] border p-5 transition duration-300 hover:-translate-y-0.5 ${
        featured ? `${tone.featuredCard} min-h-[168px]` : tone.card
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">
              {label}
            </p>
            {featured ? (
              <p className="mt-2 text-sm text-slate-300">
                Immediate attention recommended
              </p>
            ) : null}
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tone.icon}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className={`text-4xl font-semibold tracking-tight ${tone.text}`}>
            {value}
          </p>
          {!featured ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${tone.badge}`}
            >
              {severity}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReportWorkspace({ report }: ReportWorkspaceProps) {
  const [filter, setFilter] = useState<ReportListFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const shareHref = `/share/${report.scan.id}`;
  const markdownExportHref = `/api/reports/${report.scan.id}/export?format=markdown`;
  const pdfExportHref = `/api/reports/${report.scan.id}/export?format=pdf`;
  const riskTone = getRiskTone(report.riskLevel);
  const passChecksCount = report.passChecks.length;
  const totalItems = report.findings.length + passChecksCount;
  const activeSearchTerm = search.trim();
  const hasActiveSearch = activeSearchTerm.length > 0;
  const hasActiveRefinements = filter !== "all" || hasActiveSearch;
  const findingCounts = useMemo(
    () => createSeverityCounts(report.findings),
    [report.findings],
  );
  const filterCounts = useMemo(
    () => ({
      all: totalItems,
      critical: findingCounts.critical,
      high: findingCounts.high,
      medium: findingCounts.medium,
      low: findingCounts.low,
      pass: passChecksCount,
    }),
    [
      findingCounts.critical,
      findingCounts.high,
      findingCounts.low,
      findingCounts.medium,
      passChecksCount,
      totalItems,
    ],
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

      return itemMatchesSearch(finding, deferredSearch);
    });
  }, [deferredSearch, filter, report.findings]);

  const filteredPassChecks = useMemo(() => {
    if (filter !== "all" && filter !== "pass") {
      return [];
    }

    return report.passChecks.filter((item) => {
      if (!deferredSearch) {
        return true;
      }

      return itemMatchesSearch(item, deferredSearch);
    });
  }, [deferredSearch, filter, report.passChecks]);

  const visibleItems = useMemo<ReportListItem[]>(() => {
    if (filter === "pass") {
      return filteredPassChecks;
    }

    if (filter === "all") {
      return [...filteredFindings, ...filteredPassChecks];
    }

    return filteredFindings;
  }, [filter, filteredFindings, filteredPassChecks]);

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
  const selectedCategoryMeta = selectedItem
    ? getCategoryMeta(selectedItem.category)
    : null;
  const SelectedCategoryIcon = selectedCategoryMeta?.icon;
  const activeFilterLabel =
    reportFilters.find((filterOption) => filterOption.value === filter)?.label ??
    "All";
  const activeFilterCount = visibleItems.length;

  useEffect(() => {
    console.info("[report-filter] state", {
      filteredFindingsLength: filteredFindings.length,
      filteredPassChecksLength: filteredPassChecks.length,
      findingsLength: report.findings.length,
      findingSeverities: report.findings.map((finding) => finding.severity),
      selectedFilters: {
        search: activeSearchTerm || null,
        severity: filter,
      },
      severityCounts: {
        critical: findingCounts.critical,
        high: findingCounts.high,
        low: findingCounts.low,
        medium: findingCounts.medium,
        pass: passChecksCount,
      },
      uiSeverityFilters: reportFilters.map((filterOption) => filterOption.value),
      visibleItemsLength: visibleItems.length,
    });
  }, [
    activeSearchTerm,
    filter,
    filteredFindings.length,
    filteredPassChecks.length,
    findingCounts.critical,
    findingCounts.high,
    findingCounts.low,
    findingCounts.medium,
    passChecksCount,
    report.findings,
    visibleItems.length,
  ]);

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
      <section className="space-y-7">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                AI Remediation
              </p>
              <h2 className="text-2xl font-semibold text-[var(--white)]">
                Fix critical and high-risk issues with implementation-ready guidance
              </h2>
              <p className="max-w-2xl text-sm text-slate-400">
                Select a finding to load its AI-generated remediation, export this
                report, or share a public preview link.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `${window.location.origin}${shareHref}`,
                    "Share link copied",
                  )
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)]"
              >
                Generate Share Link
              </button>
              <a
                href={markdownExportHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)]"
              >
                Export as Markdown
              </a>
              <a
                href={pdfExportHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)]"
              >
                Export PDF
              </a>
              <Link
                href={shareHref}
                className="rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] shadow-[0_20px_50px_rgba(255,59,59,0.18)] hover:-translate-y-0.5 hover:brightness-110"
              >
                Public Share Preview
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div
                className="mx-auto flex h-40 w-40 items-center justify-center rounded-full"
                style={{
                  boxShadow: `0 0 0 10px rgba(255,255,255,0.04), 0 20px 60px ${riskTone.glow}`,
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                }}
              >
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    Score
                  </p>
                  <p className="mt-2 text-5xl font-semibold text-[var(--white)]">
                    {report.scan.securityScore}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    Security Score
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-[var(--white)]">
                    {report.riskLevel}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Findings are grouped by severity, with pass checks available in
                    the same report stream so you can quickly understand both risk
                    and coverage.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${riskTone.badge}`}
                  >
                    {report.riskLevel}
                  </span>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Findings: {report.findings.length}
                  </span>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Pass Checks: {passChecksCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SummaryMetricCard
              featured
              icon={ShieldAlert}
              label="Critical Findings"
              severity="critical"
              value={findingCounts.critical}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryMetricCard
                icon={TriangleAlert}
                label="High Findings"
                severity="high"
                value={findingCounts.high}
              />
              <SummaryMetricCard
                icon={Sparkles}
                label="Medium Findings"
                severity="medium"
                value={findingCounts.medium}
              />
              <SummaryMetricCard
                icon={ShieldCheck}
                label="Low Findings"
                severity="low"
                value={findingCounts.low}
              />
              <SummaryMetricCard
                icon={ShieldCheck}
                label="Pass Checks"
                severity="pass"
                value={passChecksCount}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    Findings
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--white)]">
                    Search and filter report items
                  </h3>
                </div>
                <div
                  aria-live="polite"
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
                >
                  Showing {visibleItems.length} of {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="group flex flex-1 items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus-within:border-[var(--cyan)] focus-within:bg-[rgba(255,255,255,0.08)]">
                    <ScanSearch className="h-4 w-4 text-slate-500 transition group-focus-within:text-[var(--cyan)]" />
                    <label htmlFor="report-search" className="sr-only">
                      Search findings
                    </label>
                    <input
                      id="report-search"
                      type="search"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setSelectedId(null);
                      }}
                      placeholder="Search findings by title, category, or description"
                      className="w-full bg-transparent text-sm text-[var(--white)] outline-none placeholder:text-slate-500"
                    />
                    {hasActiveSearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSelectedId(null);
                        }}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-white/20 hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--white)]"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!hasActiveRefinements}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-50"
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
                            ? getFilterChipTone(filterOption.value)
                            : "border-white/10 bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:text-[var(--white)]"
                        }`}
                      >
                        <span>{filterOption.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-[rgba(255,255,255,0.12)] text-current"
                              : "bg-[rgba(255,255,255,0.06)] text-slate-200"
                          }`}
                        >
                          {isActive
                            ? activeFilterCount
                            : filterCounts[filterOption.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Active view
                    </span>

                    {filter !== "all" ? (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getSeverityBadge(
                          filter,
                        )}`}
                      >
                        {activeFilterLabel} ({activeFilterCount})
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                        All findings ({activeFilterCount})
                      </span>
                    )}

                    {hasActiveSearch ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                        Search: &ldquo;{activeSearchTerm}&rdquo;
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        No search term applied.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {visibleItems.length === 0 ? (
              <section className="rounded-[2rem] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.08)] text-[var(--cyan)]">
                      <ScanSearch className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--white)]">
                        No findings match your current filters.
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                        Try clearing the active search or broadening the severity
                        filter to bring findings back into view.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                          Filter: {activeFilterLabel}
                        </span>
                        {hasActiveSearch ? (
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                            Search: &ldquo;{activeSearchTerm}&rdquo;
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)]"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] shadow-[0_18px_50px_rgba(255,59,59,0.18)] hover:-translate-y-0.5 hover:brightness-110"
                    >
                      Show All Findings
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div className="space-y-4">
                {visibleItems.map((item) => {
                  const isSelected = item.id === effectiveSelectedId;
                  const isFinding = !isPassItem(item);
                  const readinessLabel = isPassItem(item)
                    ? "Passed"
                    : item.fixMarkdown
                      ? "AI fix ready"
                      : isFixGeneratedSeverity(item.severity)
                        ? "Fix pending"
                        : "Summary only";
                  const categoryMeta = getCategoryMeta(item.category);
                  const CategoryIcon = categoryMeta.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setSelectedId(item.id);
                        });
                      }}
                      className={`group relative w-full overflow-hidden rounded-[1.8rem] border p-5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none ${
                        isSelected
                          ? severityTones[item.severity].card
                          : "border-white/10 bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(22,32,48,0.96),rgba(8,12,20,1))]"
                      }`}
                    >
                      {isSelected ? (
                        <div
                          className={`absolute inset-y-5 left-0 w-1 rounded-full ${getSeverityTextTone(
                            item.severity,
                          )} bg-current`}
                        />
                      ) : null}

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <span
                            className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${categoryMeta.iconTone}`}
                          >
                            <CategoryIcon className="h-5 w-5" />
                          </span>

                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                                {item.category}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getSeverityBadge(
                                  item.severity,
                                )}`}
                              >
                                {item.severity}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-xl font-semibold text-[var(--white)]">
                                {item.title}
                              </h3>
                              <p className="mt-2 text-sm leading-7 text-slate-400">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                            {readinessLabel}
                          </span>
                        </div>
                      </div>

                      {isFinding ? (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] p-4 transition group-hover:bg-[rgba(255,255,255,0.05)]">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Evidence
                            </p>
                            <p className="mt-2 break-words font-mono text-xs text-slate-300">
                              {item.evidence ?? "No evidence captured."}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] p-4 transition group-hover:bg-[rgba(255,255,255,0.05)]">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Location
                            </p>
                            <p className="mt-2 break-words font-mono text-xs text-slate-300">
                              {item.location ?? "No location captured."}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)] xl:sticky xl:top-6 xl:self-start">
            <div className="flex flex-col gap-4 border-b border-white/8 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    AI Fix Panel
                  </p>
                  <h3 className="text-2xl font-semibold text-[var(--white)]">
                    {selectedItem?.title ?? "Select a finding"}
                  </h3>

                  {selectedItem && SelectedCategoryIcon ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${selectedCategoryMeta?.iconTone}`}
                      >
                        <SelectedCategoryIcon className="h-3.5 w-3.5" />
                        {selectedItem.category}
                      </span>
                    </div>
                  ) : null}
                </div>

                {selectedItem ? (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${getSeverityBadge(
                      selectedItem.severity,
                    )}`}
                  >
                    {selectedItem.severity}
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-7 text-slate-400">
                {selectedItem
                  ? selectedItem.description
                  : "Select a finding from the left panel to view details and remediation guidance."}
              </p>

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
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Fix
                </button>
                <a
                  href={markdownExportHref}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--white)] hover:border-[var(--cyan)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--cyan)]"
                >
                  Download Report
                </a>
              </div>
            </div>

            {!selectedItem ? (
              <div className="mt-6 rounded-[1.8rem] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.08)] text-[var(--cyan)] shadow-[0_18px_50px_rgba(0,212,255,0.12)]">
                    <ScanSearch className="h-8 w-8" />
                  </div>
                  <h4 className="mt-5 text-xl font-semibold text-[var(--white)]">
                    Ready when you are
                  </h4>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
                    Select a finding from the left panel to view details and
                    remediation guidance.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {!isPassItem(selectedItem) ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Evidence
                      </p>
                      <p className="mt-3 break-words font-mono text-xs text-slate-300">
                        {selectedItem.evidence ?? "No evidence captured."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Location
                      </p>
                      <p className="mt-3 break-words font-mono text-xs text-slate-300">
                        {selectedItem.location ?? "No location captured."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5">
                  {isPassItem(selectedItem) ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-[#7DF0A0]">
                        No remediation needed
                      </p>
                      <p className="text-sm leading-7 text-slate-300">
                        This scan check passed, so there is no AI-generated fix for
                        this item.
                      </p>
                    </div>
                  ) : selectedFixMarkdown ? (
                    <MarkdownFixPreview content={selectedFixMarkdown} />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-200">
                        AI fix not generated for this severity
                      </p>
                      <p className="text-sm leading-7 text-slate-300">
                        AI remediation is currently stored for critical and high
                        findings. Medium and low findings still include evidence and
                        location context for manual follow-up.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </section>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-[rgba(0,212,255,0.3)] bg-[rgba(5,8,15,0.96)] px-4 py-3 text-sm font-semibold text-[var(--white)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}
