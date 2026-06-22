import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfileRecord } from "@/lib/profiles";
import {
  createFindingsTotal,
  derivePassChecks,
  type ReportPassItem,
} from "@/lib/reporting";
import {
  buildReportFinding,
  createCategoryDistribution,
  createExecutiveSummary,
  createSecurityScoreBreakdown,
  createSeverityDistribution,
  createTopRisks,
} from "@/lib/report-model";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  logAuthDebug,
  summarizeSession,
  summarizeUser,
} from "@/lib/supabase/debug";
import {
  calculateSecurityScore,
  getSecurityRiskLevel,
} from "@/lib/scanner/securityScore";
import {
  createEmptySeverityCounts,
  createSeverityCounts,
  getSeverityRank,
  normalizeScanStatus,
  toScanSummary,
} from "@/lib/scan-utils";
import type {
  Database,
  Finding,
  Json,
  PublicShareReport,
  ReportDistributionItem,
  ReportExecutiveSummary,
  ReportFinding,
  ReportScoreBreakdown,
} from "@/types/database";

function isRecord(value: Json | null): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

function toNullableStringValue(value: Json | undefined) {
  return typeof value === "string" || value === null ? value : null;
}

function toJsonValue(value: Json | undefined) {
  return value ?? null;
}

function toNumberValue(value: Json | undefined) {
  return typeof value === "number" ? value : 0;
}

function parsePublicShareReport(data: Json | null): PublicShareReport | null {
  if (!isRecord(data)) {
    return null;
  }

  const scanValue = data.scan;
  const countsValue = data.counts;
  const findingsValue = data.findings;

  if (!isRecord(scanValue) || !isRecord(countsValue) || !Array.isArray(findingsValue)) {
    return null;
  }

  const reportFindings = findingsValue
    .map<ReportFinding | null>((finding) => {
      if (!isRecord(finding)) {
        return null;
      }

      const id = toStringValue(finding.id);
      const scanId = toStringValue(finding.scan_id);
      const category = toStringValue(finding.category);
      const severity = toStringValue(finding.severity);
      const title = toStringValue(finding.title);
      const description = toStringValue(finding.description);

      if (!id || !scanId || !category || !severity || !title || !description) {
        return null;
      }

      const scanUrl = toStringValue(scanValue.url);

      if (!scanUrl) {
        return null;
      }

      return buildReportFinding(
        {
          category,
          description,
          evidence: toJsonValue(finding.evidence),
          fix_markdown: null,
          id,
          location: toNullableStringValue(finding.location),
          scan_id: scanId,
          severity,
          title,
        },
        scanUrl,
      );
    })
    .filter((finding): finding is ReportFinding => finding !== null);

  const scanId = toStringValue(scanValue.id);
  const url = toStringValue(scanValue.url);
  const status = toStringValue(scanValue.status);
  const createdAt = toStringValue(scanValue.created_at);

  if (!scanId || !url || !status || !createdAt) {
    return null;
  }

  return {
    scan: {
      id: scanId,
      url,
      status: normalizeScanStatus(status),
      createdAt,
      completedAt: toNullableStringValue(scanValue.completed_at),
      passCount: toNumberValue(scanValue.pass_count),
      securityScore: toNumberValue(scanValue.security_score),
    },
    counts: {
      critical: toNumberValue(countsValue.critical),
      high: toNumberValue(countsValue.high),
      medium: toNumberValue(countsValue.medium),
      low: toNumberValue(countsValue.low),
      info: toNumberValue(countsValue.info),
    },
    findings: reportFindings,
  };
}

async function getFindingsForScans(
  supabase: SupabaseClient<Database>,
  scanIds: string[],
  options: {
    actor: "service_role" | "user_scoped";
    caller: string;
    filtersApplied?: string[];
    userId?: string | null;
  },
) {
  if (scanIds.length === 0) {
    return [];
  }

  const filtersApplied = options.filtersApplied ?? [
    `scan_id in (${scanIds.join(", ")})`,
  ];

  console.info("[report] findings query start", {
    actor: options.actor,
    caller: options.caller,
    filtersApplied,
    requestedScanIds: scanIds,
    tableName: "findings",
    userId: options.userId ?? null,
  });

  const { data, error } = await supabase
    .from("findings")
    .select("*")
    .in("scan_id", scanIds);

  if (error) {
    throw new Error(error.message);
  }

  console.info("[report] findings query result", {
    actor: options.actor,
    caller: options.caller,
    fetchedFindingsCount: data?.length ?? 0,
    fetchedScanIds: getDistinctScanIds(data ?? []),
    filtersApplied,
    requestedScanIds: scanIds,
    tableName: "findings",
    userId: options.userId ?? null,
  });

  return data ?? [];
}

async function getFindingsCountForScan(
  supabase: SupabaseClient<Database>,
  scanId: string,
  options: {
    actor: "service_role" | "user_scoped";
    caller: string;
    userId?: string | null;
  },
) {
  console.info("[report] findings query start", {
    actor: options.actor,
    caller: options.caller,
    filtersApplied: [`scan_id = ${scanId}`, "head: true", "count: exact"],
    requestedScanIds: [scanId],
    tableName: "findings",
    userId: options.userId ?? null,
  });

  const { count, error } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scanId);

  if (error) {
    throw new Error(error.message);
  }

  console.info("[report] findings query result", {
    actor: options.actor,
    caller: options.caller,
    fetchedFindingsCount: count ?? 0,
    fetchedScanIds: count ? [scanId] : [],
    filtersApplied: [`scan_id = ${scanId}`, "head: true", "count: exact"],
    requestedScanIds: [scanId],
    tableName: "findings",
    userId: options.userId ?? null,
  });

  return count ?? 0;
}

function groupFindingsByScan(findings: Finding[]) {
  return findings.reduce<Record<string, Finding[]>>((grouped, finding) => {
    const current = grouped[finding.scan_id] ?? [];
    current.push(finding);
    grouped[finding.scan_id] = current;
    return grouped;
  }, {});
}

function getDistinctScanIds(findings: Finding[]) {
  return [...new Set(findings.map((finding) => finding.scan_id))];
}

function createRawSeverityCounts(findings: Array<Pick<Finding, "severity">>) {
  return findings.reduce<Record<string, number>>((counts, finding) => {
    const severity =
      typeof finding.severity === "string" && finding.severity.trim()
        ? finding.severity.trim()
        : "[empty]";

    counts[severity] = (counts[severity] ?? 0) + 1;
    return counts;
  }, {});
}

function getStoredSeverityCounts(scan: Database["public"]["Tables"]["scans"]["Row"]) {
  const counts = createEmptySeverityCounts();
  counts.critical = scan.critical_count ?? 0;
  counts.high = scan.high_count ?? 0;
  counts.medium = scan.medium_count ?? 0;
  counts.low = scan.low_count ?? 0;
  return counts;
}

function getStoredFindingsCount(
  scan: Database["public"]["Tables"]["scans"]["Row"],
) {
  return Math.max(
    scan.total_findings ?? 0,
    createFindingsTotal(getStoredSeverityCounts(scan)),
  );
}

function selectSeverityCounts(
  scan: Database["public"]["Tables"]["scans"]["Row"],
  findings: ReportFinding[],
) {
  const derivedCounts = createSeverityCounts(findings);
  const storedCounts = getStoredSeverityCounts(scan);

  if (findings.length > 0) {
    return derivedCounts;
  }

  return storedCounts;
}

function resolveSecurityScore(
  scan: Database["public"]["Tables"]["scans"]["Row"],
  counts: ReturnType<typeof createEmptySeverityCounts>,
) {
  const computedScore = calculateSecurityScore({
    criticalCount: counts.critical,
    highCount: counts.high,
    lowCount: counts.low,
    mediumCount: counts.medium,
    passCount: scan.pass_count ?? 0,
  });

  if ((scan.security_score ?? 0) === 0 && computedScore !== 0) {
    return computedScore;
  }

  return scan.security_score ?? computedScore;
}

type AuthenticatedAppUser = {
  email: string | null;
  id: string;
};

export async function getAuthenticatedSupabaseUser(
  supabase: SupabaseClient<Database>,
): Promise<AuthenticatedAppUser | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  logAuthDebug("getAuthenticatedSupabaseUser", {
    sessionError: sessionError?.message ?? null,
    sessionState: summarizeSession(session),
    user: summarizeUser(user),
    userError: userError?.message ?? null,
  });

  if (sessionError || userError || !user) {
    return null;
  }

  return {
    email: user.email ?? null,
    id: user.id,
  };
}

export async function getAuthenticatedAppContext() {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedSupabaseUser(supabase);

  if (!user) {
    return null;
  }

  const profile = await ensureProfileRecord(supabase, user.id, user.email);

  return {
    profile,
    supabase,
    user,
  };
}

export async function getScanSummariesForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: scans, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!scans?.length) {
    return [];
  }

  const findings = await getFindingsForScans(
    createSupabaseAdminClient(),
    scans.map((scan) => scan.id),
    {
      actor: "service_role",
      caller: "getScanSummariesForUser",
      userId,
    },
  );
  const findingsByScan = groupFindingsByScan(findings);

  return scans.map((scan) => {
    const storedSeverityCounts = getStoredSeverityCounts(scan);
    const storedFindingsCount = createFindingsTotal(storedSeverityCounts);
    const severityCounts =
      storedFindingsCount > 0
        ? storedSeverityCounts
        : createSeverityCounts(findingsByScan[scan.id] ?? []);
    const securityScore = resolveSecurityScore(scan, severityCounts);
    return toScanSummary(scan, severityCounts, securityScore);
  });
}

export type OwnedScanReport = {
  categoryDistribution: ReportDistributionItem[];
  counts: ReturnType<typeof createEmptySeverityCounts>;
  executiveSummary: ReportExecutiveSummary;
  findings: ReportFinding[];
  findingsCount: number;
  passChecks: ReportPassItem[];
  passCount: number;
  riskLevel: ReturnType<typeof getSecurityRiskLevel>;
  scan: {
    completedAt: string | null;
    createdAt: string;
    id: string;
    securityScore: number;
    status: ReturnType<typeof normalizeScanStatus>;
    url: string;
    userId: string;
  };
  scoreBreakdown: ReportScoreBreakdown;
  severityDistribution: ReportDistributionItem[];
  topRisks: ReportFinding[];
};

export async function getOwnedScanReport(
  supabase: SupabaseClient<Database>,
  scanId: string,
  options: {
    userId?: string | null;
  } = {},
): Promise<OwnedScanReport | null> {
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .maybeSingle();

  if (scanError) {
    throw new Error(scanError.message);
  }

  if (!scan) {
    return null;
  }

  const normalizedStatus = normalizeScanStatus(scan.status);

  console.info("[report] getOwnedScanReport", {
    completedAt: scan.completed_at,
    rawStatus: scan.status,
    scanId,
    normalizedStatus,
    requestedUserId: options.userId ?? null,
    scanOwnerUserId: scan.user_id,
  });

  const storedSeverityCounts = getStoredSeverityCounts(scan);
  const storedFindingsCount = getStoredFindingsCount(scan);
  const userScopedFindings = await getFindingsForScans(supabase, [scan.id], {
    actor: "user_scoped",
    caller: "getOwnedScanReport.userScopedFindings",
    filtersApplied: [`scan_id in (${scan.id})`],
    userId: options.userId ?? scan.user_id,
  });

  console.info("[report] getOwnedScanReport.userScopedFindings", {
    fetchedFindingsCount: userScopedFindings.length,
    fetchedScanIds: getDistinctScanIds(userScopedFindings),
    requestedScanId: scan.id,
    scanId,
    scanOwnerUserId: scan.user_id,
    storedFindingsCount,
    userId: options.userId ?? null,
  });

  let findings = userScopedFindings;
  let findingsSource = "user_scoped";
  const shouldCheckServiceRole =
    userScopedFindings.length === 0 ||
    storedFindingsCount > userScopedFindings.length;

  if (shouldCheckServiceRole) {
    const adminSupabase = createSupabaseAdminClient();
    const storedFindingsRowCount = await getFindingsCountForScan(
      adminSupabase,
      scan.id,
      {
        actor: "service_role",
        caller: "getOwnedScanReport.serviceRoleCount",
        userId: scan.user_id,
      },
    );
    const rlsLikelyFilteringRows =
      userScopedFindings.length === 0 && storedFindingsRowCount > 0;

    if (storedFindingsRowCount > userScopedFindings.length) {
      console.warn("[report] service role fallback triggered", {
        ownershipVerifiedByScanLookup: true,
        reason:
          userScopedFindings.length === 0
            ? "user_scoped_query_returned_zero_rows"
            : "user_scoped_query_returned_fewer_rows_than_database_count",
        requestedScanId: scan.id,
        rlsLikelyFilteringRows,
        scanId,
        scanOwnerUserId: scan.user_id,
        serviceRoleFindingsCount: storedFindingsRowCount,
        storedFindingsCount,
        userId: options.userId ?? null,
        userScopedFindingsCount: userScopedFindings.length,
      });

      const adminFindings = await getFindingsForScans(adminSupabase, [scan.id], {
        actor: "service_role",
        caller: "getOwnedScanReport.serviceRoleFallback",
        filtersApplied: [`scan_id in (${scan.id})`],
        userId: scan.user_id,
      });

      console.warn("[report] findings visibility mismatch", {
        adminFindingsCount: adminFindings.length,
        adminScanIds: getDistinctScanIds(adminFindings),
        requestedScanId: scan.id,
        rlsLikelyFilteringRows,
        scanId,
        scanOwnerUserId: scan.user_id,
        storedFindingsCount,
        userId: options.userId ?? null,
        userScopedFindingsCount: userScopedFindings.length,
        userScopedScanIds: getDistinctScanIds(userScopedFindings),
      });

      findings = adminFindings;
      findingsSource = "service_role_after_ownership_check";
    }
  }

  const reportFindings = findings
    .map((finding) => buildReportFinding(finding, scan.url))
    .sort((left, right) => {
      const severityRankDifference =
        getSeverityRank(left.severity) - getSeverityRank(right.severity);

      if (severityRankDifference !== 0) {
        return severityRankDifference;
      }

      return left.title.localeCompare(right.title);
    });
  const counts = selectSeverityCounts(scan, reportFindings);
  const securityScore = resolveSecurityScore(scan, counts);
  const derivedCounts = createSeverityCounts(reportFindings);

  if (
    reportFindings.length > 0 &&
    JSON.stringify(derivedCounts) !== JSON.stringify(storedSeverityCounts)
  ) {
    console.warn("[report] severity count mismatch", {
      derivedCounts,
      scanId,
      storedSeverityCounts,
    });
  }

  const expectedFindingsCount = createFindingsTotal(counts);
  const passChecks = derivePassChecks(reportFindings, {
    expectedFindingsCount,
  });
  const passCount =
    reportFindings.length < expectedFindingsCount
      ? 0
      : scan.pass_count ?? passChecks.length;
  const executiveSummary = createExecutiveSummary(
    counts,
    passCount,
    securityScore,
    getSecurityRiskLevel(securityScore),
    reportFindings,
  );
  const severityDistribution = createSeverityDistribution(counts, passCount);
  const categoryDistribution = createCategoryDistribution(reportFindings);
  const scoreBreakdown = createSecurityScoreBreakdown(counts, securityScore);
  const topRisks = createTopRisks(reportFindings);

  console.info("[report] getOwnedScanReport.findings", {
    categoryDistribution,
    derivedSeverityCounts: derivedCounts,
    expectedFindingsCount,
    fetchedFindingsCount: findings.length,
    fetchedScanIds: getDistinctScanIds(findings),
    findingsSource,
    findingsLength: findings.length,
    normalizedSeverityCounts: createSeverityCounts(reportFindings),
    normalizedSeverityValues: reportFindings.map((finding) => finding.severity),
    passChecksLength: passChecks.length,
    rawSeverityCounts: createRawSeverityCounts(findings),
    rawSeverityValues: findings.map((finding) => finding.severity),
    scanId,
    scoreBreakdown,
    storedSeverityCounts,
    topRiskTitles: topRisks.map((finding) => finding.title),
  });

  console.info("[report] final findings count", {
    finalFindingsCount: findings.length,
    findingsSource,
    requestedScanId: scan.id,
    scanId,
    scanOwnerUserId: scan.user_id,
    userId: options.userId ?? null,
  });

  return {
    categoryDistribution,
    counts,
    executiveSummary,
    findings: reportFindings,
    findingsCount: createFindingsTotal(counts),
    passChecks,
    passCount,
    riskLevel: getSecurityRiskLevel(securityScore),
    scan: {
      completedAt: scan.completed_at,
      createdAt: scan.created_at,
      id: scan.id,
      securityScore,
      status: normalizedStatus,
      url: scan.url,
      userId: scan.user_id,
    },
    scoreBreakdown,
    severityDistribution,
    topRisks,
  };
}

export async function getDashboardData() {
  const context = await getAuthenticatedAppContext();

  if (!context) {
    return null;
  }

  const scans = await getScanSummariesForUser(context.supabase, context.user.id);

  return {
    profile: context.profile,
    scans,
    totalScansUsed: scans.length,
    user: context.user,
  };
}

export async function getPublicShareReport(scanId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_share_report", {
    requested_scan_id: scanId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const report = parsePublicShareReport(data);

  if (!report) {
    return null;
  }

  const derivedPassChecks = derivePassChecks(report.findings, {
    expectedFindingsCount: createFindingsTotal(report.counts),
  });
  const securityScore =
    report.scan.securityScore === 0
      ? calculateSecurityScore({
          criticalCount: report.counts.critical,
          highCount: report.counts.high,
          lowCount: report.counts.low,
          mediumCount: report.counts.medium,
          passCount: report.scan.passCount || derivedPassChecks.length,
        })
      : report.scan.securityScore;

  return {
    ...report,
    scan: {
      ...report.scan,
      passCount: report.scan.passCount || derivedPassChecks.length,
      securityScore,
    },
  };
}
