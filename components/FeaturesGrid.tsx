"use client";

import type { LucideIcon } from "lucide-react";
import {
  Braces,
  FileCode2,
  KeyRound,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const features: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: FileCode2,
    title: "JS Bundle Analysis",
    description:
      "Inspect shipped JavaScript for leaked secrets, unsafe patterns, and accidentally exposed internals.",
  },
  {
    icon: LockKeyhole,
    title: "Supabase RLS Detection",
    description:
      "Flag missing or disabled Row Level Security before permissive tables reach real users.",
  },
  {
    icon: Braces,
    title: "API Route Testing",
    description:
      "Probe exposed endpoints for weak authorization, admin route leaks, and unsafe AI scaffolding.",
  },
  {
    icon: ShieldCheck,
    title: "Security Headers Audit",
    description:
      "Verify CSP, frame protections, and baseline browser defenses across your deployed app.",
  },
  {
    icon: KeyRound,
    title: "Environment Variable Leak Detection",
    description:
      "Catch service keys, internal URLs, and sensitive config values that should never reach the client.",
  },
  {
    icon: ScanLine,
    title: "AI Fix Instructions",
    description:
      "Receive prioritized remediation steps written for modern AI coding workflows and fast implementation.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Feature Set
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Purpose-built checks for the mistakes AI tools introduce most often.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -8, scale: 1.01 }}
              className="glass-panel rounded-[2rem] border border-white/10 p-8 shadow-card"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-4 text-base leading-7 text-muted">{description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
