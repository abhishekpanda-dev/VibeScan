import "server-only";

import { getScanSurface } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
  createResponsePreview,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext, ScannerSeverity } from "@/lib/scanner/types";

const DOOR_ICON = "\u{1F6AA}";
const PROBE_DELAY_MS = 50;
const JSON_CONTENT_TYPE_PATTERN = /\b(?:application\/json|[^;]+\+json)\b/i;
const HTML_CONTENT_TYPE_PATTERN = /\btext\/html\b/i;
const COMMON_API_PATHS = [
  "/api/admin",
  "/api/admin/users",
  "/api/admin/dashboard",
  "/api/admin/settings",
  "/api/admin/stats",
  "/api/admin/logs",
  "/api/users",
  "/api/user",
  "/api/user/list",
  "/api/profile",
  "/api/profiles",
  "/api/me",
  "/api/account",
  "/api/members",
  "/api/debug",
  "/api/debug/env",
  "/api/debug/info",
  "/api/test",
  "/api/health",
  "/api/healthcheck",
  "/api/status",
  "/api/info",
  "/api/version",
  "/api/env",
  "/api/config",
  "/api/settings",
  "/api/data",
  "/api/list",
  "/api/export",
  "/api/import",
  "/api/download",
  "/api/upload",
  "/api/search",
  "/api/query",
  "/api/fetch",
  "/api/get",
  "/api/seed",
  "/api/reset",
  "/api/migrate",
  "/api/backup",
  "/api/restore",
  "/api/internal",
  "/api/private",
  "/api/secret",
  "/api/keys",
  "/api/tokens",
  "/api/webhook",
  "/api/webhooks",
  "/api/cron",
  "/api/jobs",
  "/api/tasks",
  "/api/queue",
  "/api/worker",
  "/api/payments",
  "/api/payment",
  "/api/billing",
  "/api/subscription",
  "/api/invoices",
  "/api/orders",
  "/api/ai",
  "/api/chat",
  "/api/completion",
  "/api/generate",
  "/api/prompt",
  "/api/llm",
] as const;

const STRONG_SENSITIVE_TERMS = [
  "access_token",
  "accesstoken",
  "api_key",
  "apikey",
  "authorization",
  "credential",
  "password",
  "refresh_token",
  "secret",
  "service_role",
  "session",
  "token",
] as const;

const MODERATE_SENSITIVE_TERMS = [
  "admin",
  "customer",
  "email",
  "phone",
  "profile",
  "role",
  "user",
] as const;

const SENSITIVE_ROUTE_TERMS = [
  "admin",
  "debug",
  "env",
  "config",
  "secret",
  "key",
  "token",
  "user",
  "profile",
  "payment",
  "billing",
  "order",
];

type ExposureHit = {
  matchedSignals: string[];
  method: "GET" | "POST";
  preview: string;
  reason: string;
  routePath: string;
  severity: ScannerSeverity;
  status: number;
};

function safeParseJson(responseText: string) {
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectKeySignals(
  value: unknown,
  strongSignals = new Set<string>(),
  moderateSignals = new Set<string>(),
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeySignals(item, strongSignals, moderateSignals);
    }

    return {
      moderateSignals,
      strongSignals,
    };
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedKey = normalizeKey(key);

      for (const sensitiveTerm of STRONG_SENSITIVE_TERMS) {
        if (normalizedKey.includes(normalizeKey(sensitiveTerm))) {
          strongSignals.add(key);
        }
      }

      for (const sensitiveTerm of MODERATE_SENSITIVE_TERMS) {
        if (normalizedKey.includes(normalizeKey(sensitiveTerm))) {
          moderateSignals.add(key);
        }
      }

      collectKeySignals(nestedValue, strongSignals, moderateSignals);
    }
  }

  return {
    moderateSignals,
    strongSignals,
  };
}

function hasNonEmptyPayload(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length > 0;
  }

  return false;
}

function isGenericEnvelope(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const genericKeys = new Set([
    "code",
    "documentation_url",
    "error",
    "errors",
    "message",
    "ok",
    "status",
    "success",
  ]);

  return keys.length > 0 && keys.every((key) => genericKeys.has(key));
}

function classifyRouteGroup(routePath: string) {
  if (routePath.includes("/admin")) {
    return "admin";
  }

  if (routePath.includes("/debug") || routePath.includes("/env") || routePath.includes("/config")) {
    return "debug";
  }

  if (
    routePath.includes("/user") ||
    routePath.includes("/profile") ||
    routePath.includes("/account") ||
    routePath.includes("/member")
  ) {
    return "identity";
  }

  if (
    routePath.includes("/payment") ||
    routePath.includes("/billing") ||
    routePath.includes("/order") ||
    routePath.includes("/invoice")
  ) {
    return "billing";
  }

  return "generic";
}

function classifyJsonExposure(routePath: string, parsedJson: unknown) {
  if (!hasNonEmptyPayload(parsedJson) || isGenericEnvelope(parsedJson)) {
    return null;
  }

  const { moderateSignals, strongSignals } = collectKeySignals(parsedJson);
  const strongMatches = Array.from(strongSignals).sort();
  const moderateMatches = Array.from(moderateSignals).sort();
  const routeLooksSensitive = SENSITIVE_ROUTE_TERMS.some((term) =>
    routePath.toLowerCase().includes(term),
  );

  if (strongMatches.length > 0) {
    return {
      matchedSignals: strongMatches,
      reason:
        "The response includes strong credential, secret, or session field names in a publicly accessible JSON payload.",
      severity: "critical" as const,
    };
  }

  if (Array.isArray(parsedJson) && parsedJson.length > 0 && moderateMatches.length > 0) {
    return {
      matchedSignals: moderateMatches,
      reason:
        "The response returned a non-empty JSON array with user- or data-oriented fields to an unauthenticated request.",
      severity: "high" as const,
    };
  }

  if (routeLooksSensitive && moderateMatches.length >= 2) {
    return {
      matchedSignals: moderateMatches,
      reason:
        "The response returned a non-empty JSON object on a security-sensitive route with multiple identity or role-oriented fields.",
      severity: "high" as const,
    };
  }

  return null;
}

async function probeRoute(
  context: ScannerContext,
  routePath: string,
  method: "GET" | "POST",
) {
  const routeUrl = new URL(routePath, context.targetUrl);
  const response = await context.fetchText(routeUrl, {
    body: method === "POST" ? JSON.stringify({}) : undefined,
    headers:
      method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    maxBytes: 8_192,
    method,
    timeoutMs: 5_000,
  });
  const contentType = response.headers.get("content-type");

  if (response.status !== 200 || !contentType || HTML_CONTENT_TYPE_PATTERN.test(contentType)) {
    return null;
  }

  if (!JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    return null;
  }

  const parsedJson = safeParseJson(response.text);

  if (!parsedJson) {
    return null;
  }

  const exposure = classifyJsonExposure(routePath, parsedJson);

  if (!exposure) {
    return null;
  }

  return {
    matchedSignals: exposure.matchedSignals,
    method,
    preview: createResponsePreview(parsedJson, 320),
    reason: exposure.reason,
    routePath,
    severity: exposure.severity,
    status: response.status,
  } satisfies ExposureHit;
}

function summarizeExposureGroup(groupName: string, hits: ExposureHit[]) {
  const sortedHits = [...hits].sort((left, right) =>
    left.routePath.localeCompare(right.routePath),
  );
  const highestSeverity = sortedHits.some((hit) => hit.severity === "critical")
    ? "critical"
    : "high";
  const affectedRoutes = [...new Set(sortedHits.map((hit) => hit.routePath))];
  const matchedSignals = [...new Set(sortedHits.flatMap((hit) => hit.matchedSignals))];

  return createFinding({
    category: "API Route Exposure",
    cvssScore:
      highestSeverity === "critical" ? "9.1 / Critical" : "7.4 / High",
    dataExposed: matchedSignals.join(", ") || null,
    description:
      "One or more unauthenticated API routes returned non-empty JSON with sensitive-looking fields or data structures.",
    evidence: createEvidence([
      createEvidenceBlock("ROUTES", affectedRoutes.join(", "), true),
      createEvidenceBlock(
        "METHODS",
        [...new Set(sortedHits.map((hit) => hit.method))].join(", "),
      ),
      createEvidenceBlock("REASON", sortedHits[0]?.reason ?? "Public JSON exposure.", true),
      createEvidenceBlock("SIGNALS", matchedSignals.join(", ") || "[none]"),
      createEvidenceBlock("PREVIEW", sortedHits[0]?.preview ?? "[empty]"),
    ]),
    exploitability: "Trivial - any HTTP client, no auth required",
    icon: DOOR_ICON,
    location: affectedRoutes.join(", "),
    owasp: "OWASP A01:2021",
    severity: highestSeverity,
    title:
      affectedRoutes.length === 1
        ? `Unauthenticated ${affectedRoutes[0]} route returned data`
        : `${affectedRoutes.length} unauthenticated ${groupName} routes returned data`,
  });
}

export async function apiRouteProbe(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const surface = await getScanSurface(context);
  const candidateRoutes = [...new Set([...COMMON_API_PATHS, ...surface.routeCandidates])]
    .filter((routePath) => routePath.startsWith("/api/"))
    .sort();
  const routeHits = new Map<string, ExposureHit[]>();

  for (const routePath of candidateRoutes) {
    await context.sleep(PROBE_DELAY_MS);

    for (const method of ["GET", "POST"] as const) {
      const hit = await probeRoute(context, routePath, method);

      if (!hit) {
        continue;
      }

      const groupName = classifyRouteGroup(routePath);
      const groupHits = routeHits.get(groupName) ?? [];
      groupHits.push(hit);
      routeHits.set(groupName, groupHits);
    }
  }

  const findings = [...routeHits.entries()].map(([groupName, hits]) =>
    summarizeExposureGroup(groupName, hits),
  );

  return {
    check: "apiRouteProbe",
    findings,
    passed: findings.length === 0,
  };
}
