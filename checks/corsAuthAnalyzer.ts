import "server-only";

import { getClientBundles, getScanSurface } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext } from "@/lib/scanner/types";

const CORS_ICON = "\u{1F310}";
const LOCAL_STORAGE_TOKEN_PATTERN =
  /localStorage\.setItem\(\s*["'](?:token|jwt|auth|accessToken|refreshToken)["']/gi;

function createCorsFinding(
  title: string,
  description: string,
  severity: "critical" | "high",
  routePath: string,
  allowOrigin: string | null,
  allowCredentials: string | null,
) {
  return createFinding({
    category: "CORS & Auth",
    description,
    evidence: createEvidence([
      createEvidenceBlock("ROUTE", routePath),
      createEvidenceBlock("Access-Control-Allow-Origin", allowOrigin ?? "[missing]", true),
      createEvidenceBlock(
        "Access-Control-Allow-Credentials",
        allowCredentials ?? "[missing]",
        allowCredentials === "true",
      ),
    ]),
    icon: CORS_ICON,
    location: routePath,
    owasp: "OWASP A05:2021",
    severity,
    title,
  });
}

export async function corsAuthAnalyzer(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const findings = [];
  const surface = await getScanSurface(context);
  const apiRoute =
    surface.routeCandidates.find((routePath) => routePath.startsWith("/api/")) ??
    "/api/health";
  const probeUrl = new URL(apiRoute, context.targetUrl);
  const response = await context.fetchResponse(probeUrl, {
    headers: {
      Origin: "https://evil.com",
    },
    method: "GET",
    timeoutMs: 8_000,
  });
  const allowOrigin = response.headers.get("access-control-allow-origin")?.trim() ?? null;
  const allowCredentials =
    response.headers.get("access-control-allow-credentials")?.trim().toLowerCase() ?? null;

  if (allowOrigin === "*" && allowCredentials === "true") {
    findings.push(
      createCorsFinding(
        "Wildcard CORS with credentials enabled",
        "The response combines a wildcard CORS origin with credential support, which allows cross-origin browsers to send authenticated requests in an unsafe way.",
        "critical",
        apiRoute,
        allowOrigin,
        allowCredentials,
      ),
    );
  } else if (allowOrigin === "*" || allowOrigin === "https://evil.com") {
    findings.push(
      createCorsFinding(
        "Overly permissive CORS policy detected",
        "The response allows any origin or reflects an untrusted origin during a CORS probe, which can broaden cross-origin access more than intended.",
        "high",
        apiRoute,
        allowOrigin,
        allowCredentials,
      ),
    );
  }

  const bundles = await getClientBundles(context);

  for (const bundle of bundles) {
    const matches = Array.from(
      bundle.text.matchAll(
        new RegExp(
          LOCAL_STORAGE_TOKEN_PATTERN.source,
          LOCAL_STORAGE_TOKEN_PATTERN.flags,
        ),
      ),
    );

    if (matches.length === 0) {
      continue;
    }

    findings.push(
      createFinding({
        category: "CORS & Auth",
        description:
          "This asset appears to store authentication material in localStorage. That is not always a vulnerability by itself, but it increases the impact of any client-side script injection issue.",
        evidence: createEvidence([
          createEvidenceBlock("ASSET", bundle.url.pathname),
          createEvidenceBlock(
            "MATCHES",
            matches.map((match) => match[0]).join(", "),
            true,
          ),
        ]),
        icon: CORS_ICON,
        location: bundle.url.pathname,
        owasp: "OWASP A07:2021",
        severity: "low",
        title: "Potential auth token storage in localStorage",
      }),
    );
  }

  return {
    check: "corsAuthAnalyzer",
    findings,
    passed: findings.length === 0,
  };
}
