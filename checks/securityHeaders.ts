import "server-only";

import { getTargetDocument } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext, ScannerSeverity } from "@/lib/scanner/types";

const SHIELD_ICON = "\u{1F6E1}\u{FE0F}";

type HeaderFindingSpec = {
  description: string;
  headerName: string;
  severity: ScannerSeverity;
  title: string;
};

const requiredHeaders: HeaderFindingSpec[] = [
  {
    description:
      "No Content-Security-Policy header was present, which weakens protection against script injection and unsafe resource loading.",
    headerName: "content-security-policy",
    severity: "high",
    title: "Missing Content-Security-Policy header",
  },
  {
    description:
      "Neither X-Frame-Options nor CSP frame-ancestors was present, so the page may be vulnerable to clickjacking.",
    headerName: "x-frame-options",
    severity: "medium",
    title: "Missing clickjacking protection header",
  },
  {
    description:
      "No Strict-Transport-Security header was present, so browsers are not instructed to enforce HTTPS for future requests.",
    headerName: "strict-transport-security",
    severity: "medium",
    title: "Missing Strict-Transport-Security header",
  },
  {
    description:
      "No X-Content-Type-Options header was present, which weakens MIME sniffing protections.",
    headerName: "x-content-type-options",
    severity: "low",
    title: "Missing X-Content-Type-Options header",
  },
  {
    description:
      "No Referrer-Policy header was present, so downstream requests may receive more referrer data than intended.",
    headerName: "referrer-policy",
    severity: "low",
    title: "Missing Referrer-Policy header",
  },
  {
    description:
      "No Permissions-Policy header was present, so browser feature access is not explicitly constrained.",
    headerName: "permissions-policy",
    severity: "low",
    title: "Missing Permissions-Policy header",
  },
];

function hasHeader(value: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function hasFrameAncestorsDirective(contentSecurityPolicy: string | null) {
  if (!contentSecurityPolicy) {
    return false;
  }

  return /(?:^|;)\s*frame-ancestors\s+/i.test(contentSecurityPolicy);
}

function createHeaderFinding(
  spec: HeaderFindingSpec,
  headerValue: string | null,
  extraEvidence?: string,
) {
  return createFinding({
    category: "Security Headers",
    description: spec.description,
    evidence: createEvidence([
      createEvidenceBlock("HEADER", spec.headerName),
      createEvidenceBlock("VALUE", headerValue ?? "[missing]", !headerValue),
      createEvidenceBlock("DETAIL", extraEvidence ?? spec.description, true),
    ]),
    icon: SHIELD_ICON,
    location: `header:${spec.headerName}`,
    owasp: "OWASP A05:2021",
    severity: spec.severity,
    title: spec.title,
  });
}

export async function securityHeaders(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  let headResponse = await context.fetchResponse(context.targetUrl, {
    method: "HEAD",
    timeoutMs: 8_000,
  });

  if (headResponse.status === 405 || headResponse.status === 501) {
    headResponse = await context.fetchResponse(context.targetUrl, {
      method: "GET",
      timeoutMs: 8_000,
    });
  }

  const documentResponse = await getTargetDocument(context);
  const contentSecurityPolicy =
    headResponse.headers.get("content-security-policy") ??
    documentResponse.headers.get("content-security-policy");
  const hasClickjackingProtection =
    hasHeader(headResponse.headers.get("x-frame-options")) ||
    hasHeader(documentResponse.headers.get("x-frame-options")) ||
    hasFrameAncestorsDirective(contentSecurityPolicy);
  const findings = requiredHeaders
    .filter((spec) => {
      if (spec.title === "Missing clickjacking protection header") {
        return !hasClickjackingProtection;
      }

      return !hasHeader(
        headResponse.headers.get(spec.headerName) ??
          documentResponse.headers.get(spec.headerName),
      );
    })
    .map((spec) =>
      createHeaderFinding(
        spec,
        headResponse.headers.get(spec.headerName) ??
          documentResponse.headers.get(spec.headerName),
      ),
    );

  if (
    contentSecurityPolicy &&
    /unsafe-inline/i.test(contentSecurityPolicy) &&
    /unsafe-eval/i.test(contentSecurityPolicy)
  ) {
    findings.push(
      createHeaderFinding(
        {
          description:
            "The Content-Security-Policy includes both unsafe-inline and unsafe-eval, which substantially weakens XSS protections.",
          headerName: "content-security-policy",
          severity: "medium",
          title: "Weak Content-Security-Policy configuration",
        },
        contentSecurityPolicy,
        "The response sets CSP, but it explicitly allows both unsafe-inline and unsafe-eval.",
      ),
    );
  }

  const hstsValue =
    headResponse.headers.get("strict-transport-security") ??
    documentResponse.headers.get("strict-transport-security");

  if (hstsValue) {
    const hasLongMaxAge = /max-age=(\d+)/i.test(hstsValue)
      ? Number.parseInt(hstsValue.match(/max-age=(\d+)/i)?.[1] ?? "0", 10) >=
        31_536_000
      : false;
    const hasIncludeSubDomains = /includesubdomains/i.test(hstsValue);

    if (!hasLongMaxAge || !hasIncludeSubDomains) {
      findings.push(
        createHeaderFinding(
          {
            description:
              "The Strict-Transport-Security header is present but does not enforce a strong one-year policy with includeSubDomains.",
            headerName: "strict-transport-security",
            severity: "medium",
            title: "Weak Strict-Transport-Security configuration",
          },
          hstsValue,
          "Expected max-age >= 31536000 and includeSubDomains.",
        ),
      );
    }
  }

  return {
    check: "securityHeaders",
    findings,
    passed: findings.length === 0,
  };
}
