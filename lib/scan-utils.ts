import { buildReportFinding } from "@/lib/report-model";
import type {
  Finding,
  Profile,
  ReportFinding,
  Scan,
  ScanStatus,
  ScanSummary,
  SeverityCounts,
  SeverityLevel,
} from "@/types/database";

const severityLevels: SeverityLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const blockedHostnames = new Set(["0.0.0.0", "127.0.0.1", "::1", "localhost"]);
const blockedHostSuffixes = [
  ".internal",
  ".local",
  ".localhost",
  ".supabase.co",
  ".supabase.in",
  ".vercel-internal.com",
];

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map((segment) => Number.parseInt(segment, 10));

  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function createEmptySeverityCounts(): SeverityCounts {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

export function normalizeSeverityLevel(
  severity: string | null | undefined,
): SeverityLevel {
  const normalized = severity?.toLowerCase().trim();

  if (normalized && severityLevels.includes(normalized as SeverityLevel)) {
    return normalized as SeverityLevel;
  }

  return "info";
}

export function getSeverityRank(severity: SeverityLevel) {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    case "info":
      return 4;
  }
}

export function createSeverityCounts(
  findings: Array<Pick<Finding, "severity"> | Pick<ReportFinding, "severity">>,
): SeverityCounts {
  return findings.reduce((counts, finding) => {
    const severity = normalizeSeverityLevel(finding.severity);
    counts[severity] += 1;
    return counts;
  }, createEmptySeverityCounts());
}

export function normalizeScanStatus(
  status: string | null | undefined,
): ScanStatus {
  const normalized = status?.toLowerCase().trim();

  if (
    normalized === "pending" ||
    normalized === "running" ||
    normalized === "complete" ||
    normalized === "failed"
  ) {
    return normalized;
  }

  return "pending";
}

export function validateScanUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "Enter a URL to scan.";
  }

  if (!trimmedUrl.startsWith("https://")) {
    return "URL must start with https://";
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (parsedUrl.protocol !== "https:") {
      return "URL must start with https://";
    }

    if (blockedHostnames.has(hostname)) {
      return "Localhost targets are not allowed.";
    }

    if (
      blockedHostSuffixes.some(
        (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
      )
    ) {
      return "Internal infrastructure targets are not allowed.";
    }

    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
      return "Private network targets are not allowed.";
    }
  } catch {
    return "Enter a valid HTTPS URL.";
  }

  return null;
}

export function getScanEligibility(profile: Pick<Profile, "subscription_tier" | "scan_credits">) {
  if (profile.subscription_tier === "pro") {
    return {
      allowed: true,
      usesCredit: false,
    };
  }

  if (profile.scan_credits > 0) {
    return {
      allowed: true,
      usesCredit: true,
    };
  }

  return {
    allowed: false,
    usesCredit: false,
  };
}

export function getScanStatusLabel(status: ScanStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
  }
}

export function toReportFinding(
  finding: Finding,
  targetUrl: string,
): ReportFinding {
  return buildReportFinding(finding, targetUrl);
}

export function toScanSummary(
  scan: Scan,
  severityCounts: SeverityCounts,
  securityScore: number,
): ScanSummary {
  return {
    id: scan.id,
    url: scan.url,
    status: normalizeScanStatus(scan.status),
    createdAt: scan.created_at,
    criticalFindings: severityCounts.critical,
    findingsCount:
      severityCounts.critical +
      severityCounts.high +
      severityCounts.medium +
      severityCounts.low +
      severityCounts.info,
    highFindings: severityCounts.high,
    mediumFindings: severityCounts.medium,
    securityScore,
  };
}
