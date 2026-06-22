import "server-only";

import { getClientBundles } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext } from "@/lib/scanner/types";

const REVIEW_ICON = "\u{1F441}\u{FE0F}";

const ROLE_GATING_PATTERNS = [
  { label: 'role === "admin"', regex: /role\s*===\s*["']admin["']/gi },
  { label: "isAdmin", regex: /\bisAdmin\b/g },
  { label: "user.role", regex: /\buser\.role\b/g },
  { label: "permissions.includes", regex: /permissions\.includes\s*\(/g },
] as const;

const ADMIN_SURFACE_PATTERNS = [
  { label: "admin route", regex: /["'`]\/admin(?:\/|["'`])/gi },
  { label: "adminPanel", regex: /\badminPanel\b/gi },
  { label: "showAdmin", regex: /\bshowAdmin\b/gi },
  { label: "manageUsers", regex: /\bmanageUsers\b/gi },
] as const;

const STORAGE_PATTERNS = [
  { label: "role stored in localStorage", regex: /localStorage\.(?:getItem|setItem)\(\s*["']role["']/gi },
] as const;

export async function adminLogicDetector(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const bundles = await getClientBundles(context);
  const findings = bundles.flatMap((bundle) => {
    const matchedRoleGating = ROLE_GATING_PATTERNS.filter(({ regex }) =>
      regex.test(bundle.text),
    ).map(({ label }) => label);
    const matchedAdminSurface = ADMIN_SURFACE_PATTERNS.filter(({ regex }) =>
      regex.test(bundle.text),
    ).map(({ label }) => label);
    const matchedStorage = STORAGE_PATTERNS.filter(({ regex }) =>
      regex.test(bundle.text),
    ).map(({ label }) => label);
    const matchedPatterns = [
      ...matchedRoleGating,
      ...matchedAdminSurface,
      ...matchedStorage,
    ];

    if (
      matchedRoleGating.length === 0 ||
      (matchedAdminSurface.length === 0 && matchedStorage.length === 0) ||
      matchedPatterns.length < 2
    ) {
      return [];
    }

    return [
      createFinding({
        category: "Client-side Authorization",
        description:
          "This bundle appears to include client-visible role gating for admin functionality. Treat this as a review signal only and verify that the same authorization is enforced server-side.",
        evidence: createEvidence([
          createEvidenceBlock("ASSET", bundle.url.pathname),
          createEvidenceBlock("MATCHED PATTERNS", matchedPatterns.join(", "), true),
        ]),
        icon: REVIEW_ICON,
        location: bundle.url.pathname,
        owasp: "OWASP A01:2021",
        severity: "low",
        title: "Potential client-side admin gating logic detected",
      }),
    ];
  });

  return {
    check: "adminLogicDetector",
    findings,
    passed: findings.length === 0,
  };
}
