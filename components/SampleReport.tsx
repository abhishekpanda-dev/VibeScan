"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, FileDown, ShieldAlert, TriangleAlert } from "lucide-react";

const findings = [
  {
    severity: "Critical",
    title: "Missing RLS on profiles",
    detail: "Anonymous reads are permitted on the public profiles table.",
  },
  {
    severity: "Critical",
    title: "Service role key exposed",
    detail: "A production service key is embedded in a client-side bundle.",
  },
  {
    severity: "High",
    title: "Missing CSP",
    detail: "The app does not send a Content Security Policy header.",
  },
];

const stats = [
  { label: "Bundles inspected", value: "34" },
  { label: "API routes checked", value: "11" },
  { label: "Headers passing", value: "7 / 9" },
];

export default function SampleReport() {
  return (
    <section
      id="sample-report"
      className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Sample Report
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Go from issue discovery to fix-ready remediation in one pass.
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel mt-12 overflow-hidden rounded-[2.25rem] border border-white/10 shadow-panel"
        >
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(239,68,68,0.10),transparent)] p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
                    Security Score
                  </p>
                  <p className="mt-4 text-6xl font-semibold tracking-[-0.07em] text-foreground">
                    68<span className="text-3xl text-slate-500">/100</span>
                  </p>
                </div>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <ShieldAlert className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-8 rounded-full bg-white/[0.06] p-1">
                <div className="h-3 w-[68%] rounded-full bg-[linear-gradient(90deg,#ef4444,#3b82f6)]" />
              </div>

              <p className="mt-4 text-base leading-7 text-muted">
                VibeScan detected privileged credentials in client bundles and
                missing data-layer protections on core Supabase tables.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
                    Findings
                  </p>
                  <p className="mt-2 text-lg font-medium text-muted">
                    demo-app.vercel.app
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-foreground shadow-[0_18px_40px_-30px_rgba(2,6,23,0.9)] hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-blue"
                >
                  <FileDown className="h-4 w-4" />
                  Export Fix Instructions
                </button>
              </div>

              <div className="mt-8 space-y-4">
                {findings.map((finding) => (
                  <div
                    key={finding.title}
                    className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-muted shadow-[0_16px_32px_-28px_rgba(2,6,23,0.9)]">
                          <TriangleAlert className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                finding.severity === "Critical"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-amber-400/10 text-amber-300"
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <h3 className="text-xl font-semibold tracking-tight text-foreground">
                              {finding.title}
                            </h3>
                          </div>
                          <p className="mt-3 text-base leading-7 text-muted">
                            {finding.detail}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-muted hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
                      >
                        View Fix
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
