import type {
  Finding,
  FindingConfidenceLevel,
  FindingValidationState,
  ReportDistributionItem,
  ReportExecutiveSummary,
  ReportFinding,
  ReportScoreBreakdown,
  SeverityCounts,
  SeverityLevel,
} from "@/types/database";
import { evidenceToText } from "@/lib/scanner/findings";
import { SEVERITY_PENALTIES } from "@/lib/scanner/securityScore";

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
  info: 25,
};

const SEVERITY_COLORS: Record<SeverityLevel | "pass", string> = {
  critical: "#FF8E8E",
  high: "#FFC57A",
  info: "#CBD5E1",
  low: "#8FD0FF",
  medium: "#F5D565",
  pass: "#7DF0A0",
};

const CATEGORY_COLORS = [
  "#FF8E8E",
  "#FFC57A",
  "#F5D565",
  "#8FD0FF",
  "#7DF0A0",
  "#C4B5FD",
  "#F9A8D4",
] as const;

const CHECK_LABELS: Record<string, string> = {
  adminLogicDetector: "Client-side authorization review",
  apiRouteProbe: "API route exposure probe",
  bundleScanner: "Client bundle secret scan",
  corsAuthAnalyzer: "CORS and auth storage analysis",
  dependencyScanner: "Dependency vulnerability review",
  envFileScanner: "Environment file exposure probe",
  securityHeaders: "Security header audit",
  supabaseRlsAudit: "Supabase RLS audit",
};

type BaseFinding = Pick<
  Finding,
  "category" | "description" | "evidence" | "location" | "severity" | "title"
>;

function normalizeSeverity(
  severity: string | null | undefined,
): SeverityLevel {
  const normalized = severity?.toLowerCase().trim();

  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low" ||
    normalized === "info"
  ) {
    return normalized;
  }

  return "info";
}

function inferCheckId(category: string) {
  switch (category) {
    case "Bundle Exposure":
      return "bundleScanner";
    case "Dependency Risk":
      return "dependencyScanner";
    case "Security Headers":
      return "securityHeaders";
    case "Environment Exposure":
      return "envFileScanner";
    case "Supabase RLS":
      return "supabaseRlsAudit";
    case "API Route Exposure":
      return "apiRouteProbe";
    case "Client-side Authorization":
      return "adminLogicDetector";
    case "CORS & Auth":
      return "corsAuthAnalyzer";
    default:
      return "scanner";
  }
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function splitLocation(location: string | null) {
  if (!location) {
    return {
      cleanPath: null,
      detail: null,
    };
  }

  if (location.startsWith("header:")) {
    return {
      cleanPath: null,
      detail: location,
    };
  }

  const lineMatch = location.match(/^(\/[^:]+):(\d+)$/);

  if (lineMatch) {
    return {
      cleanPath: lineMatch[1],
      detail: `Line ${lineMatch[2]}`,
    };
  }

  return {
    cleanPath: location.startsWith("/") ? location : null,
    detail: location.startsWith("/") ? null : location,
  };
}

function resolveAffectedTarget(targetUrl: string, location: string | null) {
  const normalizedTarget = trimTrailingSlash(targetUrl);
  const { cleanPath, detail } = splitLocation(location);

  if (cleanPath) {
    try {
      return {
        affectedPath: cleanPath,
        affectedTarget: new URL(cleanPath, normalizedTarget).toString(),
      };
    } catch {
      return {
        affectedPath: cleanPath,
        affectedTarget: `${normalizedTarget}${cleanPath}`,
      };
    }
  }

  return {
    affectedPath: detail,
    affectedTarget: normalizedTarget,
  };
}

function createConfidence(
  label: FindingConfidenceLevel,
  score: number,
  rationale: string,
) {
  return {
    label,
    rationale,
    score,
  };
}

function createValidationState(
  confidenceLabel: FindingConfidenceLevel,
): FindingValidationState {
  switch (confidenceLabel) {
    case "high":
      return "confirmed";
    case "medium":
      return "likely";
    case "low":
      return "review";
  }
}

function createCommonNarrative(
  finding: BaseFinding,
  targetUrl: string,
) {
  const severity = normalizeSeverity(finding.severity);
  const { affectedPath, affectedTarget } = resolveAffectedTarget(
    targetUrl,
    finding.location,
  );
  const checkId = inferCheckId(finding.category);
  const checkLabel = CHECK_LABELS[checkId] ?? "Scanner check";
  const technicalEvidence =
    evidenceToText(finding.evidence) ||
    "The scanner did not capture additional evidence.";

  return {
    affectedPath,
    affectedTarget,
    checkId,
    checkLabel,
    severity,
    technicalEvidence,
  };
}

function createNarrativeFromFinding(
  finding: BaseFinding,
  targetUrl: string,
) {
  const common = createCommonNarrative(finding, targetUrl);

  switch (finding.category) {
    case "Environment Exposure": {
      const confidence = createConfidence(
        "high",
        97,
        "The environment file probe only raises a finding after the response passes content validation and is not an HTML fallback page.",
      );

      return {
        ...common,
        confidence,
        cwe: ["CWE-538", "CWE-200"],
        impact:
          "Attackers may recover secrets, service credentials, or environment-specific configuration that can be used for further compromise.",
        owasp: ["A05:2021 Security Misconfiguration", "A02:2021 Cryptographic Failures"],
        remediationSteps: [
          "Block direct access to environment and configuration files at the web server, CDN, and framework routing layers.",
          "Move sensitive configuration to server-only environment variables and confirm they are never served as static assets.",
          "Rotate any exposed keys or credentials immediately after removing access.",
        ],
        remediationSummary:
          "Block public access to the exposed file and rotate any secrets contained within it.",
        reproductionSteps: [
          `Request ${common.affectedTarget} directly with curl or a browser.`,
          "Confirm the server returns raw configuration content instead of a normal HTML application page.",
          "Verify the response includes real key/value configuration markers such as environment variables or Git config sections.",
        ],
        riskExplanation:
          "Sensitive configuration files should never be reachable from the public web root. In this case the scanner validated the response body as a real configuration artifact instead of a generic site fallback page.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The environment exposure probe received a non-HTML HTTP 200 response whose body matched validated signatures for the requested file type.",
      };
    }
    case "Bundle Exposure": {
      const isSessionToken = finding.title.toLowerCase().includes("jwt/session token");
      const isPrivilegedToken = finding.title.toLowerCase().includes("privileged jwt");
      const confidence = createConfidence(
        isSessionToken ? "medium" : "high",
        isSessionToken ? 76 : 94,
        isSessionToken
          ? "The bundle contains a token-like value that decoded as a non-public JWT, but the exact privilege level still requires manual review."
          : "The bundle contains a concrete secret pattern or privileged token signature that should never be shipped to the client.",
      );

      return {
        ...common,
        confidence,
        cwe: isSessionToken ? ["CWE-522", "CWE-200"] : ["CWE-798", "CWE-200"],
        impact:
          "Secrets or authenticated tokens in a public bundle can be extracted by anyone who loads the application, enabling account abuse, API misuse, or backend compromise.",
        owasp: ["A02:2021 Cryptographic Failures", "A05:2021 Security Misconfiguration"],
        remediationSteps: [
          "Remove the secret or token from all client-side bundles and move the operation behind a server-side route handler or API.",
          "Rotate any exposed keys, tokens, or connection strings immediately.",
          "Add a build-time secret scan so credential-like patterns fail CI before deployment.",
        ],
        remediationSummary:
          "Move secrets off the client and rotate any credential that was exposed in the bundle.",
        reproductionSteps: [
          "Download the referenced JavaScript asset from the public site.",
          "Search the asset for the secret pattern or token class identified by the scanner.",
          "Confirm that the value is embedded in client-delivered code and therefore retrievable without authentication.",
        ],
        riskExplanation:
          "Public bundles are fully accessible to end users. Any embedded secret, privileged JWT, or backend connection material should be treated as compromised once deployed.",
        topRiskScore:
          SEVERITY_WEIGHTS[common.severity] +
          confidence.score +
          (isPrivilegedToken ? 25 : 0),
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The client bundle scan matched a concrete secret or token signature inside publicly downloadable JavaScript and masked the value in the evidence preview.",
      };
    }
    case "Supabase RLS": {
      const criticalExposure = common.severity === "critical";
      const confidence = createConfidence(
        criticalExposure ? "high" : "medium",
        criticalExposure ? 92 : 78,
        criticalExposure
          ? "The anon-key request returned real table rows and the response included sensitive-looking fields."
          : "The anon-key request returned real table rows, but the sampled fields were less obviously sensitive.",
      );

      return {
        ...common,
        confidence,
        cwe: ["CWE-284", "CWE-200"],
        impact:
          "Unauthenticated users may be able to query application data directly from Supabase tables that should be protected by row-level security.",
        owasp: ["A01:2021 Broken Access Control", "A05:2021 Security Misconfiguration"],
        remediationSteps: [
          "Review row-level security policies for the exposed table and deny anonymous reads by default.",
          "Limit the data returned by public policies to the minimum fields required for legitimate public use cases.",
          "Retest the table with the public anon key after tightening policies.",
        ],
        remediationSummary:
          "Tighten Supabase row-level security policies so anonymous requests cannot read protected rows.",
        reproductionSteps: [
          "Extract the public Supabase anon key and project URL from the client bundle or runtime configuration.",
          "Send an unauthenticated request to the affected `/rest/v1/...` endpoint using the anon key.",
          "Confirm that the response returns one or more real data rows without an authenticated user session.",
        ],
        riskExplanation:
          "A public anon key is expected to exist, but it should only permit intentionally public data. Returning protected rows indicates row-level security is either missing or too permissive.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The Supabase audit discovered an anon key in client-exposed configuration and successfully used it to query real table rows from the affected endpoint.",
      };
    }
    case "API Route Exposure": {
      const confidence = createConfidence(
        common.severity === "high" ? "medium" : "low",
        common.severity === "high" ? 74 : 58,
        common.severity === "high"
          ? "The endpoint returned a real JSON payload with strong credential or session field signals, but the exact sensitivity still depends on the payload values."
          : "The endpoint returned JSON with weaker identity or role-oriented signals and should be manually confirmed.",
      );

      return {
        ...common,
        confidence,
        cwe: ["CWE-200", "CWE-306"],
        impact:
          "Unauthenticated users may be able to enumerate application data or retrieve session-related information from routes that should require access control.",
        owasp: ["A01:2021 Broken Access Control", "A05:2021 Security Misconfiguration"],
        remediationSteps: [
          "Require authentication and authorization on the affected route handler before returning sensitive JSON.",
          "Minimize response fields so public endpoints expose only intentionally public data.",
          "Add explicit automated tests for anonymous requests to security-sensitive API routes.",
        ],
        remediationSummary:
          "Protect the route with authentication checks and reduce the sensitivity of any public JSON that remains.",
        reproductionSteps: [
          `Send an unauthenticated GET request to ${common.affectedTarget}.`,
          "Verify that the endpoint returns a 200 response with JSON content instead of an authorization failure.",
          "Review the payload fields listed in the scanner evidence to confirm whether they include sensitive application data.",
        ],
        riskExplanation:
          "A public JSON response is not always a vulnerability, but exposing session-, credential-, or multi-user data from an unauthenticated endpoint can create a real access-control issue.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The API probe reached the route without authentication, received a 200 JSON response, and found sensitive-looking field names in the payload.",
      };
    }
    case "Security Headers": {
      const confidence = createConfidence(
        "high",
        88,
        "The scanner read the target document response directly and verified that the named header was absent.",
      );

      return {
        ...common,
        confidence,
        cwe:
          finding.title === "Missing X-Frame-Options header"
            ? ["CWE-1021"]
            : finding.title === "Missing Referrer-Policy header"
              ? ["CWE-200"]
              : ["CWE-16", "CWE-693"],
        impact:
          "Missing protective headers increase exposure to browser-side abuse such as clickjacking, content injection, mixed transport behavior, or overly permissive browser feature access.",
        owasp: ["A05:2021 Security Misconfiguration"],
        remediationSteps: [
          "Define the missing header in your framework response middleware, reverse proxy, or hosting platform configuration.",
          "Apply a least-privilege policy value rather than a permissive placeholder.",
          "Retest the production response headers after deployment.",
        ],
        remediationSummary:
          "Add the missing response header at the application or edge layer and verify it is present in production.",
        reproductionSteps: [
          `Request ${trimTrailingSlash(targetUrl) || targetUrl} and inspect the response headers.`,
          `Verify that ${finding.location?.replace("header:", "") ?? "the required header"} is absent from the response.`,
          "Confirm the application does not set an equivalent control elsewhere, such as CSP frame-ancestors for clickjacking protection.",
        ],
        riskExplanation:
          "Security headers are preventative browser controls. Missing them does not prove active compromise, but it weakens defense-in-depth and can increase exploitability of other issues.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The security header audit fetched the target document and found that the required header was not present in the response.",
      };
    }
    case "Dependency Risk": {
      const confidence = createConfidence(
        "medium",
        72,
        "This check only raises a finding when a package name and concrete version can be extracted from a public asset and compared against a known vulnerable threshold.",
      );

      return {
        ...common,
        confidence,
        cwe: ["CWE-1104"],
        impact:
          "Running a publicly known vulnerable dependency can expose the application to exploits even when the application code itself looks correct.",
        owasp: ["A06:2021 Vulnerable and Outdated Components"],
        remediationSteps: [
          "Upgrade the affected package to the fixed version or later.",
          "Review the upstream advisory and confirm whether your usage path is affected.",
          "Add dependency update monitoring so future advisories are surfaced earlier.",
        ],
        remediationSummary:
          "Upgrade the affected dependency to a fixed release and confirm the advisory no longer applies.",
        reproductionSteps: [
          "Inspect the referenced bundle metadata or source map markers for the detected package name and version.",
          "Compare the detected version against the fixed version listed in the evidence.",
          "Review the public advisory or CVE for exploit conditions relevant to your deployment.",
        ],
        riskExplanation:
          "Outdated dependencies can carry known vulnerabilities that attackers already understand well, so version drift should be remediated proactively.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The dependency check extracted a concrete package name and version from a public asset and matched it against a vulnerable version threshold.",
      };
    }
    case "CORS & Auth": {
      const localStorageIssue = finding.title.toLowerCase().includes("localstorage");
      const confidence = createConfidence(
        localStorageIssue ? "low" : common.severity === "high" ? "high" : "medium",
        localStorageIssue ? 52 : common.severity === "high" ? 90 : 72,
        localStorageIssue
          ? "The bundle contains a client-side token storage pattern, but manual review is still needed to confirm whether sensitive tokens are actually persisted."
          : common.severity === "high"
            ? "The response explicitly combines wildcard origin access with credentials, which is a concrete misconfiguration."
            : "The response explicitly allows any origin, which broadens cross-origin access and should be reviewed in context.",
      );

      return {
        ...common,
        confidence,
        cwe: localStorageIssue ? ["CWE-922"] : ["CWE-942"],
        impact:
          "Overly permissive cross-origin access or browser storage of authentication material can increase token exposure and weaken session protection.",
        owasp: ["A05:2021 Security Misconfiguration", "A07:2021 Identification and Authentication Failures"],
        remediationSteps: localStorageIssue
          ? [
              "Avoid storing long-lived authentication tokens in localStorage when an HttpOnly cookie-based session is possible.",
              "Shorten token lifetimes and scope if browser storage is unavoidable.",
              "Review XSS defenses because browser-accessible tokens become much higher risk when script injection is possible.",
            ]
          : [
              "Restrict Access-Control-Allow-Origin to the specific trusted origins that need cross-origin access.",
              "Do not combine wildcard origins with credentialed requests.",
              "Retest both preflight and actual responses after the CORS policy change.",
            ],
        remediationSummary: localStorageIssue
          ? "Move sensitive session material to safer storage and reduce the blast radius of any client-accessible token."
          : "Tighten the CORS policy so only trusted origins can access authenticated traffic.",
        reproductionSteps: localStorageIssue
          ? [
              "Inspect the referenced client bundle or source for localStorage token persistence calls.",
              "Confirm whether real access, refresh, or session tokens are stored with these calls during authentication flows.",
            ]
          : [
              `Send a request to ${trimTrailingSlash(targetUrl) || targetUrl} and inspect the CORS response headers.`,
              "Verify whether Access-Control-Allow-Origin is set to `*` and whether credentials are enabled.",
            ],
        riskExplanation:
          "CORS policy controls which browser origins can read responses, while browser storage choices affect how easily tokens can be stolen if client-side code is compromised.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated: localStorageIssue
          ? "The auth storage analyzer matched a token persistence pattern in the client bundle."
          : "The CORS analyzer observed permissive cross-origin headers on the target response.",
      };
    }
    case "Client-side Authorization": {
      const confidence = createConfidence(
        "low",
        44,
        "This check is intentionally treated as a review signal because client-side admin logic alone does not prove missing server-side enforcement.",
      );

      return {
        ...common,
        confidence,
        cwe: ["CWE-602"],
        impact:
          "If administrative authorization is only enforced in the client, attackers may bypass the UI and call backend functions directly.",
        owasp: ["A01:2021 Broken Access Control"],
        remediationSteps: [
          "Review the matched admin feature and confirm that equivalent authorization is enforced in server-side routes and data policies.",
          "Treat client-side role checks as UX hints only, not as a security boundary.",
          "Add backend authorization tests for the administrative capability represented by the matched patterns.",
        ],
        remediationSummary:
          "Verify that server-side authorization exists for the admin action and treat the client finding as a review prompt, not proof.",
        reproductionSteps: [
          "Inspect the referenced bundle for the matched client-side admin or role-gating patterns.",
          "Attempt the related backend action directly without relying on the client UI to confirm whether server-side authorization exists.",
        ],
        riskExplanation:
          "Client-visible authorization logic is not automatically a vulnerability, but it does identify areas where server-side enforcement should be verified carefully.",
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The client authorization review detected multiple admin-facing role or storage patterns in the same bundle and raised a manual verification signal.",
      };
    }
    default: {
      const confidence = createConfidence(
        "medium",
        65,
        "This finding is derived from scanner evidence but does not have a specialized confidence profile yet.",
      );

      return {
        ...common,
        confidence,
        cwe: [],
        impact: finding.description,
        owasp: ["A05:2021 Security Misconfiguration"],
        remediationSteps: [
          "Review the scanner evidence in context and confirm whether the behavior is expected.",
          "Apply the least-privilege fix that removes the observed exposure.",
        ],
        remediationSummary: "Review the scanner evidence and apply the least-privilege corrective action.",
        reproductionSteps: [
          "Reproduce the request or artifact referenced in the evidence.",
          "Confirm whether the observed behavior is present in production and not only in a development artifact.",
        ],
        riskExplanation: finding.description,
        topRiskScore: SEVERITY_WEIGHTS[common.severity] + confidence.score,
        validationState: createValidationState(confidence.label),
        whyItWasCreated:
          "The scanner observed behavior that matched one of its configured detection rules for this category.",
      };
    }
  }
}

export function buildReportFinding(
  finding: Pick<
    Finding,
    | "category"
    | "description"
    | "evidence"
    | "fix_markdown"
    | "id"
    | "location"
    | "scan_id"
    | "severity"
    | "title"
  >,
  targetUrl: string,
): ReportFinding {
  const narrative = createNarrativeFromFinding(finding, targetUrl);

  return {
    affectedPath: narrative.affectedPath,
    affectedTarget: narrative.affectedTarget,
    category: finding.category,
    checkId: narrative.checkId,
    checkLabel: narrative.checkLabel,
    confidence: narrative.confidence,
    cwe: narrative.cwe,
    description: finding.description,
    evidence: evidenceToText(finding.evidence),
    fixMarkdown: finding.fix_markdown,
    id: finding.id,
    impact: narrative.impact,
    location: finding.location,
    owasp: narrative.owasp,
    remediationSteps: narrative.remediationSteps,
    remediationSummary: narrative.remediationSummary,
    reproductionSteps: narrative.reproductionSteps,
    riskExplanation: narrative.riskExplanation,
    scanId: finding.scan_id,
    severity: narrative.severity,
    technicalEvidence: narrative.technicalEvidence,
    title: finding.title,
    topRiskScore: narrative.topRiskScore,
    validationState: narrative.validationState,
    whyItWasCreated: narrative.whyItWasCreated,
  };
}

export function createFixGenerationContext(
  finding: BaseFinding,
  targetUrl: string,
) {
  const narrative = createNarrativeFromFinding(finding, targetUrl);

  return {
    affectedTarget: narrative.affectedTarget,
    confidence: narrative.confidence,
    cwe: narrative.cwe,
    impact: narrative.impact,
    owasp: narrative.owasp,
    remediationSteps: narrative.remediationSteps,
    reproductionSteps: narrative.reproductionSteps,
    riskExplanation: narrative.riskExplanation,
    technicalEvidence: narrative.technicalEvidence,
    validationState: narrative.validationState,
    whyItWasCreated: narrative.whyItWasCreated,
  };
}

export function createFindingSearchText(finding: ReportFinding) {
  return [
    finding.title,
    finding.category,
    finding.description,
    finding.riskExplanation,
    finding.technicalEvidence,
    finding.impact,
    finding.checkLabel,
    finding.affectedTarget,
    finding.affectedPath ?? "",
    finding.owasp.join(" "),
    finding.cwe.join(" "),
    finding.validationState,
    finding.confidence.label,
    finding.confidence.rationale,
  ]
    .join(" ")
    .toLowerCase();
}

export function createSeverityDistribution(
  counts: SeverityCounts,
  passCount: number,
): ReportDistributionItem[] {
  return [
    {
      color: SEVERITY_COLORS.critical,
      label: "Critical",
      value: counts.critical,
    },
    {
      color: SEVERITY_COLORS.high,
      label: "High",
      value: counts.high,
    },
    {
      color: SEVERITY_COLORS.medium,
      label: "Medium",
      value: counts.medium,
    },
    {
      color: SEVERITY_COLORS.low,
      label: "Low",
      value: counts.low,
    },
    {
      color: SEVERITY_COLORS.pass,
      label: "Pass",
      value: passCount,
    },
  ].filter((item) => item.value > 0);
}

export function createCategoryDistribution(
  findings: ReportFinding[],
): ReportDistributionItem[] {
  const counts = new Map<string, number>();

  for (const finding of findings) {
    counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, value], index) => ({
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      label,
      value,
    }));
}

export function createTopRisks(findings: ReportFinding[], count = 3) {
  return [...findings]
    .sort(
      (left, right) =>
        right.topRiskScore - left.topRiskScore ||
        right.confidence.score - left.confidence.score ||
        left.title.localeCompare(right.title),
    )
    .slice(0, count);
}

export function createSecurityScoreBreakdown(
  counts: SeverityCounts,
  finalScore: number,
): ReportScoreBreakdown {
  const penalties = [
    {
      count: counts.critical,
      label: "Critical findings",
      penaltyPerItem: SEVERITY_PENALTIES.critical,
      severity: "critical" as const,
      totalPenalty: counts.critical * SEVERITY_PENALTIES.critical,
    },
    {
      count: counts.high,
      label: "High findings",
      penaltyPerItem: SEVERITY_PENALTIES.high,
      severity: "high" as const,
      totalPenalty: counts.high * SEVERITY_PENALTIES.high,
    },
    {
      count: counts.medium,
      label: "Medium findings",
      penaltyPerItem: SEVERITY_PENALTIES.medium,
      severity: "medium" as const,
      totalPenalty: counts.medium * SEVERITY_PENALTIES.medium,
    },
    {
      count: counts.low,
      label: "Low findings",
      penaltyPerItem: SEVERITY_PENALTIES.low,
      severity: "low" as const,
      totalPenalty: counts.low * SEVERITY_PENALTIES.low,
    },
  ];
  const totalPenalty = penalties.reduce(
    (sum, penalty) => sum + penalty.totalPenalty,
    0,
  );

  return {
    baseScore: 100,
    finalScore,
    penalties,
    totalPenalty,
  };
}

export function createExecutiveSummary(
  counts: SeverityCounts,
  passCount: number,
  securityScore: number,
  riskLevel: string,
  findings: ReportFinding[],
): ReportExecutiveSummary {
  const topCategories = createCategoryDistribution(findings)
    .slice(0, 3)
    .map((item) => item.label);
  const totalFindings =
    counts.critical +
    counts.high +
    counts.medium +
    counts.low +
    counts.info;

  let primaryMessage = "The target presents a relatively low number of security issues.";

  if (counts.critical > 0) {
    primaryMessage =
      "Critical issues were confirmed with strong evidence and should be remediated before relying on the target for sensitive workflows.";
  } else if (counts.high > 0) {
    primaryMessage =
      "High-severity issues were identified and should be prioritized early in the remediation plan.";
  } else if (counts.medium > 0) {
    primaryMessage =
      "The target shows moderate security weaknesses that should be addressed as part of routine hardening.";
  } else if (totalFindings === 0) {
    primaryMessage =
      "No actionable findings were generated by the current scanner checks, although this is not a guarantee of full security coverage.";
  }

  return {
    criticalFindings: counts.critical,
    highFindings: counts.high,
    lowFindings: counts.low,
    mediumFindings: counts.medium,
    passedChecks: passCount,
    primaryMessage,
    riskLevel,
    securityScore,
    topCategories,
    totalFindings,
  };
}
