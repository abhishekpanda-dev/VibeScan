"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Paste URL",
    description:
      "Drop in your production Vercel URL and let VibeScan map what your app exposes publicly.",
  },
  {
    number: "02",
    title: "Automated Security Scan",
    description:
      "We inspect JS bundles, headers, routes, and Supabase patterns to catch high-risk mistakes fast.",
  },
  {
    number: "03",
    title: "AI Generated Fix Report",
    description:
      "Get prioritized findings, concrete remediation notes, and implementation-ready fixes for your team.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="glass-panel mx-auto max-w-7xl rounded-[2.25rem] border border-white/10 px-6 py-12 shadow-card sm:px-10 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            How It Works
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Security review without slowing your shipping velocity.
          </h2>
        </div>

        <div className="relative mt-14">
          <motion.div
            initial={{ scaleY: 0, scaleX: 1 }}
            animate={{ scaleY: 1, scaleX: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-5 top-6 h-[calc(100%-3rem)] w-px origin-top bg-gradient-to-b from-accent/60 via-white/[0.12] to-accent-blue/40 md:left-0 md:right-0 md:top-6 md:h-px md:w-full md:origin-left"
          />

          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative pl-18 md:pl-0 md:pt-16"
              >
                <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-accent/25 bg-accent/10 font-semibold tracking-[0.16em] text-accent md:left-0 md:right-0 md:mx-auto">
                  {step.number}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground md:text-center">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-sm text-base leading-7 text-muted md:mx-auto md:text-center">
                  {step.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
