import "server-only";

import { getClientBundles } from "@/lib/scanner/clientBundles";
import {
  createEvidence,
  createEvidenceBlock,
  createFinding,
  createSnippetContext,
  maskMatch,
} from "@/lib/scanner/findings";
import type { ScanCheckResult, ScannerContext, ScannerSeverity } from "@/lib/scanner/types";

type BundleDetectionRule = {
  description: string;
  exploitability: string;
  id: string;
  label: string;
  owasp: string;
  regex: RegExp;
  severity: ScannerSeverity;
};

type ConfirmedBundleMatch = {
  description: string;
  exploitability: string;
  matchedValue: string;
  owasp: string;
  severity: ScannerSeverity;
  title: string;
};

const KEY_ICON = "\u{1F511}";
const JWT_CANDIDATE_PATTERN =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g;
const SERVICE_ROLE_REFERENCE_PATTERN = /service[_-]?role/i;

const detectionRules: BundleDetectionRule[] = [
  {
    description:
      "A live Stripe secret key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "stripe_live",
    label: "Stripe live secret key",
    owasp: "OWASP A02:2021",
    regex: /\bsk_live_[A-Za-z0-9]{24,}\b/g,
    severity: "critical",
  },
  {
    description:
      "A Stripe test secret key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "stripe_test",
    label: "Stripe test secret key",
    owasp: "OWASP A02:2021",
    regex: /\bsk_test_[A-Za-z0-9]{24,}\b/g,
    severity: "high",
  },
  {
    description:
      "A Stripe restricted key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "stripe_restricted",
    label: "Stripe restricted key",
    owasp: "OWASP A02:2021",
    regex: /\brk_live_[A-Za-z0-9]{24,}\b/g,
    severity: "critical",
  },
  {
    description:
      "An OpenAI API key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "openai_project",
    label: "OpenAI project API key",
    owasp: "OWASP A02:2021",
    regex: /\bsk-proj-[A-Za-z0-9_-]{50,}\b/g,
    severity: "critical",
  },
  {
    description:
      "An OpenAI API key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "openai_legacy",
    label: "OpenAI API key",
    owasp: "OWASP A02:2021",
    regex: /\bsk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}\b/g,
    severity: "critical",
  },
  {
    description:
      "An Anthropic API key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "anthropic",
    label: "Anthropic API key",
    owasp: "OWASP A02:2021",
    regex: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/g,
    severity: "critical",
  },
  {
    description:
      "A database connection string was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the credential.",
    id: "postgres",
    label: "Database connection string",
    owasp: "OWASP A02:2021",
    regex: /\bpostgres(?:ql)?:\/\/[^@\s"'`]+:[^@\s"'`]+@[^/\s"'`]+/gi,
    severity: "critical",
  },
  {
    description:
      "A MongoDB connection string was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the credential.",
    id: "mongodb",
    label: "MongoDB connection string",
    owasp: "OWASP A02:2021",
    regex: /\bmongodb(?:\+srv)?:\/\/[^@\s"'`]+:[^@\s"'`]+@/gi,
    severity: "critical",
  },
  {
    description:
      "A Redis connection string was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the credential.",
    id: "redis",
    label: "Redis connection string",
    owasp: "OWASP A02:2021",
    regex: /\bredis:\/\/:[^@\s"'`]+@/gi,
    severity: "high",
  },
  {
    description:
      "A private key block was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "private_key",
    label: "Private key material",
    owasp: "OWASP A02:2021",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
  },
  {
    description:
      "A NEXT_PUBLIC variable appears to contain a secret-like value.",
    exploitability: "Trivial - any user who loads the site can extract the value.",
    id: "next_public_secret",
    label: "Sensitive NEXT_PUBLIC variable",
    owasp: "OWASP A05:2021",
    regex:
      /NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASS)['":=\s]+['"][^\s"'`]{8,}['"]/gi,
    severity: "high",
  },
  {
    description:
      "A SendGrid API key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "sendgrid",
    label: "SendGrid API key",
    owasp: "OWASP A02:2021",
    regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g,
    severity: "high",
  },
  {
    description:
      "A Resend API key was embedded in a public client asset.",
    exploitability: "Trivial - any user who loads the site can extract the key.",
    id: "resend",
    label: "Resend API key",
    owasp: "OWASP A02:2021",
    regex: /\bre_[A-Za-z0-9_]{30,}\b/g,
    severity: "high",
  },
];

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

function classifyJwtExposure(token: string, surroundingText: string): ConfirmedBundleMatch | null {
  const payload = decodeJwtPayload(token);
  const hasServiceRoleReference = SERVICE_ROLE_REFERENCE_PATTERN.test(surroundingText);

  if (!payload) {
    return hasServiceRoleReference
      ? {
          description:
            "A JWT-like token appears near a service_role reference in a public client asset.",
          exploitability: "Trivial - any user who loads the site can extract the token.",
          matchedValue: token,
          owasp: "OWASP A02:2021",
          severity: "critical",
          title: "Potential service role token exposed in client bundle",
        }
      : null;
  }

  const role = typeof payload.role === "string" ? payload.role.toLowerCase() : "";
  const issuer = typeof payload.iss === "string" ? payload.iss.toLowerCase() : "";
  const hasSubject = typeof payload.sub === "string" && payload.sub.length > 0;
  const hasSessionClaims = ["session_id", "user_id", "email"].some((key) => key in payload);
  const looksLikeSupabaseAnonKey =
    role === "anon" || (issuer.includes("supabase") && !hasSubject && !hasSessionClaims);

  if (looksLikeSupabaseAnonKey) {
    return null;
  }

  if (role === "service_role" || hasServiceRoleReference) {
    return {
      description:
        "A privileged service-role token was embedded in a public client asset.",
      exploitability: "Trivial - any user who loads the site can extract the token.",
      matchedValue: token,
      owasp: "OWASP A02:2021",
      severity: "critical",
      title: "Supabase service role token exposed in client bundle",
    };
  }

  if (hasSubject || hasSessionClaims || role.length > 0) {
    return {
      description:
        "A non-public JWT was embedded in a public client asset.",
      exploitability: "Trivial - any user who loads the site can extract the token.",
      matchedValue: token,
      owasp: "OWASP A02:2021",
      severity: "high",
      title: "JWT or session token exposed in client bundle",
    };
  }

  return null;
}

function buildBundleFinding(
  bundleUrl: URL,
  bundleFilename: string,
  position: number,
  title: string,
  description: string,
  severity: ScannerSeverity,
  matchedValue: string,
  bundleText: string,
  owasp: string,
  exploitability: string,
) {
  return createFinding({
    category: "Bundle Exposure",
    cvssScore: severity === "critical" ? "9.1 / Critical" : "7.4 / High",
    description,
    evidence: createEvidence([
      createEvidenceBlock("ASSET", bundleUrl.pathname),
      createEvidenceBlock("MATCH", `Masked value: ${maskMatch(matchedValue)}`, true),
      createEvidenceBlock("POSITION", `Character offset ${position}`),
      createEvidenceBlock("CONTEXT", createSnippetContext(bundleText, position, matchedValue.length)),
      createEvidenceBlock("REASON", description),
    ]),
    exploitability,
    icon: KEY_ICON,
    location: `${bundleUrl.pathname}:char:${position}`,
    owasp,
    severity,
    title: `${title} in ${bundleFilename}`,
  });
}

function scanBundleText(
  bundleUrl: URL,
  bundleFilename: string,
  bundleText: string,
  seenFingerprints: Set<string>,
) {
  const findings = [];

  for (const match of bundleText.matchAll(
    new RegExp(JWT_CANDIDATE_PATTERN.source, JWT_CANDIDATE_PATTERN.flags),
  )) {
    const matchedValue = match[0];
    const position = match.index ?? 0;

    if (!matchedValue) {
      continue;
    }

    const surroundingText = bundleText.slice(
      Math.max(0, position - 200),
      Math.min(bundleText.length, position + matchedValue.length + 200),
    );
    const exposure = classifyJwtExposure(matchedValue, surroundingText);

    if (!exposure) {
      continue;
    }

    const fingerprint = `jwt:${matchedValue}`;

    if (seenFingerprints.has(fingerprint)) {
      continue;
    }

    seenFingerprints.add(fingerprint);
    findings.push(
      buildBundleFinding(
        bundleUrl,
        bundleFilename,
        position,
        exposure.title,
        exposure.description,
        exposure.severity,
        matchedValue,
        bundleText,
        exposure.owasp,
        exposure.exploitability,
      ),
    );
  }

  for (const rule of detectionRules) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);

    for (const match of bundleText.matchAll(regex)) {
      const matchedValue = match[0];
      const position = match.index ?? 0;

      if (!matchedValue) {
        continue;
      }

      const fingerprint = `${rule.id}:${matchedValue}`;

      if (seenFingerprints.has(fingerprint)) {
        continue;
      }

      seenFingerprints.add(fingerprint);
      findings.push(
        buildBundleFinding(
          bundleUrl,
          bundleFilename,
          position,
          rule.label,
          rule.description,
          rule.severity,
          matchedValue,
          bundleText,
          rule.owasp,
          rule.exploitability,
        ),
      );
    }
  }

  return findings;
}

export async function bundleScanner(
  context: ScannerContext,
): Promise<ScanCheckResult> {
  console.info("[bundleScanner] entry", {
    targetUrl: context.targetUrl.toString(),
  });

  const bundles = await getClientBundles(context);

  console.info("[bundleScanner] bundles loaded", {
    bundleCount: bundles.length,
    bundleFilenames: bundles.map((bundle) => bundle.filename),
    targetUrl: context.targetUrl.toString(),
  });

  if (bundles.length === 0) {
    console.info("[bundleScanner] before return", {
      findingsCount: 0,
      passed: true,
      targetUrl: context.targetUrl.toString(),
    });

    return {
      check: "bundleScanner",
      findings: [],
      passed: true,
    };
  }

  const seenFingerprints = new Set<string>();
  const findings = bundles.flatMap((bundle) =>
    scanBundleText(bundle.url, bundle.filename, bundle.text, seenFingerprints),
  );
  const result = {
    check: "bundleScanner" as const,
    findings,
    passed: findings.length === 0,
  };

  console.info("[bundleScanner] before return", {
    findingTitles: findings.map((finding) => finding.title),
    findingsCount: findings.length,
    passed: result.passed,
    targetUrl: context.targetUrl.toString(),
  });

  return result;
}
