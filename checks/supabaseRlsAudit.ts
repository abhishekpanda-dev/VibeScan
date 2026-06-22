import "server-only";

import { getClientBundles, getScanSurface } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
  createResponsePreview,
} from "@/lib/scanner/findings";
import type {
  ScanCheckResult,
  ScannerContext,
  ScannerSeverity,
} from "@/lib/scanner/types";

const DATABASE_ICON = "\u{1F5C4}\u{FE0F}";
const COMMON_SUPABASE_TABLES = [
  "users",
  "profiles",
  "accounts",
  "members",
  "payments",
  "orders",
  "subscriptions",
  "invoices",
  "transactions",
  "posts",
  "articles",
  "content",
  "documents",
  "files",
  "settings",
  "config",
  "secrets",
  "tokens",
  "keys",
  "scans",
  "reports",
  "findings",
  "logs",
  "events",
  "products",
  "plans",
  "features",
] as const;

const createClientPattern =
  /createClient\s*\(\s*["'](https?:\/\/[^"'`\s)]+)["']\s*,\s*["']([^"'`\s)]+)["']/gi;
const supabaseUrlPattern =
  /https:\/\/[A-Za-z0-9-]{20}\.supabase\.(?:co|in)/gi;
const jwtPattern = /\beyJ[A-Za-z0-9._-]{30,}\.[A-Za-z0-9._-]{8,}\.[A-Za-z0-9._-]{8,}\b/g;

const PII_TERMS = ["address", "dob", "email", "name", "passport", "phone", "ssn"];
const CREDENTIAL_TERMS = ["api_key", "hash", "key", "password", "secret", "token"];
const PAYMENT_TERMS = ["amount", "card", "payment", "price", "stripe"];

type SupabaseCredentials = {
  anonKey: string;
  url: URL;
};

function decodeJwtPayload(token: string) {
  const segments = token.split(".");

  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = Buffer.from(segments[1], "base64url").toString("utf8");
    const parsedPayload = JSON.parse(payload);

    if (typeof parsedPayload === "object" && parsedPayload !== null) {
      return parsedPayload as Record<string, unknown>;
    }

    return null;
  } catch {
    return null;
  }
}

function isSupabaseAnonKey(token: string) {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  const role = typeof payload.role === "string" ? payload.role.toLowerCase() : "";
  const issuer = typeof payload.iss === "string" ? payload.iss.toLowerCase() : "";

  return role === "anon" || issuer.includes("supabase");
}

function safeParseJson(responseText: string) {
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
}

function collectRowKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRowKeys(item, keys);
    }

    return keys;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nestedValue] of Object.entries(value)) {
      keys.add(key);
      collectRowKeys(nestedValue, keys);
    }
  }

  return keys;
}

function classifyFieldExposure(fieldNames: string[]) {
  const normalizedFields = fieldNames.map((fieldName) => fieldName.toLowerCase());
  const piiFields = normalizedFields.filter((fieldName) =>
    PII_TERMS.some((term) => fieldName.includes(term)),
  );
  const credentialFields = normalizedFields.filter((fieldName) =>
    CREDENTIAL_TERMS.some((term) => fieldName.includes(term)),
  );
  const paymentFields = normalizedFields.filter((fieldName) =>
    PAYMENT_TERMS.some((term) => fieldName.includes(term)),
  );
  const severity: ScannerSeverity =
    piiFields.length > 0 || credentialFields.length > 0 ? "critical" : "high";

  return {
    credentialFields: [...new Set(credentialFields)],
    paymentFields: [...new Set(paymentFields)],
    piiFields: [...new Set(piiFields)],
    severity,
  };
}

async function detectSupabaseCredentials(context: ScannerContext) {
  return context.memoize("supabase-credentials", async () => {
    const surface = await getScanSurface(context);
    const bundles = await getClientBundles(context);
    let fallbackUrl: string | null = surface.supabaseUrls[0] ?? null;
    let fallbackAnonKey: string | null = null;

    for (const bundle of bundles) {
      const createClientRegex = new RegExp(
        createClientPattern.source,
        createClientPattern.flags,
      );

      for (const match of bundle.text.matchAll(createClientRegex)) {
        const detectedUrl = match[1];
        const detectedKey = match[2];

        if (!detectedUrl || !detectedKey || !isSupabaseAnonKey(detectedKey)) {
          continue;
        }

        try {
          return {
            anonKey: detectedKey,
            url: new URL(detectedUrl),
          } satisfies SupabaseCredentials;
        } catch {
          continue;
        }
      }

      for (const match of bundle.text.matchAll(
        new RegExp(supabaseUrlPattern.source, supabaseUrlPattern.flags),
      )) {
        if (!fallbackUrl) {
          fallbackUrl = match[0];
        }
      }

      for (const match of bundle.text.matchAll(
        new RegExp(jwtPattern.source, jwtPattern.flags),
      )) {
        if (!fallbackAnonKey && isSupabaseAnonKey(match[0])) {
          fallbackAnonKey = match[0];
        }
      }
    }

    if (!fallbackUrl || !fallbackAnonKey) {
      return null;
    }

    try {
      return {
        anonKey: fallbackAnonKey,
        url: new URL(fallbackUrl),
      } satisfies SupabaseCredentials;
    } catch {
      return null;
    }
  });
}

function extractTableNamesFromDiscovery(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const paths =
    "paths" in payload && typeof payload.paths === "object" && payload.paths !== null
      ? (payload.paths as Record<string, unknown>)
      : null;

  if (!paths) {
    return [];
  }

  return Object.keys(paths)
    .map((pathName) => pathName.replace(/^\/+/, "").split("/")[0] ?? "")
    .filter(Boolean);
}

async function discoverTableNames(
  context: ScannerContext,
  credentials: SupabaseCredentials,
) {
  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${credentials.anonKey}`,
    apikey: credentials.anonKey,
  };

  try {
    const response = await context.fetchText(new URL("/rest/v1/", credentials.url), {
      headers,
      maxBytes: 512_000,
      timeoutMs: 10_000,
    });
    const parsedPayload = safeParseJson(response.text);
    const discoveredTables = extractTableNamesFromDiscovery(parsedPayload);

    return [...new Set([...COMMON_SUPABASE_TABLES, ...discoveredTables])];
  } catch {
    return [...COMMON_SUPABASE_TABLES];
  }
}

function classifyTableExposure(tableName: string, responseText: string) {
  const parsedValue = safeParseJson(responseText);

  if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
    return null;
  }

  const rowKeys = Array.from(collectRowKeys(parsedValue)).sort();
  const fieldExposure = classifyFieldExposure(rowKeys);
  const dataExposed = rowKeys.slice(0, 16).join(", ");
  const reason =
    fieldExposure.severity === "critical"
      ? `Anon access returned rows from ${tableName} with sensitive fields: ${dataExposed}.`
      : `Anon access returned rows from ${tableName}. The sample fields were: ${dataExposed}.`;

  return {
    dataExposed,
    preview: createResponsePreview(parsedValue, 320),
    reason,
    severity: fieldExposure.severity,
  };
}

export async function supabaseRlsAudit(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const credentials = await detectSupabaseCredentials(context);

  if (!credentials) {
    return {
      check: "supabaseRlsAudit",
      findings: [],
      passed: true,
    };
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${credentials.anonKey}`,
    apikey: credentials.anonKey,
  };
  const tableNames = await discoverTableNames(context, credentials);
  const findings = [];

  for (const tableName of tableNames) {
    const probeUrl = new URL(
      `/rest/v1/${tableName}?select=*&limit=3`,
      credentials.url,
    );
    const response = await context.fetchText(probeUrl, {
      headers,
      maxBytes: 32_768,
      timeoutMs: 10_000,
    });

    if (response.status !== 200) {
      continue;
    }

    const exposure = classifyTableExposure(tableName, response.text);

    if (!exposure) {
      continue;
    }

    findings.push(
      createFinding({
        category: "Supabase RLS",
        cvssScore:
          exposure.severity === "critical" ? "9.1 / Critical" : "7.4 / High",
        dataExposed: exposure.dataExposed,
        description:
          "An unauthenticated request using the public Supabase anon key returned real table rows, which suggests row-level security is absent or too permissive for this data.",
        evidence: createEvidence([
          createEvidenceBlock("REQUEST", `GET /rest/v1/${tableName}?select=*&limit=3`),
          createEvidenceBlock("STATUS", `${response.status} OK`, true),
          createEvidenceBlock("FIELDS", exposure.dataExposed || "[none]", true),
          createEvidenceBlock("ROWS", exposure.preview),
        ]),
        exploitability: "Trivial - one HTTP request with the public anon key",
        icon: DATABASE_ICON,
        location: `/rest/v1/${tableName}`,
        owasp: "OWASP A01:2021",
        severity: exposure.severity,
        title: `Supabase table exposed to anon-key query: ${tableName}`,
      }),
    );
  }

  return {
    check: "supabaseRlsAudit",
    findings,
    passed: findings.length === 0,
  };
}
