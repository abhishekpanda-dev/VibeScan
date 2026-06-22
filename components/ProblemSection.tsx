"use client";

import { motion } from "framer-motion";
import { DatabaseZap, KeyRound, ShieldAlert } from "lucide-react";

const problems = [
  {
    icon: KeyRound,
    title: "Exposed Secrets",
    description:
      "Service keys and environment variables accidentally shipped to production.",
  },
  {
    icon: ShieldAlert,
    title: "Broken Authentication",
    description:
      "Endpoints created by AI without proper authorization checks.",
  },
  {
    icon: DatabaseZap,
    title: "Missing Database Security",
    description:
      "Supabase tables deployed without Row Level Security.",
  },
];

export default function ProblemSection() {
  return (
    <section className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            The Problem
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            AI writes code faster. It also ships vulnerabilities faster.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {problems.map(({ icon: Icon, title, description }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -8 }}
              className="group glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 p-8 shadow-card"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-6 text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="relative mt-4 text-base leading-7 text-muted">
                {description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
