import "server-only";

import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
  createMaskedPreview,
  sanitizeEvidenceText,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext } from "@/lib/scanner/types";

const CONFIG_ICON = "\u{1F4C4}";
const PROBE_DELAY_MS = 200;
const probePaths = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.development",
  "/.env.example",
  "/config.json",
  "/config.js",
  "/app.config.js",
  "/.git/config",
  "/.git/HEAD",
  "/.npmrc",
  "/.netrc",
  "/wp-config.php",
  "/database.yml",
  "/secrets.json",
  "/credentials.json",
  "/api/env",
  "/api/config",
  "/api/debug/env",
  "/api/settings",
] as const;

const HTML_CONTENT_TYPE_PATTERN = /\btext\/html\b/i;
const HTML_BODY_PATTERN = /^\s*(?:<!DOCTYPE html>|<html\b)/i;
const ENV_ASSIGNMENT_PATTERN = /(?:^|\n)\s*[A-Za-z0-9_.-]{2,}\s*=\s*(?!\s*$).+/m;
const ENV_SENSITIVE_MARKER_PATTERN =
  /\b(?:API_KEY|SECRET|DATABASE_URL|TOKEN)\b/i;
const GIT_CONFIG_PATTERNS = [/\[core\]/i, /\brepositoryformatversion\b/i];
const NPMRC_ASSIGNMENT_PATTERN =
  /(?:^|\n)\s*(?:registry|always-auth|email|\/\/[^\n]+:_authToken)\s*=/i;
const NPMRC_TOKEN_PATTERN = /_authToken/i;
const PHP_CONFIG_PATTERN =
  /\$(?:table_prefix|db_(?:name|user|password|host))\s*=/i;
const YAML_SECRET_PATTERN =
  /(?:^|\n)\s*[A-Za-z0-9_.-]{2,}\s*:\s*(?:[^\n]{8,})/m;
const JSON_CONFIG_EXPECTED_KEYS = [
  "anthropic",
  "apiKey",
  "apikey",
  "config",
  "credentials",
  "databaseUrl",
  "database_url",
  "databaseurl",
  "env",
  "openai",
  "privateRuntimeConfig",
  "publicRuntimeConfig",
  "secret",
  "serviceRoleKey",
  "service_role_key",
  "supabase",
  "token",
] as const;

type ProbeValidationResult = {
  dataExposed: string | null;
  findingReason: string | null;
  severity: "critical" | "high";
};

function createBodyPreview(value: string) {
  return sanitizeEvidenceText(value.replace(/\s+/g, " ").trim()).slice(0, 200);
}

function looksLikeHtmlFallback(contentType: string | null, body: string) {
  if (contentType && HTML_CONTENT_TYPE_PATTERN.test(contentType)) {
    return true;
  }

  return HTML_BODY_PATTERN.test(body);
}

function collectJsonKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonKeys(item, keys);
    }

    return keys;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nestedValue] of Object.entries(value)) {
      keys.add(key);
      collectJsonKeys(nestedValue, keys);
    }
  }

  return keys;
}

function validateEnvText(body: string) {
  if (!ENV_ASSIGNMENT_PATTERN.test(body) || !ENV_SENSITIVE_MARKER_PATTERN.test(body)) {
    return null;
  }

  const exposedKeys = [...body.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=/gm)]
    .map((match) => match[1])
    .filter(Boolean);

  return {
    dataExposed: exposedKeys.slice(0, 8).join(", ") || null,
    findingReason:
      "Matched KEY=VALUE lines with sensitive env markers such as API_KEY, SECRET, DATABASE_URL, or TOKEN.",
  };
}

function validateGitConfigText(body: string) {
  if (!GIT_CONFIG_PATTERNS.every((pattern) => pattern.test(body))) {
    return null;
  }

  return {
    dataExposed: "git repository metadata",
    findingReason:
      "Matched Git configuration markers [core] and repositoryformatversion.",
  };
}

function validateNpmrcText(body: string) {
  if (!NPMRC_ASSIGNMENT_PATTERN.test(body) || !NPMRC_TOKEN_PATTERN.test(body)) {
    return null;
  }

  return {
    dataExposed: "npm auth token",
    findingReason: "Matched .npmrc settings with an auth token entry.",
  };
}

function validateJsonConfig(body: string) {
  try {
    const parsedValue = JSON.parse(body) as unknown;
    const discoveredKeys = Array.from(collectJsonKeys(parsedValue));
    const matchedKeys = discoveredKeys.filter((key) =>
      JSON_CONFIG_EXPECTED_KEYS.some(
        (expectedKey) => expectedKey.toLowerCase() === key.toLowerCase(),
      ),
    );

    if (matchedKeys.length === 0) {
      return null;
    }

    return {
      dataExposed: matchedKeys.sort().join(", "),
      findingReason: `Parsed JSON config with expected keys: ${matchedKeys.sort().join(", ")}.`,
    };
  } catch {
    return null;
  }
}

function validateJavaScriptConfig(body: string) {
  const keyMatches = [...body.matchAll(/(?:apiKey|secret|token|databaseUrl|serviceRoleKey)\s*[:=]/gi)]
    .map((match) => match[0].replace(/\s*[:=]\s*$/, ""))
    .filter(Boolean);

  if (keyMatches.length === 0) {
    return null;
  }

  return {
    dataExposed: [...new Set(keyMatches)].slice(0, 8).join(", "),
    findingReason:
      "Matched JavaScript config keys such as apiKey, secret, token, databaseUrl, or serviceRoleKey.",
  };
}

function validatePhpConfig(body: string) {
  if (!PHP_CONFIG_PATTERN.test(body)) {
    return null;
  }

  return {
    dataExposed: "database credentials",
    findingReason: "Matched WordPress database configuration assignments.",
  };
}

function validateYamlSecrets(body: string) {
  if (!YAML_SECRET_PATTERN.test(body) || !ENV_SENSITIVE_MARKER_PATTERN.test(body)) {
    return null;
  }

  return {
    dataExposed: "secret configuration values",
    findingReason: "Matched YAML-style secret assignments with sensitive markers.",
  };
}

function validateProbeContent(
  probePath: string,
  contentType: string | null,
  body: string,
  status: number,
): ProbeValidationResult | null {
  if (status !== 200) {
    return null;
  }

  if (looksLikeHtmlFallback(contentType, body)) {
    return null;
  }

  switch (probePath) {
    case "/.env":
    case "/.env.local":
    case "/.env.production":
    case "/.env.development":
    case "/.env.example":
    case "/api/env":
    case "/api/debug/env":
      return validateEnvText(body)
        ? {
            ...validateEnvText(body)!,
            severity: "critical",
          }
        : validateJsonConfig(body)
          ? {
              ...validateJsonConfig(body)!,
              severity: "critical",
            }
          : null;
    case "/config.json":
    case "/secrets.json":
    case "/credentials.json":
    case "/api/config":
    case "/api/settings":
      return validateJsonConfig(body)
        ? {
            ...validateJsonConfig(body)!,
            severity: "critical",
          }
        : null;
    case "/config.js":
    case "/app.config.js":
      return validateJavaScriptConfig(body)
        ? {
            ...validateJavaScriptConfig(body)!,
            severity: "critical",
          }
        : null;
    case "/.npmrc":
    case "/.netrc":
      return validateNpmrcText(body)
        ? {
            ...validateNpmrcText(body)!,
            severity: "critical",
          }
        : null;
    case "/.git/config":
      return validateGitConfigText(body)
        ? {
            ...validateGitConfigText(body)!,
            severity: "critical",
          }
        : null;
    case "/wp-config.php":
      return validatePhpConfig(body)
        ? {
            ...validatePhpConfig(body)!,
            severity: "critical",
          }
        : null;
    case "/database.yml":
      return validateYamlSecrets(body)
        ? {
            ...validateYamlSecrets(body)!,
            severity: "critical",
          }
        : null;
    default:
      return null;
  }
}

export async function envFileScanner(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  const findings = [];

  for (const probePath of probePaths) {
    await context.sleep(PROBE_DELAY_MS);
    const probeUrl = new URL(probePath, context.targetUrl);
    const response = await context.fetchText(probeUrl, {
      maxBytes: 4_096,
      timeoutMs: 4_000,
    });
    const contentType = response.headers.get("content-type");
    const validation = validateProbeContent(
      probePath,
      contentType,
      response.text,
      response.status,
    );

    console.info("[env-file-scanner] probe", {
      bodyPreview: createBodyPreview(response.text),
      contentType,
      findingGenerated: Boolean(validation),
      probePath,
      reason:
        validation?.findingReason ??
        (response.status !== 200
          ? `Skipped because status ${response.status} is not 200.`
          : looksLikeHtmlFallback(contentType, response.text)
            ? "Skipped because the response looks like an HTML fallback page."
            : "Skipped because the body did not match the validation rules for the probed file type."),
      status: response.status,
      targetUrl: context.targetUrl.toString(),
    });

    if (!validation) {
      continue;
    }

    findings.push(
      createFinding({
        category: "Environment Exposure",
        cvssScore: "9.1 / Critical",
        dataExposed: validation.dataExposed,
        description:
          "A configuration or environment file is publicly accessible and its body matches the expected content signature for that file type.",
        evidence: createEvidence([
          createEvidenceBlock("URL", probeUrl.toString()),
          createEvidenceBlock("CONTENT-TYPE", contentType ?? "[missing]"),
          createEvidenceBlock("REASON", validation.findingReason ?? "Validated exposure.", true),
          createEvidenceBlock(
            "BODY PREVIEW",
            createMaskedPreview(response.text),
            true,
          ),
        ]),
        exploitability: "Trivial - direct HTTP GET",
        icon: CONFIG_ICON,
        location: probePath,
        owasp: "OWASP A02:2021",
        severity: validation.severity,
        title: `Sensitive file exposed at ${probePath}`,
      }),
    );
  }

  return {
    check: "envFileScanner",
    findings,
    passed: findings.length === 0,
  };
}
