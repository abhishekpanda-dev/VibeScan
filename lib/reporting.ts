import type { ReportFinding, SeverityCounts } from "@/types/database";

export type ReportListFilter =
  | "all"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "pass";

export type ReportPassItem = {
  category: string;
  description: string;
  evidence: null;
  fixMarkdown: null;
  id: string;
  location: null;
  severity: "pass";
  title: string;
};

type PassCheckDefinition = Omit<ReportPassItem, "evidence" | "fixMarkdown" | "location" | "severity">;
type DerivePassChecksOptions = {
  expectedFindingsCount?: number;
};

const PASS_CHECK_DEFINITIONS: PassCheckDefinition[] = [
  {
    category: "Bundle Exposure",
    description:
      "Public client bundles did not expose obvious secret patterns during this scan.",
    id: "pass-bundle-exposure",
    title: "Client bundle secret exposure check passed",
  },
  {
    category: "Security Headers",
    description:
      "The core response header audit did not detect missing security headers.",
    id: "pass-security-headers",
    title: "Security header audit passed",
  },
  {
    category: "Environment Exposure",
    description:
      "Common environment and configuration file probes did not expose sensitive files.",
    id: "pass-environment-exposure",
    title: "Environment exposure probe passed",
  },
  {
    category: "Supabase RLS",
    description:
      "The Supabase anon-key audit did not find obviously exposed tables.",
    id: "pass-supabase-rls",
    title: "Supabase RLS audit passed",
  },
  {
    category: "API Route Exposure",
    description:
      "The unauthenticated API probe did not surface sensitive JSON payloads.",
    id: "pass-api-route-exposure",
    title: "Sensitive API route probe passed",
  },
  {
    category: "Client-side Authorization",
    description:
      "The bundle audit did not find obvious client-side admin authorization logic.",
    id: "pass-client-authorization",
    title: "Client-side authorization audit passed",
  },
  {
    category: "CORS & Auth",
    description:
      "The scanner did not detect risky wildcard CORS settings or auth token storage issues.",
    id: "pass-cors-auth",
    title: "CORS and auth storage audit passed",
  },
];

export function createFindingsTotal(counts: SeverityCounts) {
  return (
    counts.critical +
    counts.high +
    counts.medium +
    counts.low +
    counts.info
  );
}

export function derivePassChecks(
  findings: ReportFinding[],
  options: DerivePassChecksOptions = {},
): ReportPassItem[] {
  const expectedFindingsCount = options.expectedFindingsCount ?? findings.length;

  // If the caller knows there should be more findings than were actually loaded,
  // suppress pass-check synthesis so we do not present missing findings as passes.
  if (expectedFindingsCount > findings.length) {
    return [];
  }

  const failingCategories = new Set(findings.map((finding) => finding.category));

  return PASS_CHECK_DEFINITIONS.filter(
    (definition) => !failingCategories.has(definition.category),
  ).map((definition) => ({
    ...definition,
    evidence: null,
    fixMarkdown: null,
    location: null,
    severity: "pass",
  }));
}

export function isFixGeneratedSeverity(severity: ReportFinding["severity"]) {
  return severity === "critical" || severity === "high";
}
