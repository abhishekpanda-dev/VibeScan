import type {
  ScanSeveritySummary,
  SecurityRiskLevel,
} from "@/lib/scanner/types";

export const SEVERITY_PENALTIES = {
  critical: 20,
  high: 10,
  low: 2,
  medium: 5,
} as const;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateSecurityScore(summary: ScanSeveritySummary) {
  const rawScore =
    100 -
    summary.criticalCount * SEVERITY_PENALTIES.critical -
    summary.highCount * SEVERITY_PENALTIES.high -
    summary.mediumCount * SEVERITY_PENALTIES.medium -
    summary.lowCount * SEVERITY_PENALTIES.low;

  return clampScore(rawScore);
}

export function getSecurityRiskLevel(score: number): SecurityRiskLevel {
  if (score >= 90) {
    return "Secure";
  }

  if (score >= 70) {
    return "Needs Attention";
  }

  if (score >= 50) {
    return "High Risk";
  }

  return "Critical Risk";
}

export function getSecurityGrade(score: number) {
  if (score >= 90) {
    return "SECURE";
  }

  if (score >= 70) {
    return "GOOD";
  }

  if (score >= 50) {
    return "AT RISK";
  }

  if (score >= 30) {
    return "VULNERABLE";
  }

  return "CRITICAL RISK";
}
