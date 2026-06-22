"use client";

import SectionHeading from "@/components/landing/SectionHeading";
import { steps } from "@/components/landing/content";

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-28 px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Process"
          title="Three steps, two minutes"
          description="No GitHub access. No CI/CD setup. No installs. Just your deployed URL."
        />
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-0">
          <div
            aria-hidden
            className="absolute left-[calc(16.6%+16px)] right-[calc(16.6%+16px)] top-7 hidden h-px bg-[linear-gradient(90deg,var(--red),transparent_50%,var(--red))] opacity-30 md:block"
          />
          {steps.map((step) => (
            <div key={step.number} className="px-0 text-center md:px-6">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,59,59,0.3)] bg-[var(--red-dim)] font-mono text-[16px] font-semibold text-[var(--red)]">
                {step.number}
              </div>
              <h3 className="mb-2.5 text-[16px] font-semibold text-[var(--white)]">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.6] text-[#6B7592]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
