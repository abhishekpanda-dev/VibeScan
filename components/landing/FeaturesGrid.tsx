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
          title="Coverage built for modern AI shipping teams"
          description="From credentials to route exposure, every scan checks the weaknesses that commonly slip into AI-assisted releases."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              whileHover={{ y: -4, borderColor: "rgba(255,59,59,0.24)" }}
              transition={{ duration: 0.2 }}
              className="rounded-[18px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(10,15,26,0.92),rgba(15,24,37,0.88))] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
            >
              <div
                className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 px-3 font-mono text-[11px] font-semibold tracking-[0.18em] text-[var(--red)]"
                aria-hidden
              >
                {feature.icon}
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-[var(--white)]">
                {feature.title}
              </h3>
              <p className="text-[13px] leading-[1.7] text-[#8A93A8]">
                {feature.description}
              </p>
              <span
                className={`mt-4 inline-block rounded-full px-2.5 py-[4px] font-mono text-[10px] font-semibold tracking-[0.5px] ${severityClasses[feature.severity]}`}
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
