import type { Json, ScanStatus } from "@/types/database";

export type ScannerSeverity = "critical" | "high" | "medium" | "low";

export type EvidenceBlock = {
  content: string;
  highlight: boolean;
  label: string;
};

export type SecurityRiskLevel =
  | "Secure"
  | "Needs Attention"
  | "High Risk"
  | "Critical Risk";

export type ScannerFinding = {
  category: string;
  cvssScore?: string | null;
  dataExposed?: string | null;
  description: string;
  evidence: Json | null;
  exploitability?: string | null;
  icon?: string | null;
  location: string | null;
  owasp?: string | null;
  severity: ScannerSeverity;
  title: string;
};

export type PersistedFinding = ScannerFinding & {
  fixMarkdown: string | null;
  id: string;
  scanId: string;
};

export type ScanCheckName =
  | "bundleScanner"
  | "securityHeaders"
  | "envFileScanner"
  | "supabaseRlsAudit"
  | "apiRouteProbe"
  | "adminLogicDetector"
  | "corsAuthAnalyzer"
  | "dependencyScanner";

export type ScanCheckResult = {
  check: ScanCheckName;
  findings: ScannerFinding[];
  passed: boolean;
};

export type ScanSeveritySummary = {
  criticalCount: number;
  highCount: number;
  lowCount: number;
  mediumCount: number;
  passCount: number;
};

export type ScanRecordUpdate = {
  completedAt?: string | null;
  criticalCount?: number;
  highCount?: number;
  lowCount?: number;
  mediumCount?: number;
  passCount?: number;
  scanDomain?: string | null;
  scanError?: string | null;
  securityScore?: number;
  securityGrade?: string | null;
  startedAt?: string | null;
  status: ScanStatus;
  totalFindings?: number;
};

export type ScannerPersistence = {
  clearFindings(scanId: string): Promise<void>;
  insertFindings(
    scanId: string,
    findings: ScannerFinding[],
  ): Promise<PersistedFinding[]>;
  updateFindingFix(findingId: string, fixMarkdown: string): Promise<void>;
  updateScan(scanId: string, update: ScanRecordUpdate): Promise<void>;
};

export type FetchResponseOptions = {
  body?: BodyInit;
  headers?: HeadersInit;
  method?: "GET" | "HEAD" | "POST";
  timeoutMs?: number;
};

export type FetchTextOptions = FetchResponseOptions & {
  maxBytes?: number;
};

export type FetchResponseResult = {
  headers: Headers;
  ok: boolean;
  status: number;
  url: string;
};

export type FetchTextResult = FetchResponseResult & {
  text: string;
  truncated: boolean;
};

export type ClientBundleAsset = {
  filename: string;
  text: string;
  truncated: boolean;
  url: URL;
};

export type ScannerContext = {
  fetchResponse(
    input: string | URL,
    options?: FetchResponseOptions,
  ): Promise<FetchResponseResult>;
  fetchText(
    input: string | URL,
    options?: FetchTextOptions,
  ): Promise<FetchTextResult>;
  memoize<T>(key: string, producer: () => Promise<T>): Promise<T>;
  sleep(delayMs: number): Promise<void>;
  signal: AbortSignal;
  targetUrl: URL;
};

export class ScanFatalError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code = "scan_failed", cause?: unknown) {
    super(message);
    this.name = "ScanFatalError";
    this.code = code;
    this.cause = cause;
  }
}
