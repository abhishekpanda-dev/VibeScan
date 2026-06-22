import "server-only";

import { getClientBundles } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext, ScannerSeverity } from "@/lib/scanner/types";

const PACKAGE_ICON = "\u{1F4E6}";
const PACKAGE_JSON_PATTERN = /"name":"([^"]+)","version":"([^"]+)"/g;
const WEBPACK_COMMENT_PATTERN = /\/\*!\s*([a-zA-Z0-9@/_-]+)\s+([0-9]+\.[0-9]+\.[0-9]+)\s*\*\//g;

type DependencyRule = {
  cve: string;
  description: string;
  fixedVersion: string;
  packageName: string;
  severity: ScannerSeverity;
};

const dependencyRules: DependencyRule[] = [
  {
    cve: "CVE-2025-29927",
    description: "Next.js versions below 15.2.3 have a known authentication bypass vulnerability.",
    fixedVersion: "15.2.3",
    packageName: "next",
    severity: "critical",
  },
  {
    cve: "CVE-2024-34351",
    description: "Next.js versions below 14.1.1 are affected by cache poisoning issues.",
    fixedVersion: "14.1.1",
    packageName: "next",
    severity: "high",
  },
  {
    cve: "Supabase token refresh advisory",
    description: "@supabase/supabase-js versions below 2.39.0 have known token refresh issues.",
    fixedVersion: "2.39.0",
    packageName: "@supabase/supabase-js",
    severity: "medium",
  },
  {
    cve: "jsonwebtoken advisory",
    description: "jsonwebtoken versions below 9.0.0 are associated with legacy algorithm confusion risks.",
    fixedVersion: "9.0.0",
    packageName: "jsonwebtoken",
    severity: "high",
  },
  {
    cve: "axios advisory",
    description: "axios versions below 1.6.0 have known request security issues.",
    fixedVersion: "1.6.0",
    packageName: "axios",
    severity: "medium",
  },
  {
    cve: "lodash advisory",
    description: "lodash versions below 4.17.21 are affected by prototype pollution vulnerabilities.",
    fixedVersion: "4.17.21",
    packageName: "lodash",
    severity: "high",
  },
];

function parseVersion(value: string) {
  return value
    .split(".")
    .map((segment) => Number.parseInt(segment.replace(/[^0-9].*$/, ""), 10))
    .map((segment) => (Number.isNaN(segment) ? 0 : segment));
}

function isVersionLessThan(left: string, right: string) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue === rightValue) {
      continue;
    }

    return leftValue < rightValue;
  }

  return false;
}

type DetectedDependency = {
  packageName: string;
  source: string;
  version: string;
};

function collectDetectedDependencies(bundleText: string, source: string) {
  const dependencies = new Map<string, DetectedDependency>();

  for (const pattern of [PACKAGE_JSON_PATTERN, WEBPACK_COMMENT_PATTERN]) {
    for (const match of bundleText.matchAll(new RegExp(pattern.source, pattern.flags))) {
      const packageName = match[1];
      const version = match[2];

      if (!packageName || !version) {
        continue;
      }

      dependencies.set(`${packageName}@${version}`, {
        packageName,
        source,
        version,
      });
    }
  }

  return [...dependencies.values()];
}

export async function dependencyScanner(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const bundles = await getClientBundles(context);
  const detectedDependencies = bundles.flatMap((bundle) =>
    collectDetectedDependencies(bundle.text, bundle.url.pathname),
  );
  const findings = [];
  const seen = new Set<string>();

  for (const dependency of detectedDependencies) {
    for (const rule of dependencyRules) {
      if (
        dependency.packageName !== rule.packageName ||
        !isVersionLessThan(dependency.version, rule.fixedVersion)
      ) {
        continue;
      }

      const fingerprint = `${dependency.packageName}@${dependency.version}:${rule.fixedVersion}`;

      if (seen.has(fingerprint)) {
        continue;
      }

      seen.add(fingerprint);
      findings.push(
        createFinding({
          category: "Dependency Risk",
          cvssScore:
            rule.severity === "critical" ? "9.0 / Critical" : rule.severity === "high" ? "7.3 / High" : "5.3 / Medium",
          description: rule.description,
          evidence: createEvidence([
            createEvidenceBlock("PACKAGE", `${dependency.packageName}@${dependency.version}`, true),
            createEvidenceBlock("FIXED VERSION", rule.fixedVersion),
            createEvidenceBlock("SOURCE", dependency.source),
            createEvidenceBlock("ADVISORY", rule.cve),
          ]),
          icon: PACKAGE_ICON,
          location: dependency.source,
          owasp: "OWASP A06:2021",
          severity: rule.severity,
          title: `${dependency.packageName}@${dependency.version} has known vulnerabilities`,
        }),
      );
    }
  }

  return {
    check: "dependencyScanner",
    findings,
    passed: findings.length === 0,
  };
}
