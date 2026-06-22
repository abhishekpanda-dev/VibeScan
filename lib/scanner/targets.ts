import "server-only";

import { isIP } from "node:net";
import { ScanFatalError } from "@/lib/scanner/types";

const BLOCKED_HOSTNAMES = new Set([
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "localhost",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".local",
  ".localhost",
  ".supabase.co",
  ".supabase.in",
  ".vercel-internal.com",
];

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map((segment) => Number.parseInt(segment, 10));

  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function assertAllowedHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(normalizedHostname)) {
    throw new ScanFatalError(
      "Loopback and localhost targets are not allowed.",
      "blocked_target",
    );
  }

  if (
    BLOCKED_HOST_SUFFIXES.some((suffix) =>
      normalizedHostname === suffix.slice(1) || normalizedHostname.endsWith(suffix),
    )
  ) {
    throw new ScanFatalError(
      "Internal infrastructure targets are not allowed.",
      "blocked_target",
    );
  }

  const ipVersion = isIP(normalizedHostname);

  if (
    (ipVersion === 4 && isPrivateIpv4(normalizedHostname)) ||
    (ipVersion === 6 && isPrivateIpv6(normalizedHostname))
  ) {
    throw new ScanFatalError(
      "Private network targets are not allowed.",
      "blocked_target",
    );
  }
}

export function assertPublicScanTarget(value: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value.trim());
  } catch (error) {
    throw new ScanFatalError(
      "Invalid URL supplied to the scanner.",
      "invalid_url",
      error,
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new ScanFatalError(
      "Invalid URL. Only HTTPS targets are supported.",
      "invalid_url",
    );
  }

  parsedUrl.hash = "";
  assertAllowedHostname(parsedUrl.hostname);

  return parsedUrl;
}

export async function probeTargetReachability(targetUrl: URL, timeoutMs = 5_000) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(
      new ScanFatalError(
        "Target validation request timed out.",
        "request_timeout",
      ),
    );
  }, timeoutMs);

  try {
    let response = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "VibeScan/1.0 Security Scanner (contact: security@vibescan.app)",
      },
      method: "HEAD",
      redirect: "follow",
      signal: abortController.signal,
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(targetUrl, {
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "VibeScan/1.0 Security Scanner (contact: security@vibescan.app)",
        },
        method: "GET",
        redirect: "follow",
        signal: abortController.signal,
      });
    }

    if (!response.ok) {
      throw new ScanFatalError(
        `The target returned ${response.status} during validation.`,
        "unreachable_site",
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ScanFatalError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ScanFatalError(
        "Target validation request timed out.",
        "request_timeout",
        error,
      );
    }

    throw new ScanFatalError(
      "The scanner could not reach the requested target.",
      "unreachable_site",
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
