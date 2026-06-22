import type {
  ScanCheckResult,
  EvidenceBlock,
  ScannerFinding,
  ScanSeveritySummary,
} from "@/lib/scanner/types";
import type { Json } from "@/types/database";

const DEFAULT_SUMMARY: ScanSeveritySummary = {
  criticalCount: 0,
  highCount: 0,
  lowCount: 0,
  mediumCount: 0,
  passCount: 0,
};

const SENSITIVE_EVIDENCE_PATTERNS = [
  /eyJ[A-Za-z0-9._-]{30,}/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]+\b/gi,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  /\b(?:postgres(?:ql)?|mysql):\/\/\S+/gi,
];

const SENSITIVE_JSON_KEYS = [
  "admin",
  "apiKey",
  "authorization",
  "email",
  "key",
  "secret",
  "token",
  "user",
];

function clamp(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function createFinding(finding: ScannerFinding) {
  return finding;
}

export function createEvidenceBlock(
  label: string,
  content: string,
  highlight = false,
): EvidenceBlock {
  return {
    content: sanitizeEvidenceText(content),
    highlight,
    label,
  };
}

export function createEvidence(blocks: EvidenceBlock[]): Json {
  return blocks;
}

export function createEmptySeveritySummary(): ScanSeveritySummary {
  return { ...DEFAULT_SUMMARY };
}

export function createSeveritySummary(
  checkResults: ScanCheckResult[],
): ScanSeveritySummary {
  return checkResults.reduce<ScanSeveritySummary>((summary, checkResult) => {
    if (checkResult.passed) {
      summary.passCount += 1;
    }

    for (const finding of checkResult.findings) {
      switch (finding.severity) {
        case "critical":
          summary.criticalCount += 1;
          break;
        case "high":
          summary.highCount += 1;
          break;
        case "medium":
          summary.mediumCount += 1;
          break;
        case "low":
          summary.lowCount += 1;
          break;
      }
    }

    return summary;
  }, createEmptySeveritySummary());
}

export function maskMatch(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= 8) {
    return "****";
  }

  return `${trimmedValue.slice(0, 4)}...${trimmedValue.slice(-4)}`;
}

export function isEvidenceBlockArray(value: Json | null): value is EvidenceBlock[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "label" in item &&
      typeof item.label === "string" &&
      "content" in item &&
      typeof item.content === "string" &&
      "highlight" in item &&
      typeof item.highlight === "boolean",
  );
}

function maskEmail(value: string) {
  const [localPart = "", domain = ""] = value.split("@");

  if (!domain) {
    return maskMatch(value);
  }

  const visibleLocalPart = localPart.slice(0, Math.min(2, localPart.length));
  return `${visibleLocalPart}***@${domain}`;
}

export function sanitizeEvidenceText(value: string) {
  return SENSITIVE_EVIDENCE_PATTERNS.reduce((sanitizedValue, pattern) => {
    return sanitizedValue.replace(pattern, (match) => maskMatch(match));
  }, value);
}

export function normalizeEvidenceBlocks(evidence: Json | null): EvidenceBlock[] {
  if (isEvidenceBlockArray(evidence)) {
    return evidence.map((block) => ({
      content: sanitizeEvidenceText(block.content),
      highlight: Boolean(block.highlight),
      label: block.label,
    }));
  }

  if (typeof evidence === "string" && evidence.trim()) {
    return [createEvidenceBlock("EVIDENCE", evidence)];
  }

  return [];
}

export function evidenceToText(evidence: Json | null, maxLength = 600) {
  const blocks = normalizeEvidenceBlocks(evidence);

  if (blocks.length === 0) {
    return null;
  }

  const formatted = blocks
    .map((block) => `${block.label}: ${block.content}`)
    .join(" | ");

  return clamp(formatted, maxLength);
}

function maskSensitiveScalar(key: string, value: string) {
  if (!value.trim()) {
    return value;
  }

  if (value.includes("@")) {
    return maskEmail(value);
  }

  const normalizedKey = key.toLowerCase();

  if (
    SENSITIVE_JSON_KEYS.some((sensitiveKey) =>
      normalizedKey.includes(sensitiveKey.toLowerCase()),
    )
  ) {
    return maskMatch(value);
  }

  return sanitizeEvidenceText(value);
}

function maskConfigLine(line: string) {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return null;
  }

  const equalSignIndex = trimmedLine.indexOf("=");

  if (equalSignIndex > 0) {
    const key = trimmedLine.slice(0, equalSignIndex).trim();
    const value = trimmedLine.slice(equalSignIndex + 1).trim();
    return `${key}=${value ? maskMatch(value) : "[empty]"}`;
  }

  const colonIndex = trimmedLine.indexOf(":");

  if (colonIndex > 0 && colonIndex < 60) {
    const key = trimmedLine.slice(0, colonIndex).trim();
    const value = trimmedLine
      .slice(colonIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    return `${key}: ${value ? maskMatch(value) : "[empty]"}`;
  }

  return clamp(trimmedLine, 120);
}

export function createMaskedPreview(content: string, maxLength = 220) {
  const normalized = content.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map(maskConfigLine)
    .filter((line): line is string => Boolean(line))
    .slice(0, 4);

  if (lines.length === 0) {
    return "[empty response]";
  }

  return clamp(lines.join(" | "), maxLength);
}

export function createSnippetContext(
  content: string,
  startIndex: number,
  matchLength: number,
  radius = 140,
) {
  const safeStart = Math.max(0, startIndex - radius);
  const safeEnd = Math.min(content.length, startIndex + matchLength + radius);
  const prefix = safeStart > 0 ? "..." : "";
  const suffix = safeEnd < content.length ? "..." : "";
  const snippet = content.slice(safeStart, safeEnd).replace(/\s+/g, " ").trim();

  return `${prefix}${sanitizeEvidenceText(snippet)}${suffix}`;
}

function sanitizeJsonValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    return clamp(maskSensitiveScalar(key, value), 120);
  }

  return value;
}

export function createResponsePreview(payload: unknown, maxLength = 220) {
  if (typeof payload === "string") {
    return clamp(
      sanitizeEvidenceText(payload.replace(/\s+/g, " ").trim()),
      maxLength,
    );
  }

  try {
    const serialized = JSON.stringify(payload, (key, value) =>
      sanitizeJsonValue(key, value),
    );

    return clamp(sanitizeEvidenceText(serialized), maxLength);
  } catch {
    return "[unserializable response]";
  }
}

export function getBundleFilename(bundleUrl: URL) {
  const pathSegments = bundleUrl.pathname.split("/").filter(Boolean);
  return pathSegments[pathSegments.length - 1] ?? bundleUrl.hostname;
}
