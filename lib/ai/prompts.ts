import "server-only";

import { createFixGenerationContext } from "@/lib/report-model";
import { evidenceToText } from "@/lib/scanner/findings";
import type { PersistedFinding } from "@/lib/scanner/types";

export const SECURITY_FIX_SYSTEM_PROMPT = `You are a senior security engineer.

You specialize in:
* Next.js App Router
* Supabase
* Vercel deployments
* Authentication
* Security hardening

Write concise remediation guidance.

Format:

## Problem

Short explanation.

## Why It Matters

1-2 sentences.

## Fix

Step-by-step instructions.

## Example Code

Provide code snippets if useful.

## Files To Update

List likely files.

Maximum:

300 words.`;

type FixPromptInput = {
  finding: Pick<
    PersistedFinding,
    "category" | "description" | "evidence" | "location" | "severity" | "title"
  >;
  targetUrl: string;
};

export function buildFixUserPrompt({ finding, targetUrl }: FixPromptInput) {
  const context = createFixGenerationContext(finding, targetUrl);

  return [
    "Create remediation guidance for this VibeScan security finding.",
    "",
    `Target URL: ${targetUrl}`,
    `Affected Target: ${context.affectedTarget}`,
    `Severity: ${finding.severity}`,
    `Category: ${finding.category}`,
    `Title: ${finding.title}`,
    `Description: ${finding.description}`,
    `Evidence: ${evidenceToText(finding.evidence) ?? "None captured"}`,
    `Location: ${finding.location ?? "None captured"}`,
    `Why It Was Created: ${context.whyItWasCreated}`,
    `Risk Explanation: ${context.riskExplanation}`,
    `Impact: ${context.impact}`,
    `Technical Evidence: ${context.technicalEvidence}`,
    `Confidence: ${context.confidence.label} (${context.confidence.score}/100)`,
    `Confidence Reason: ${context.confidence.rationale}`,
    `Validation State: ${context.validationState}`,
    `OWASP: ${context.owasp.join(", ") || "Not mapped"}`,
    `CWE: ${context.cwe.join(", ") || "Not mapped"}`,
    `Reproduction Steps: ${context.reproductionSteps.join(" | ")}`,
    `Baseline Remediation Steps: ${context.remediationSteps.join(" | ")}`,
    "",
    "Requirements:",
    "- Focus on concrete implementation steps for a Next.js App Router codebase.",
    "- Prefer server-side security controls over client-side mitigations.",
    "- Mention Supabase, Vercel, cookies, headers, route handlers, middleware, or environment handling when relevant.",
    "- Return markdown only.",
  ].join("\n");
}
