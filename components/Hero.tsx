"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

const scanLines = [
  "Scanning app...",
  "Found 34 JS bundles",
  "Critical: service_role key exposed",
  "Critical: RLS disabled on profiles",
  "High: Missing CSP header",
  "High: /api/admin accessible",
  "Scan complete",
];

const proofPoints = [
  { icon: ShieldCheck, label: "Production-grade checks" },
  { icon: TimerReset, label: "Under 2 minutes" },
  { icon: Sparkles, label: "Actionable AI fix guidance" },
];

function lineTone(line: string) {
  if (line.startsWith("Critical")) {
    return "text-accent";
  }

  if (line.startsWith("High")) {
    return "text-amber-400";
  }

  if (line === "Scan complete") {
    return "text-accent-green";
  }

  return "text-slate-300";
}

export default function Hero() {
  const [frame, setFrame] = useState(1);

  const advanceFrame = useEffectEvent(() => {
    startTransition(() => {
      setFrame((current) => (current >= scanLines.length + 2 ? 1 : current + 1));
    });
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      advanceFrame();
    }, 850);

    return () => window.clearInterval(interval);
  }, []);

  const visibleLineCount = Math.min(frame, scanLines.length);

  return (
    <section id="hero" className="px-6 pb-18 pt-18 sm:px-8 lg:px-10 lg:pt-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.21, 1, 0.35, 1] }}
          className="max-w-3xl"
        >
          <div className="glass-panel inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(239,68,68,0.8)]" />
            Built for AI-shipped Next.js and Supabase apps
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl">
            Your AI built the bug.{" "}
            <span className="text-gradient">VibeScan finds it.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
            Paste your Vercel URL and uncover exposed secrets, missing Supabase
            RLS policies, insecure API routes, and common AI-generated security
            mistakes in under 2 minutes.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="#final-cta"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_28px_48px_-22px_rgba(239,68,68,0.65)] hover:-translate-y-0.5 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Scan My App Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#sample-report"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-foreground shadow-[0_20px_44px_-30px_rgba(2,6,23,0.88)] hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-blue"
            >
              View Sample Report
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {proofPoints.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="glass-panel flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-muted shadow-[0_20px_48px_-36px_rgba(2,6,23,0.95)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] text-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.21, 1, 0.35, 1] }}
          className="relative"
        >
          <div
            aria-hidden
            className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-accent/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -right-4 -top-6 h-40 w-40 rounded-full bg-accent-blue/20 blur-3xl"
          />

          <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 p-4 shadow-panel">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.12),transparent_26%)]" />
            <div className="relative rounded-[1.5rem] border border-white/10 bg-slate-950/[0.7] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-accent/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-accent-green/80" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-strong">
                  vibescan scan --prod
                </span>
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,#020617_0%,#050816_100%)] px-5 py-5 font-mono text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  <span>Live Security Scan</span>
                  <span>vercel.app</span>
                </div>

                <div className="space-y-3">
                  {scanLines.slice(0, visibleLineCount).map((line, index) => (
                    <motion.div
                      key={`${line}-${index}-${frame}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className={`flex items-center gap-3 ${lineTone(line)}`}
                    >
                      <span className="text-slate-600">$</span>
                      <span>{line}</span>
                    </motion.div>
                  ))}

                  {visibleLineCount < scanLines.length ? (
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>$</span>
                      <motion.span
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                        className="inline-block h-4 w-2 rounded-sm bg-slate-400"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Bundles", value: "34", tone: "text-accent-blue" },
                  { label: "API Routes", value: "11", tone: "text-foreground" },
                  { label: "Critical Issues", value: "2", tone: "text-accent" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {item.label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.tone}`}>
                      {item.value}
                    </p>
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
