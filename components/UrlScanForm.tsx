"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  initialStartScanActionState,
  type StartScanActionState,
} from "@/app/scan/action-state";
import {
  startScanAction,
} from "@/app/scan/actions";
import { validateScanUrl } from "@/lib/scan-utils";

type UrlScanFormProps = {
  canStartScan: boolean;
  creditsRemaining: number;
  subscriptionStatus: string;
  subscriptionTier: string;
};

function StartScanButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Starting Scan..." : "Start Scan"}
    </button>
  );
}

export function UrlScanForm({
  canStartScan,
  creditsRemaining,
  subscriptionStatus,
  subscriptionTier,
}: UrlScanFormProps) {
  const [state, formAction] = useActionState<StartScanActionState, FormData>(
    startScanAction,
    initialStartScanActionState,
  );
  const [url, setUrl] = useState(state.submittedUrl);
  const [clientUrlError, setClientUrlError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  function runClientValidation(nextUrl: string) {
    const validationError = validateScanUrl(nextUrl);
    setClientUrlError(validationError);
    return validationError;
  }

  const displayedUrlError =
    clientUrlError ?? (hasInteracted ? null : state.urlError);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
        <p className="text-sm text-slate-300">
          Current plan:{" "}
          <span className="font-semibold text-[var(--white)]">
            {subscriptionTier}
          </span>
          {" · "}
          Status:{" "}
          <span className="font-semibold text-[var(--white)]">
            {subscriptionStatus}
          </span>
          {" · "}
          Credits remaining:{" "}
          <span className="font-semibold text-[var(--white)]">
            {creditsRemaining}
          </span>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Pro users can scan without consuming credits. Non-Pro scans deduct one
          credit when the scan record is created.
        </p>
      </div>

      <form
        action={formAction}
        className="space-y-4"
        onSubmit={(event) => {
          setHasInteracted(true);

          if (runClientValidation(url)) {
            event.preventDefault();
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Target URL</span>
          <input
            type="url"
            name="url"
            required
            autoComplete="url"
            inputMode="url"
            placeholder="https://example.com"
            value={url}
            onBlur={() => {
              setHasInteracted(true);
              runClientValidation(url);
            }}
            onChange={(event) => {
              const nextUrl = event.target.value;
              setUrl(nextUrl);

              if (hasInteracted) {
                runClientValidation(nextUrl);
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--white)] outline-none placeholder:text-slate-500 focus:border-[var(--cyan)] focus:ring-2 focus:ring-[rgba(0,212,255,0.18)]"
          />
        </label>

        {displayedUrlError ? (
          <p className="text-sm text-rose-300">{displayedUrlError}</p>
        ) : null}

        {!canStartScan ? (
          <div className="rounded-2xl border border-[rgba(255,59,59,0.3)] bg-[rgba(255,59,59,0.1)] px-4 py-3 text-sm text-rose-100">
            No scan credits available
          </div>
        ) : null}

        {state.formError ? (
          <div className="rounded-2xl border border-[rgba(255,59,59,0.3)] bg-[rgba(255,59,59,0.1)] px-4 py-3 text-sm text-rose-100">
            {state.formError}
          </div>
        ) : null}

        <StartScanButton />
      </form>

      {(state.showUpgradeCta || !canStartScan) ? (
        <div className="rounded-3xl border border-[rgba(0,212,255,0.24)] bg-[rgba(0,212,255,0.08)] p-5">
          <p className="text-sm font-medium text-cyan-100">
            No scan credits available
          </p>
          <p className="mt-2 text-sm text-cyan-50/80">
            Upgrade to Pro for unlimited scans and public report previews with
            AI-ready remediation in future phases.
          </p>
          <Link
            href="/#pricing"
            className="mt-4 inline-flex rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
          >
            Upgrade to Pro
          </Link>
        </div>
      ) : null}
    </div>
  );
}
