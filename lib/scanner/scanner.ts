import "server-only";

import { adminLogicDetector } from "@/checks/adminLogicDetector";
import { apiRouteProbe } from "@/checks/apiRouteProbe";
import { bundleScanner } from "@/checks/bundleScanner";
import { corsAuthAnalyzer } from "@/checks/corsAuthAnalyzer";
import { dependencyScanner } from "@/checks/dependencyScanner";
import { envFileScanner } from "@/checks/envFileScanner";
import { securityHeaders } from "@/checks/securityHeaders";
import { supabaseRlsAudit } from "@/checks/supabaseRlsAudit";
import { generateFixMarkdown } from "@/lib/ai/generateFix";
import {
  createEmptySeveritySummary,
  createEvidence,
  createEvidenceBlock,
  createFinding,
  createSeveritySummary,
  normalizeEvidenceBlocks,
} from "@/lib/scanner/findings";
import { calculateSecurityScore, getSecurityGrade, getSecurityRiskLevel } from "@/lib/scanner/securityScore";
import { assertPublicScanTarget, probeTargetReachability } from "@/lib/scanner/targets";
import {
  type FetchResponseOptions,
  type FetchResponseResult,
  type FetchTextOptions,
  type FetchTextResult,
  type PersistedFinding,
  type ScanCheckResult,
  type ScannerFinding,
  type ScannerContext,
  type ScannerPersistence,
  type ScanSeveritySummary,
  ScanFatalError,
} from "@/lib/scanner/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const FALLBACK_FIX_MARKDOWN = "Fix generation unavailable.";
const FIX_GENERATION_ATTEMPTS = 3;
const FIX_GENERATION_CONCURRENCY = 3;
const FINDINGS_BASE_COLUMNS = [
  "id",
  "scan_id",
  "category",
  "severity",
  "title",
  "description",
  "evidence",
  "location",
  "fix_markdown",
] as const;
const FINDINGS_OPTIONAL_INSERT_COLUMNS = [
  "icon",
  "owasp",
  "exploitability",
  "data_exposed",
  "cvss_score",
] as const;
const FINDINGS_REPORT_ONLY_COLUMNS = [
  "cvss_vector",
  "cwe",
  "confidence",
  "remediation",
  "affected_target",
  "source_check",
] as const;
const FINDINGS_SCHEMA_PROBE_COLUMNS = [
  ...FINDINGS_BASE_COLUMNS,
  ...FINDINGS_OPTIONAL_INSERT_COLUMNS,
  ...FINDINGS_REPORT_ONLY_COLUMNS,
  "created_at",
] as const;
const FINDINGS_ENRICHED_SCHEMA_COLUMNS = [
  ...FINDINGS_OPTIONAL_INSERT_COLUMNS,
  "created_at",
] as const;
const MAX_SCAN_DURATION_MS = 120_000;
const RATE_LIMIT_RETRY_DELAY_MS = 2_000;
const WARNING_ICON = "\u26A0\uFE0F";
const ZERO_SUMMARY = createEmptySeveritySummary();
const DEFAULT_REQUEST_HEADERS: HeadersInit = {
  Accept: "text/html,application/json,text/plain,*/*",
  "Cache-Control": "no-cache",
  "User-Agent": "VibeScan/1.0 Security Scanner (contact: security@vibescan.app)",
};

type FindingsInsertOptionalColumn = (typeof FINDINGS_OPTIONAL_INSERT_COLUMNS)[number];
type FindingsInsertRow = Database["public"]["Tables"]["findings"]["Insert"];
type FindingsSchemaInfo = {
  detectedColumns: Set<string>;
  insertableOptionalColumns: Set<FindingsInsertOptionalColumn>;
  missingColumns: string[];
  usesLegacyEvidenceText: boolean;
  verificationMode: "fallback" | "live";
};

function getNodeErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const errorCode =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "cause" in error &&
          typeof error.cause === "object" &&
          error.cause !== null &&
          "code" in error.cause &&
          typeof error.cause.code === "string"
        ? error.cause.code
        : null;

  return errorCode;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown scanner error.";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSupabaseErrorDetails(error: unknown) {
  if (!isObjectRecord(error)) {
    return {
      code: null,
      message: getErrorMessage(error),
    };
  }

  return {
    code: "code" in error && typeof error.code === "string" ? error.code : null,
    message:
      "message" in error && typeof error.message === "string"
        ? error.message
        : getErrorMessage(error),
  };
}

function isOptionalFindingsColumn(
  column: string,
): column is FindingsInsertOptionalColumn {
  return (
    FINDINGS_OPTIONAL_INSERT_COLUMNS as readonly string[]
  ).includes(column);
}

function isMissingFindingsColumnError(error: unknown) {
  const { code, message } = getSupabaseErrorDetails(error);

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("column findings.") ||
    message.includes("column of 'findings' in the schema cache")
  );
}

function extractMissingFindingsColumn(error: unknown) {
  const { message } = getSupabaseErrorDetails(error);
  const schemaCacheMatch = message.match(/'([^']+)' column of 'findings'/i);

  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  const relationMatch = message.match(/findings\.([a-z_]+)/i);

  return relationMatch?.[1] ?? null;
}

function createFallbackFindingsSchemaInfo(): FindingsSchemaInfo {
  return {
    detectedColumns: new Set(FINDINGS_BASE_COLUMNS),
    insertableOptionalColumns: new Set<FindingsInsertOptionalColumn>(),
    missingColumns: [
      ...FINDINGS_OPTIONAL_INSERT_COLUMNS,
      ...FINDINGS_REPORT_ONLY_COLUMNS,
      "created_at",
    ],
    usesLegacyEvidenceText: true,
    verificationMode: "fallback",
  };
}

function serializeLegacyEvidence(evidence: Json | null) {
  const blocks = normalizeEvidenceBlocks(evidence);

  if (blocks.length > 0) {
    return blocks
      .map((block) => `${block.label}: ${block.content}`)
      .join("\n\n");
  }

  if (typeof evidence === "string") {
    return evidence;
  }

  if (evidence === null) {
    return null;
  }

  return JSON.stringify(evidence, null, 2);
}

function createRequestSignal(parentSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();

  const abortFromParent = () => {
    controller.abort(
      parentSignal.reason ??
        new DOMException("The scan was aborted.", "AbortError"),
    );
  };

  if (parentSignal.aborted) {
    abortFromParent();
  } else {
    parentSignal.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort(
      new ScanFatalError(
        `Request timed out after ${timeoutMs}ms.`,
        "request_timeout",
      ),
    );
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);
      parentSignal.removeEventListener("abort", abortFromParent);
    },
  };
}

function createRequestError(
  target: string,
  error: unknown,
  signal: AbortSignal,
  timeoutSignal: AbortSignal,
) {
  if (signal.aborted && signal.reason instanceof Error) {
    return signal.reason;
  }

  if (timeoutSignal.aborted && timeoutSignal.reason instanceof Error) {
    return timeoutSignal.reason;
  }

  if (error instanceof ScanFatalError) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new ScanFatalError(
      `Request to ${target} timed out before it could finish.`,
      "request_timeout",
      error,
    );
  }

  const errorCode = getNodeErrorCode(error);

  if (errorCode === "ENOTFOUND") {
    return new ScanFatalError(
      `DNS lookup failed while reaching ${target}.`,
      "dns_failure",
      error,
    );
  }

  if (errorCode === "ECONNREFUSED") {
    return new ScanFatalError(
      `Connection was refused while reaching ${target}.`,
      "unreachable_site",
      error,
    );
  }

  if (errorCode === "ETIMEDOUT") {
    return new ScanFatalError(
      `Connection timed out while reaching ${target}.`,
      "request_timeout",
      error,
    );
  }

  if (
    errorCode === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    errorCode === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    errorCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    errorCode === "CERT_HAS_EXPIRED"
  ) {
    return new ScanFatalError(
      `SSL certificate issue detected while reaching ${target}.`,
      "ssl_error",
      error,
    );
  }

  return new ScanFatalError(
    `Request to ${target} failed.`,
    "request_failed",
    error,
  );
}

function mergeHeaders(headers?: HeadersInit) {
  const mergedHeaders = new Headers(DEFAULT_REQUEST_HEADERS);

  if (headers) {
    const incomingHeaders = new Headers(headers);
    incomingHeaders.forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }

  return mergedHeaders;
}

function getAbortReason(signal: AbortSignal) {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }

  return new ScanFatalError("The scan was aborted.", "scan_aborted");
}

async function readTextChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
) {
  if (signal.aborted) {
    throw getAbortReason(signal);
  }

  return new Promise<ReadableStreamReadResult<Uint8Array>>(
    (resolve, reject) => {
      const abortRead = () => {
        void reader.cancel(signal.reason).catch(() => {
          // Ignore reader cancellation failures after aborting the read.
        });
        reject(getAbortReason(signal));
      };

      signal.addEventListener("abort", abortRead, { once: true });
      reader
        .read()
        .then(resolve, reject)
        .finally(() => {
          signal.removeEventListener("abort", abortRead);
        });
    },
  );
}

async function readTextBody(
  response: Response,
  signal: AbortSignal,
  maxBytes?: number,
) {
  if (!response.body) {
    return {
      text: "",
      truncated: false,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const byteLimit =
    typeof maxBytes === "number" && maxBytes > 0
      ? maxBytes
      : Number.POSITIVE_INFINITY;
  let receivedBytes = 0;
  let text = "";
  let truncated = false;
  let shouldCancelReader = false;

  try {
    while (true) {
      const { done, value } = await readTextChunk(reader, signal);

      if (done || !value) {
        break;
      }

      const remainingBytes = byteLimit - receivedBytes;

      if (remainingBytes <= 0) {
        truncated = true;
        shouldCancelReader = true;
        break;
      }

      if (value.byteLength > remainingBytes) {
        text += decoder.decode(value.slice(0, remainingBytes), { stream: true });
        receivedBytes += remainingBytes;
        truncated = true;
        shouldCancelReader = true;
        break;
      }

      receivedBytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
  } catch (error) {
    shouldCancelReader = true;
    throw error;
  } finally {
    if (shouldCancelReader || signal.aborted) {
      try {
        await reader.cancel(signal.reason);
      } catch {
        // Ignore reader cancellation errors after we have enough bytes.
      }
    }
  }

  return {
    text,
    truncated,
  };
}

async function discardResponseBody(response: Response) {
  if (!response.body) {
    return;
  }

  try {
    await response.body.cancel();
  } catch {
    // Ignore cancellation errors when we only needed headers.
  }
}

function waitForRetry(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createScannerContext(
  targetUrl: URL,
  signal: AbortSignal,
): ScannerContext {
  const memoizedTasks = new Map<string, Promise<unknown>>();
  type FetchAttemptResult = {
    cleanup(): void;
    response: Response;
    signal: AbortSignal;
  };

  function memoize<T>(key: string, producer: () => Promise<T>) {
    if (!memoizedTasks.has(key)) {
      memoizedTasks.set(key, producer());
    }

    return memoizedTasks.get(key) as Promise<T>;
  }

  async function fetchWithRetry(
    requestUrl: string,
    options: FetchResponseOptions = {},
  ): Promise<FetchAttemptResult> {
    const {
      body,
      headers,
      method = "GET",
      timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    } = options;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const requestSignal = createRequestSignal(signal, timeoutMs);

      try {
        const response = await fetch(requestUrl, {
          body,
          cache: "no-store",
          headers: mergeHeaders(headers),
          method,
          redirect: "follow",
          signal: requestSignal.signal,
        });

        if (response.status === 429 && attempt === 1) {
          console.warn("[scanner] rate limited, retrying once", {
            requestUrl,
          });
          await discardResponseBody(response);
          requestSignal.cleanup();
          await waitForRetry(RATE_LIMIT_RETRY_DELAY_MS);
          continue;
        }

        if (response.status === 429) {
          await discardResponseBody(response);
          requestSignal.cleanup();
          throw new ScanFatalError(
            `Request to ${requestUrl} remained rate limited after retry.`,
            "rate_limited",
          );
        }

        return {
          cleanup: requestSignal.cleanup,
          response,
          signal: requestSignal.signal,
        };
      } catch (error) {
        requestSignal.cleanup();
        throw createRequestError(
          requestUrl,
          error,
          signal,
          requestSignal.signal,
        );
      }
    }
    throw new ScanFatalError(`Request to ${requestUrl} failed.`, "request_failed");
  }

  async function fetchResponse(
    input: string | URL,
    options: FetchResponseOptions = {},
  ): Promise<FetchResponseResult> {
    const requestUrl = input instanceof URL ? input.toString() : input;
    const request = await fetchWithRetry(requestUrl, options);

    try {
      return {
        headers: request.response.headers,
        ok: request.response.ok,
        status: request.response.status,
        url: request.response.url,
      };
    } finally {
      await discardResponseBody(request.response);
      request.cleanup();
    }
  }

  async function fetchText(
    input: string | URL,
    options: FetchTextOptions = {},
  ): Promise<FetchTextResult> {
    const requestUrl = input instanceof URL ? input.toString() : input;
    const request = await fetchWithRetry(requestUrl, options);

    try {
      const body = await readTextBody(
        request.response,
        request.signal,
        options.maxBytes,
      );

      return {
        headers: request.response.headers,
        ok: request.response.ok,
        status: request.response.status,
        text: body.text,
        truncated: body.truncated,
        url: request.response.url,
      };
    } catch (error) {
      throw createRequestError(
        requestUrl,
        error,
        signal,
        request.signal,
      );
    } finally {
      request.cleanup();
    }
  }

  return {
    fetchResponse,
    fetchText,
    memoize,
    sleep: waitForRetry,
    signal,
    targetUrl,
  };
}

function isFixableSeverity(
  severity: PersistedFinding["severity"],
): severity is "critical" | "high" | "medium" {
  return severity === "critical" || severity === "high" || severity === "medium";
}

async function generateFixWithRetry(
  finding: PersistedFinding,
  targetUrl: string,
) {
  let fallbackReason: unknown = null;

  for (let attempt = 1; attempt <= FIX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      return await generateFixMarkdown({
        finding,
        targetUrl,
      });
    } catch (error) {
      fallbackReason = error;
      console.error(
        `[scanner] Fix generation attempt ${attempt} failed for finding ${finding.id}`,
        error,
      );

      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("anthropic_api_key")
      ) {
        break;
      }

      if (attempt < FIX_GENERATION_ATTEMPTS) {
        await waitForRetry(attempt * 400);
      }
    }
  }

  if (fallbackReason) {
    console.error(
      `[scanner] Falling back to placeholder fix for finding ${finding.id}`,
      fallbackReason,
    );
  }

  return FALLBACK_FIX_MARKDOWN;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const nextItem = queue.shift();

      if (!nextItem) {
        return;
      }

      await worker(nextItem);
    }
  });

  await Promise.all(runners);
}

async function generateAndStoreFindingFixes(
  persistence: ScannerPersistence,
  storedFindings: PersistedFinding[],
  targetUrl: string,
) {
  await runWithConcurrency(
    storedFindings.filter((finding) => isFixableSeverity(finding.severity)),
    FIX_GENERATION_CONCURRENCY,
    async (finding) => {
      const fixMarkdown = await generateFixWithRetry(finding, targetUrl);

      try {
        await persistence.updateFindingFix(finding.id, fixMarkdown);
      } catch (error) {
        console.error(
          `[scanner] Unable to store fix markdown for finding ${finding.id}`,
          error,
        );
      }
    },
  );
}

async function verifyFindingsSchema(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<FindingsSchemaInfo> {
  try {
    const probeResults = await Promise.all(
      FINDINGS_SCHEMA_PROBE_COLUMNS.map(async (column) => {
        const { error } = await supabase
          .from("findings")
          .select(column)
          .limit(0);

        return {
          column,
          error,
          exists: !error,
        };
      }),
    );
    const detectedColumns = new Set(
      probeResults
        .filter((result) => result.exists)
        .map((result) => result.column),
    );
    const missingColumns = probeResults
      .filter((result) => !result.exists)
      .map((result) => result.column);
    const insertableOptionalColumns = new Set<FindingsInsertOptionalColumn>(
      FINDINGS_OPTIONAL_INSERT_COLUMNS.filter((column) =>
        detectedColumns.has(column),
      ),
    );
    const usesLegacyEvidenceText = !FINDINGS_ENRICHED_SCHEMA_COLUMNS.every(
      (column) => detectedColumns.has(column),
    );
    const schemaInfo: FindingsSchemaInfo = {
      detectedColumns,
      insertableOptionalColumns,
      missingColumns,
      usesLegacyEvidenceText,
      verificationMode: "live",
    };

    console.info("[scanner.persistence] findings schema detected", {
      detectedColumns: [...detectedColumns].sort(),
      insertableOptionalColumns: [...insertableOptionalColumns].sort(),
      legacyEvidenceTextMode: usesLegacyEvidenceText,
      missingColumns,
      reportOnlyColumnsMissing: FINDINGS_REPORT_ONLY_COLUMNS.filter((column) =>
        missingColumns.includes(column),
      ),
      verificationMode: schemaInfo.verificationMode,
    });

    return schemaInfo;
  } catch (error) {
    const fallbackSchemaInfo = createFallbackFindingsSchemaInfo();

    console.warn(
      "[scanner.persistence] findings schema verification failed; using legacy-compatible fallback",
      {
        detectedColumns: [...fallbackSchemaInfo.detectedColumns].sort(),
        fallbackReason: getErrorMessage(error),
        insertableOptionalColumns: [
          ...fallbackSchemaInfo.insertableOptionalColumns,
        ].sort(),
        legacyEvidenceTextMode: fallbackSchemaInfo.usesLegacyEvidenceText,
        missingColumns: fallbackSchemaInfo.missingColumns,
        verificationMode: fallbackSchemaInfo.verificationMode,
      },
    );

    return fallbackSchemaInfo;
  }
}

function buildFindingsInsertRows(
  scanId: string,
  findings: ScannerFinding[],
  schemaInfo: FindingsSchemaInfo,
): FindingsInsertRow[] {
  return findings.map((finding) => {
    const row: FindingsInsertRow = {
      category: finding.category,
      description: finding.description,
      scan_id: scanId,
      severity: finding.severity,
      title: finding.title,
    };

    if (schemaInfo.detectedColumns.has("evidence")) {
      row.evidence = schemaInfo.usesLegacyEvidenceText
        ? serializeLegacyEvidence(finding.evidence)
        : finding.evidence;
    }

    if (schemaInfo.detectedColumns.has("location")) {
      row.location = finding.location;
    }

    if (schemaInfo.detectedColumns.has("fix_markdown")) {
      row.fix_markdown = null;
    }

    if (schemaInfo.insertableOptionalColumns.has("icon")) {
      row.icon = finding.icon ?? null;
    }

    if (schemaInfo.insertableOptionalColumns.has("owasp")) {
      row.owasp = finding.owasp ?? null;
    }

    if (schemaInfo.insertableOptionalColumns.has("exploitability")) {
      row.exploitability = finding.exploitability ?? null;
    }

    if (schemaInfo.insertableOptionalColumns.has("data_exposed")) {
      row.data_exposed = finding.dataExposed ?? null;
    }

    if (schemaInfo.insertableOptionalColumns.has("cvss_score")) {
      row.cvss_score = finding.cvssScore ?? null;
    }

    return row;
  });
}

function mapPersistedFindings(data: unknown[]): PersistedFinding[] {
  return data.map((finding) => {
    const row = finding as Record<string, unknown>;

    return {
      category:
        typeof row.category === "string" ? row.category : "Unknown category",
      cvssScore:
        typeof row.cvss_score === "string" || row.cvss_score === null
          ? row.cvss_score
          : null,
      dataExposed:
        typeof row.data_exposed === "string" || row.data_exposed === null
          ? row.data_exposed
          : null,
      description:
        typeof row.description === "string"
          ? row.description
          : "Finding description unavailable.",
      evidence: (row.evidence as Json | null | undefined) ?? null,
      exploitability:
        typeof row.exploitability === "string" || row.exploitability === null
          ? row.exploitability
          : null,
      fixMarkdown:
        typeof row.fix_markdown === "string" || row.fix_markdown === null
          ? row.fix_markdown
          : null,
      icon:
        typeof row.icon === "string" || row.icon === null ? row.icon : null,
      id: typeof row.id === "string" ? row.id : "",
      location:
        typeof row.location === "string" || row.location === null
          ? row.location
          : null,
      owasp:
        typeof row.owasp === "string" || row.owasp === null ? row.owasp : null,
      scanId: typeof row.scan_id === "string" ? row.scan_id : "",
      severity:
        typeof row.severity === "string"
          ? (row.severity as PersistedFinding["severity"])
          : "low",
      title: typeof row.title === "string" ? row.title : "Untitled finding",
    };
  });
}

export function createSupabasePersistence(): ScannerPersistence {
  const supabase = createSupabaseAdminClient();
  let findingsSchemaInfoPromise: Promise<FindingsSchemaInfo> | null = null;

  function getFindingsSchemaInfo(forceRefresh = false) {
    if (forceRefresh || findingsSchemaInfoPromise === null) {
      findingsSchemaInfoPromise = verifyFindingsSchema(supabase);
    }

    return findingsSchemaInfoPromise;
  }

  return {
    async clearFindings(scanId) {
      const { error } = await supabase
        .from("findings")
        .delete()
        .eq("scan_id", scanId);

      if (error) {
        throw new Error(error.message);
      }
    },
    async insertFindings(scanId, findings) {
      if (findings.length === 0) {
        return [];
      }

      console.info("[scanner.persistence] before insertFindings", {
        findingsCount: findings.length,
        findingTitles: findings.map((finding) => finding.title),
        scanId,
      });
      let schemaInfo = await getFindingsSchemaInfo();
      let insertRows = buildFindingsInsertRows(scanId, findings, schemaInfo);

      console.info("[scanner.persistence] insert payload prepared", {
        insertableColumns: [
          ...FINDINGS_BASE_COLUMNS.filter((column) => column !== "id"),
          ...schemaInfo.insertableOptionalColumns,
        ],
        legacyEvidenceTextMode: schemaInfo.usesLegacyEvidenceText,
        scanId,
        verificationMode: schemaInfo.verificationMode,
      });

      let { data, error } = await supabase
        .from("findings")
        .insert(insertRows)
        .select("*");

      if (error && isMissingFindingsColumnError(error)) {
        const missingColumn = extractMissingFindingsColumn(error);

        console.warn("[scanner.persistence] findings insert schema mismatch", {
          error: getSupabaseErrorDetails(error).message,
          missingColumn,
          scanId,
        });

        if (missingColumn && isOptionalFindingsColumn(missingColumn)) {
          schemaInfo = await getFindingsSchemaInfo(true);
          schemaInfo.insertableOptionalColumns.delete(missingColumn);
          schemaInfo.detectedColumns.delete(missingColumn);
          schemaInfo.missingColumns = [
            ...new Set([...schemaInfo.missingColumns, missingColumn]),
          ];
          schemaInfo.usesLegacyEvidenceText =
            schemaInfo.usesLegacyEvidenceText ||
            FINDINGS_ENRICHED_SCHEMA_COLUMNS.includes(missingColumn);
          insertRows = buildFindingsInsertRows(scanId, findings, schemaInfo);

          console.warn(
            "[scanner.persistence] retrying findings insert without missing optional column",
            {
              insertableColumns: [
                ...FINDINGS_BASE_COLUMNS.filter((column) => column !== "id"),
                ...schemaInfo.insertableOptionalColumns,
              ],
              legacyEvidenceTextMode: schemaInfo.usesLegacyEvidenceText,
              missingColumn,
              scanId,
            },
          );

          ({ data, error } = await supabase
            .from("findings")
            .insert(insertRows)
            .select("*"));
        }
      }

      if (error) {
        throw new Error(error.message);
      }

      console.info("[scanner.persistence] findings inserted", {
        insertedFindingsCount: data?.length ?? 0,
        insertedScanId: scanId,
        returnedScanIds: [
          ...new Set(
            (data ?? []).map((finding) =>
              isObjectRecord(finding) && typeof finding.scan_id === "string"
                ? finding.scan_id
                : null,
            ),
          ),
        ].filter((value): value is string => value !== null),
      });

      return mapPersistedFindings(data ?? []);
    },
    async updateFindingFix(findingId, fixMarkdown) {
      const schemaInfo = await getFindingsSchemaInfo();

      if (!schemaInfo.detectedColumns.has("fix_markdown")) {
        console.warn(
          "[scanner.persistence] skipping fix_markdown update because the column is missing in the live findings schema",
          {
            findingId,
          },
        );
        return;
      }

      const { error } = await supabase
        .from("findings")
        .update({
          fix_markdown: fixMarkdown,
        })
        .eq("id", findingId);

      if (error) {
        throw new Error(error.message);
      }
    },
    async updateScan(scanId, update) {
      const { error } = await supabase
        .from("scans")
        .update({
          completed_at: update.completedAt,
          critical_count: update.criticalCount ?? ZERO_SUMMARY.criticalCount,
          high_count: update.highCount ?? ZERO_SUMMARY.highCount,
          low_count: update.lowCount ?? ZERO_SUMMARY.lowCount,
          medium_count: update.mediumCount ?? ZERO_SUMMARY.mediumCount,
          pass_count: update.passCount ?? ZERO_SUMMARY.passCount,
          scan_domain: update.scanDomain,
          scan_error: update.scanError,
          security_grade: update.securityGrade,
          security_score: update.securityScore ?? 0,
          started_at: update.startedAt,
          status: update.status,
          total_findings: update.totalFindings ?? 0,
        })
        .eq("id", scanId);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

function createCheckFailureFinding(checkName: string, error: unknown) {
  const scanError = error instanceof ScanFatalError ? error : null;

  if (scanError?.code === "ssl_error") {
    return createFinding({
      category: "Transport Security",
      description:
        "The scanner encountered an SSL certificate problem while trying to audit this target.",
      evidence: createEvidence([
        createEvidenceBlock("CHECK", checkName),
        createEvidenceBlock("ERROR", getErrorMessage(error), true),
      ]),
      icon: WARNING_ICON,
      location: `check:${checkName}`,
      owasp: "OWASP A05:2021",
      severity: "medium",
      title: "SSL certificate issue detected",
    });
  }

  return createFinding({
    category: "Scanner Engine",
    description:
      "One scanner check could not complete, so the report may have partial coverage for this target.",
    evidence: createEvidence([
      createEvidenceBlock("CHECK", checkName),
      createEvidenceBlock("ERROR", getErrorMessage(error), true),
    ]),
    icon: WARNING_ICON,
    location: `check:${checkName}`,
    severity: "low",
    title: `Check skipped - ${checkName} could not complete`,
  });
}

async function markScanFailed(
  persistence: ScannerPersistence,
  scanId: string,
  errorMessage: string,
) {
  await persistence.updateScan(scanId, {
    completedAt: new Date().toISOString(),
    ...ZERO_SUMMARY,
    scanError: errorMessage,
    securityGrade: "CRITICAL RISK",
    securityScore: 0,
    status: "failed",
    totalFindings: 0,
  });
}

type RunScanOptions = {
  persistence?: ScannerPersistence;
  startedAt?: string;
};

const scanChecks = [
  { name: "bundleScanner", run: bundleScanner },
  { name: "dependencyScanner", run: dependencyScanner },
  { name: "securityHeaders", run: securityHeaders },
  { name: "envFileScanner", run: envFileScanner },
  { name: "supabaseRlsAudit", run: supabaseRlsAudit },
  { name: "apiRouteProbe", run: apiRouteProbe },
  { name: "adminLogicDetector", run: adminLogicDetector },
  { name: "corsAuthAnalyzer", run: corsAuthAnalyzer },
] as const;

export async function runScan(
  scanId: string,
  url: string,
  options: RunScanOptions = {},
) {
  let persistence: ScannerPersistence | null = options.persistence ?? null;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(
      new ScanFatalError(
        "The scan exceeded the 120 second maximum duration.",
        "scan_timeout",
      ),
    );
  }, MAX_SCAN_DURATION_MS);

  let targetUrl: URL | null = null;
  const startedAt = options.startedAt ?? new Date().toISOString();

  try {
    console.info("[scanner] runScan entry", {
      requestedStartedAt: startedAt,
      scanId,
      url,
    });

    persistence ??= createSupabasePersistence();
    targetUrl = assertPublicScanTarget(url);
    await probeTargetReachability(targetUrl);

    await persistence.updateScan(scanId, {
      completedAt: null,
      ...ZERO_SUMMARY,
      scanDomain: targetUrl.origin,
      scanError: null,
      securityGrade: null,
      securityScore: 0,
      startedAt,
      status: "running",
      totalFindings: 0,
    });

    console.info("[scanner] status updated to running", {
      scanDomain: targetUrl.origin,
      scanId,
      startedAt,
      status: "running",
    });

    console.info("[scanner] started", {
      scanId,
      url: targetUrl.toString(),
    });

    await persistence.clearFindings(scanId);
    const context = createScannerContext(targetUrl, abortController.signal);
    const checkResults: ScanCheckResult[] = [];
    const storedFindings: PersistedFinding[] = [];

    for (const check of scanChecks) {
      try {
        console.info("[scanner] before check executes", {
          check: check.name,
          scanId,
          url: targetUrl.toString(),
        });

        const result = await check.run(context);
        checkResults.push(result);

        console.info("[scanner] check completed", {
          check: result.check,
          findingTitles: result.findings.map((finding) => finding.title),
          findingsCount: result.findings.length,
          passed: result.passed,
          scanId,
          url: targetUrl.toString(),
        });

        if (result.findings.length > 0) {
          console.info("[scanner] before insertFindings", {
            check: result.check,
            findingsCount: result.findings.length,
            scanId,
          });

          const insertedFindings = await persistence.insertFindings(
            scanId,
            result.findings,
          );

          console.info("[scanner] after insertFindings", {
            check: result.check,
            insertedFindingsCount: insertedFindings.length,
            scanId,
          });

          storedFindings.push(...insertedFindings);
        }
      } catch (error) {
        console.error("[scanner] check failed", {
          check: check.name,
          error,
          scanId,
          url: targetUrl.toString(),
        });

        const failureFinding = createCheckFailureFinding(check.name, error);
        const failureResult: ScanCheckResult = {
          check: check.name,
          findings: [failureFinding],
          passed: false,
        };

        checkResults.push(failureResult);
        console.info("[scanner] before insertFindings", {
          check: check.name,
          findingsCount: 1,
          scanId,
        });
        const insertedFindings = await persistence.insertFindings(scanId, [
          failureFinding,
        ]);
        console.info("[scanner] after insertFindings", {
          check: check.name,
          insertedFindingsCount: insertedFindings.length,
          scanId,
        });
        storedFindings.push(...insertedFindings);
      }
    }

    const findings = checkResults.flatMap((result) => result.findings);
    const summary: ScanSeveritySummary = createSeveritySummary(checkResults);
    const securityScore = calculateSecurityScore(summary);
    const securityGrade = getSecurityGrade(securityScore);
    const riskLevel = getSecurityRiskLevel(securityScore);

    console.info("[scanner] findings generated", {
      findings: findings.map((finding) => ({
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
      })),
      findingsCount: findings.length,
      scanId,
      url: targetUrl.toString(),
    });

    await generateAndStoreFindingFixes(
      persistence,
      storedFindings,
      targetUrl.toString(),
    );

    console.info("[scanner] before completion update", {
      findingsCount: findings.length,
      scanId,
      securityGrade,
      securityScore,
      summary,
      url: targetUrl.toString(),
    });

    await persistence.updateScan(scanId, {
      completedAt: new Date().toISOString(),
      ...summary,
      scanDomain: targetUrl.origin,
      scanError: null,
      securityGrade,
      securityScore,
      startedAt,
      status: "complete",
      totalFindings: findings.length,
    });

    console.info("[scanner] after completion update", {
      completedAt: "written",
      findingsCount: findings.length,
      scanId,
      securityGrade,
      securityScore,
      url: targetUrl.toString(),
    });

    console.info("[scanner] completed", {
      findingsCount: storedFindings.length,
      riskLevel,
      scanId,
      securityGrade,
      securityScore,
      summary,
      url: targetUrl.toString(),
    });

    return {
      findings,
      results: checkResults,
      riskLevel,
      securityGrade,
      securityScore,
      summary,
    };
  } catch (error) {
    const effectiveTarget = targetUrl?.toString() ?? url;

    console.error("[scanner] failed", {
      error,
      scanId,
      url: effectiveTarget,
    });

    try {
      if (persistence) {
        await markScanFailed(persistence, scanId, getErrorMessage(error));
      }
    } catch (markFailedError) {
      console.error(
        `[scanner] Unable to mark scan ${scanId} as failed`,
        markFailedError,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
