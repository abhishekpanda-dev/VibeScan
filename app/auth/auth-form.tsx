"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthFormProps = {
  initialError?: string;
  initialMessage?: string;
  nextPath: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function AuthForm({
  initialError,
  initialMessage,
  nextPath,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsMagicLinkLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo.toString(),
          shouldCreateUser: true,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Check your inbox for the magic link to finish signing in.");
      setEmail("");
    } catch (signInError) {
      setError(getErrorMessage(signInError));
    } finally {
      setIsMagicLinkLoading(false);
    }
  }

  async function handleGithubLogin() {
    setError("");
    setMessage("");
    setIsGithubLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (signInError) {
      setError(getErrorMessage(signInError));
      setIsGithubLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_42%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-16 text-[var(--white)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <p className="inline-flex rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-[var(--cyan)]">
              Auth Foundation
            </p>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Secure access for the VibeScan application.
              </h1>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Sign in with a magic link or GitHub to reach your protected
                dashboard. Session handling, route protection, and profile
                bootstrapping are wired through Supabase.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Access
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  Protected dashboard, scan, checkout, and report routes.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Profiles
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  New users get a default profile with free-tier settings.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Security
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  Database policies keep every user scoped to their own data.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex text-sm text-slate-300 underline decoration-[var(--cyan)] underline-offset-4 hover:text-[var(--white)]"
            >
              Back to landing page
            </Link>
          </section>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.92),rgba(5,8,15,0.96))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
                Sign In
              </p>
              <h2 className="text-2xl font-semibold">Choose a secure entry point</h2>
            </div>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={isGithubLoading || isMagicLinkLoading}
                className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGithubLoading ? "Redirecting to GitHub..." : "Continue with GitHub"}
              </button>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                <span className="h-px flex-1 bg-white/10" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form className="space-y-4" onSubmit={handleMagicLinkSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Work email
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--white)] outline-none placeholder:text-slate-500 focus:border-[var(--cyan)] focus:ring-2 focus:ring-[rgba(0,212,255,0.18)]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isMagicLinkLoading || isGithubLoading}
                  className="w-full rounded-2xl bg-[var(--red)] px-4 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMagicLinkLoading ? "Sending magic link..." : "Send magic link"}
                </button>
              </form>
            </div>

            {message ? (
              <div className="mt-6 rounded-2xl border border-[rgba(0,212,255,0.24)] bg-[rgba(0,212,255,0.08)] px-4 py-3 text-sm text-cyan-100">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-[rgba(255,59,59,0.3)] bg-[rgba(255,59,59,0.1)] px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <p className="mt-6 text-sm text-slate-400">
              By continuing, you will be redirected to your protected dashboard
              after the session is verified.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
