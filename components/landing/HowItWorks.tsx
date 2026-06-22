"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/landing/SectionHeading";
import { steps } from "@/components/landing/content";

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-28 px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Process"
          title="Four clear steps from URL to remediation"
          description="A simple workflow for teams that want fast security feedback without changing how they ship."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <motion.article
              key={step.number}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,24,37,0.9),rgba(10,15,26,0.92))] p-6 shadow-[0_18px_38px_rgba(0,0,0,0.22)]"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,59,59,0.55),transparent)]"
              />
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,59,59,0.3)] bg-[var(--red-dim)] font-mono text-[16px] font-semibold text-[var(--red)]">
                {step.number}
              </div>
              <h3 className="mb-2.5 text-[18px] font-semibold text-[var(--white)]">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.7] text-[#8A93A8]">
                {step.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
