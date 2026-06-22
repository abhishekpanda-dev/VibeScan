"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { StartScanActionState } from "@/app/scan/action-state";
import { ensureProfileRecord } from "@/lib/profiles";
import { getAuthenticatedSupabaseUser } from "@/lib/scan-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScanEligibility, validateScanUrl } from "@/lib/scan-utils";

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : null;
    const details =
      "details" in error && typeof error.details === "string"
        ? error.details
        : null;
    const hint =
      "hint" in error && typeof error.hint === "string"
        ? error.hint
        : null;

    return [message, details, hint].filter(Boolean).join(" | ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown scan creation error.";
}

function getDevelopmentErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (process.env.NODE_ENV === "development") {
    return message || "Unknown scan creation error.";
  }

  return "We could not start the scan right now. Please try again.";
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const explicitOrigin = headerStore.get("origin");

  if (explicitOrigin) {
    return explicitOrigin;
  }

  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    throw new Error("Unable to determine the application origin for /api/scan.");
  }

  return `${protocol}://${host}`;
}

async function createCookieHeader() {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function queueScanExecution(scanId: string, submittedUrl: string) {
  const origin = await getRequestOrigin();
  const cookieHeader = await createCookieHeader();
  const scanRouteUrl = new URL("/api/scan", origin);

  console.info("[scan.action] before /api/scan fetch", {
    scanId,
    scanRouteUrl: scanRouteUrl.toString(),
    submittedUrl,
  });

  const response = await fetch(scanRouteUrl, {
    body: JSON.stringify({
      scanId,
      url: submittedUrl,
    }),
    cache: "no-store",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseText = await response.text();

  console.info("[scan.action] /api/scan response", {
    ok: response.ok,
    responseText,
    scanId,
    status: response.status,
    submittedUrl,
  });

  if (!response.ok) {
    throw new Error(
      `/api/scan returned ${response.status}: ${responseText || "No response body."}`,
    );
  }
}

export async function startScanAction(
  _previousState: StartScanActionState,
  formData: FormData,
): Promise<StartScanActionState> {
  const submittedUrl = String(formData.get("url") ?? "").trim();
  let createdScanId: string | null = null;
  const urlError = validateScanUrl(submittedUrl);

  console.info("[scan.action] entry", {
    submittedUrl,
  });

  if (urlError) {
    return {
      formError: null,
      showUpgradeCta: false,
      submittedUrl,
      urlError,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthenticatedSupabaseUser(supabase);

    if (!user) {
      return {
        formError: "Your session expired. Please sign in again.",
        showUpgradeCta: false,
        submittedUrl,
        urlError: null,
      };
    }

    const profile = await ensureProfileRecord(supabase, user.id, user.email);
    const eligibility = getScanEligibility(profile);

    if (!eligibility.allowed) {
      return {
        formError: "No scan credits available",
        showUpgradeCta: true,
        submittedUrl,
        urlError: null,
      };
    }

    const { data, error } = await supabase.rpc("start_scan", {
      scan_url: submittedUrl,
    });

    if (error) {
      const noCredits = error.message.toLowerCase().includes("no scan credits");

      console.error("[scan] start_scan RPC failed", {
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
        message: error.message,
        submittedUrl,
        userId: user.id,
      });

      return {
        formError: noCredits
          ? "No scan credits available"
          : getDevelopmentErrorMessage(error),
        showUpgradeCta: noCredits,
        submittedUrl,
        urlError: null,
      };
    }

    const scanId = data?.[0]?.scan_id;

    if (!scanId) {
      console.error("[scan] start_scan RPC returned no scan_id", {
        data,
        submittedUrl,
        userId: user.id,
      });

      return {
        formError: "The scan was created without a report reference. Please try again.",
        showUpgradeCta: false,
        submittedUrl,
        urlError: null,
      };
    }

    createdScanId = scanId;

    console.info("[scan.action] scan row created", {
      scanId,
      submittedUrl,
      userId: user.id,
    });
  } catch (error) {
    console.error("[scan] startScanAction unexpected failure", {
      error,
      submittedUrl,
    });

    return {
      formError: getDevelopmentErrorMessage(error),
      showUpgradeCta: false,
      submittedUrl,
      urlError: null,
    };
  }

  try {
    await queueScanExecution(createdScanId, submittedUrl);
  } catch (error) {
    console.error("[scan.action] failed to queue /api/scan", {
      error,
      scanId: createdScanId,
      submittedUrl,
    });

    try {
      const supabase = await createSupabaseServerClient();
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("scans")
        .update({
          completed_at: now,
          scan_error: getErrorMessage(error),
          started_at: now,
          status: "failed",
        })
        .eq("id", createdScanId);

      if (updateError) {
        console.error("[scan.action] failed to mark queued scan as failed", {
          error: updateError,
          scanId: createdScanId,
        });
      }
    } catch (markFailedError) {
      console.error("[scan.action] unexpected failure while marking queued scan failed", {
        error: markFailedError,
        scanId: createdScanId,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/report/${createdScanId}`);
  redirect(`/report/${createdScanId}`);
}
