"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ShieldCheck, Sparkles, Zap } from "lucide-react";
import {
  heroStats,
  heroTrustIndicators,
} from "@/components/landing/content";
import TerminalScanner from "@/components/landing/TerminalScanner";

type HeroProps = {
  isAuthenticated: boolean;
};

const trustIndicatorIcons = {
  ai: Sparkles,
  report: FileText,
  speed: Zap,
} as const;

export default function Hero({ isAuthenticated }: HeroProps) {
  const primaryHref = isAuthenticated ? "/scan" : "/auth?next=/scan";
  const primaryLabel = isAuthenticated ? "Start Scan" : "Get Started";

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-[120px] md:px-12 md:pb-[80px]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(255,59,59,0.08)_0%,transparent_70%)]"
      />
      <div className="mx-auto grid w-full max-w-[1100px] gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(255,59,59,0.25)] bg-[var(--red-dim)] px-[14px] py-[6px] font-mono text-[12px] tracking-[0.5px] text-[var(--red)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Security scanning for AI-built apps
          </div>
          <h1 className="mb-5 text-[42px] font-bold leading-[1.1] tracking-[-1.5px] text-[var(--white)] md:text-[52px]">
            Catch the security gaps your AI shipped
            <br />
            <em className="not-italic text-[var(--red)]">before customers do.</em>
          </h1>
          <p className="mb-9 max-w-[460px] text-[17px] leading-[1.7] text-[#8A93A8]">
            VibeScan runs a full security scan against your deployed app, delivers
            a professional report, and pairs every finding with AI remediation
            guidance your team can act on quickly.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--red)] px-7 py-[14px] text-[15px] font-semibold text-white shadow-[0_18px_40px_rgba(255,59,59,0.28)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_20px_48px_rgba(255,59,59,0.36)]"
            >
              {primaryLabel}
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-1.5 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-white/5 px-6 py-[14px] text-[14px] font-medium text-[var(--white)] transition-all duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-white/8"
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {heroTrustIndicators.map((indicator) => {
              const Icon = trustIndicatorIcons[indicator.icon];

              return (
                <div
                  key={indicator.title}
                  className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,24,37,0.88),rgba(10,15,26,0.88))] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 text-[var(--red)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[var(--white)]">
                    {indicator.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-[#8A93A8]">
                    {indicator.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-6 border-t border-[var(--border)] pt-8">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div
                  className={`font-mono text-[22px] font-semibold ${
                    stat.accent ? "text-[var(--red)]" : "text-[var(--white)]"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-24px] rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.14),transparent_55%)] blur-2xl"
          />
          <div className="relative">
            <TerminalScanner />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
