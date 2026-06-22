"use client";

import { motion } from "framer-motion";

import { heroStats } from "@/components/landing/content";
import TerminalScanner from "@/components/landing/TerminalScanner";

export default function Hero() {
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
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--red)] animate-badge-pulse" />
            45% of vibe-coded apps have critical vulns
          </div>
          <h1 className="mb-5 text-[42px] font-bold leading-[1.1] tracking-[-1.5px] text-[var(--white)] md:text-[52px]">
            Your AI built it.
            <br />
            <em className="not-italic text-[var(--red)]">Did it secure it?</em>
          </h1>
          <p className="mb-9 max-w-[460px] text-[17px] leading-[1.7] text-[#8A93A8]">
            Paste your Vercel URL. VibeScan audits your deployed app for the exact
            security gaps that Cursor, Lovable, and Claude Code consistently miss —
            in under 2 minutes.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <motion.a
              href="#demo"
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--red)] px-7 py-[14px] text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(255,59,59,0.35)]"
            >
              ⚡ Scan my app free
            </motion.a>
            <a
              href="#how"
              className="inline-flex items-center gap-1.5 text-[14px] text-[var(--muted)] transition-colors duration-200 hover:text-[var(--white)]"
            >
              See how it works →
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-6 border-t border-[var(--border)] pt-8">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div
                  className={`font-mono text-[22px] font-semibold ${stat.accent ? "text-[var(--red)]" : "text-[var(--white)]"}`}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <TerminalScanner />
        </motion.div>
      </div>
    </section>
  );
}
