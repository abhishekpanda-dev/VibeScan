"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section id="final-cta" className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_28%)] px-6 py-14 shadow-panel sm:px-10 lg:px-14"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            Final CTA
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Ship fast. Stay secure.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Built specifically for Next.js and Supabase applications created
            with modern AI coding tools.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="#hero"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_28px_48px_-22px_rgba(239,68,68,0.65)] hover:-translate-y-0.5 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Start Free Scan
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-sm text-subtle">
            No install required. Paste a live URL and review the report.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
