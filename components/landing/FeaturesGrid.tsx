"use client";

import { motion } from "framer-motion";

import SectionHeading from "@/components/landing/SectionHeading";
import { features, type Severity } from "@/components/landing/content";

const severityClasses: Record<Severity, string> = {
  critical: "bg-[rgba(255,59,59,0.15)] text-[var(--red)]",
  high: "bg-[rgba(255,184,0,0.12)] text-[#FFB800]",
  medium: "bg-[rgba(0,212,255,0.1)] text-[var(--cyan)]",
};

export default function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-28 px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Coverage"
          title="Every gap AI tools leave open"
          description="Built specifically for the Next.js + Supabase stack that 80% of vibe-coded apps run on."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              whileHover={{ y: -2, borderColor: "rgba(255,59,59,0.2)" }}
              transition={{ duration: 0.2 }}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-6"
            >
              <div className="mb-[14px] text-[22px]" aria-hidden>
                {feature.icon}
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-[var(--white)]">
                {feature.title}
              </h3>
              <p className="text-[13px] leading-[1.6] text-[#6B7592]">
                {feature.description}
              </p>
              <span
                className={`mt-3 inline-block rounded-[4px] px-2 py-[3px] font-mono text-[10px] font-semibold tracking-[0.5px] ${severityClasses[feature.severity]}`}
              >
                {feature.severity.toUpperCase()}
              </span>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
