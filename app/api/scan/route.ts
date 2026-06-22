import { after } from "next/server";
import { runScan } from "@/lib/scanner/scanner";
import { assertPublicScanTarget, probeTargetReachability } from "@/lib/scanner/targets";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ScanRouteRequestBody = {
  scanId?: string;
  url?: string;
};

function createJsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
  });
}

function normalizeComparableUrl(value: string) {
  const parsedUrl = new URL(value);
  parsedUrl.hash = "";
  return parsedUrl.toString();
}

export async function POST(request: Request) {
  console.info("[scan.api] entry", {
    requestUrl: request.url,
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return createJsonResponse(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  let body: ScanRouteRequestBody;

  try {
    body = (await request.json()) as ScanRouteRequestBody;
  } catch {
    return createJsonResponse(
      {
        error: "Invalid JSON body.",
      },
      400,
    );
  }

  const submittedUrl = body.url?.trim() ?? "";
  const scanId = body.scanId?.trim() ?? "";

  if (!submittedUrl || !scanId) {
    return createJsonResponse(
      {
        error: "Both url and scanId are required.",
      },
      400,
    );
  }

  let targetUrl: URL;

  try {
    targetUrl = assertPublicScanTarget(submittedUrl);
    await probeTargetReachability(targetUrl);
  } catch (error) {
    return createJsonResponse(
      {
        error: error instanceof Error ? error.message : "Invalid scan target.",
      },
      400,
    );
  }

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("id, status, url")
    .eq("id", scanId)
    .maybeSingle();

  if (scanError) {
    return createJsonResponse(
      {
        error: scanError.message,
      },
      500,
    );
  }

  if (!scan) {
    return createJsonResponse(
      {
        error: "Scan not found.",
      },
      404,
    );
  }

  if (scan.status !== "pending" && scan.status !== "failed") {
    return createJsonResponse(
      {
        error: `Scan ${scanId} is already ${scan.status}.`,
      },
      409,
    );
  }

  const existingUrl = normalizeComparableUrl(scan.url.trim());
  const requestedUrl = normalizeComparableUrl(submittedUrl);

  if (existingUrl !== requestedUrl) {
    return createJsonResponse(
      {
        error: "The provided URL does not match the stored scan target.",
      },
      400,
    );
  }

  const startedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("scans")
    .update({
      scan_domain: targetUrl.origin,
      scan_error: null,
      started_at: startedAt,
      status: "running",
    })
    .eq("id", scanId);

  if (updateError) {
    console.error("[scan.api] failed to mark scan running", {
      error: updateError,
      scanId,
      submittedUrl,
    });

    return createJsonResponse(
      {
        error: updateError.message,
      },
      500,
    );
  }

  console.info("[scan.api] scan row marked running", {
    scanId,
    startedAt,
    status: "running",
    submittedUrl,
  });

  const scanPromise = (async () => {
    console.info("[scan.api] before runScan", {
      scanId,
      startedAt,
      submittedUrl: targetUrl.toString(),
    });

    const result = await runScan(scanId, targetUrl.toString(), {
      startedAt,
    });

    console.info("[scan.api] after runScan", {
      findingsCount: result.findings.length,
      scanId,
      securityScore: result.securityScore,
      summary: result.summary,
      submittedUrl: targetUrl.toString(),
    });

    return result;
  })();

  after(async () => {
    try {
      await scanPromise;
    } catch (error) {
      console.error(`[scanner] Background API scan failed for ${scanId}`, error);
    }
  });

  return createJsonResponse(
    {
      ok: true,
      scanId,
      status: "queued",
      url: requestedUrl,
    },
    200,
  );
}
