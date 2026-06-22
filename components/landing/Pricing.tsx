"use client";

import { motion } from "framer-motion";

import SectionHeading from "@/components/landing/SectionHeading";
import { pricingPlans } from "@/components/landing/content";

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-28 px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Pricing"
          title="Pay for what you ship"
          description="No annual contracts. Cancel anytime. Built for solo founders, not enterprises."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <motion.article
              key={plan.name}
              whileHover={{ borderColor: "rgba(255,59,59,0.4)" }}
              transition={{ duration: 0.2 }}
              className={`relative rounded-[16px] border p-8 ${
                plan.featured
                  ? "border-[rgba(255,59,59,0.4)] bg-[linear-gradient(135deg,rgba(255,59,59,0.06)_0%,var(--bg2)_100%)]"
                  : "border-[var(--border)] bg-[var(--bg2)]"
              }`}
            >
              {plan.featured && plan.featuredLabel ? (
                <div className="absolute left-1/2 top-[-11px] -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--red)] px-[14px] py-1 text-[11px] font-semibold tracking-[0.5px] text-white">
                  {plan.featuredLabel}
                </div>
              ) : null}

              <div className="mb-3 font-mono text-[13px] uppercase tracking-[1px] text-[var(--muted)]">
                {plan.name}
              </div>
              <div className="mb-1 text-[42px] font-bold tracking-[-1px] text-[var(--white)]">
                <sup className="mr-0.5 align-top text-[20px]">$</sup>
                {plan.amount}
              </div>
              <div className="mb-7 text-[13px] text-[var(--muted)]">{plan.period}</div>

              <ul className="mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className="flex items-center gap-2.5 border-b border-[var(--border)] py-[7px] text-[14px] text-[#8A93A8] last:border-b-0"
                  >
                    <span
                      className={`text-[13px] ${
                        feature.included
                          ? plan.featured
                            ? "text-[var(--red)]"
                            : "text-[var(--cyan)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {feature.included ? "✓" : "–"}
                    </span>
                    {feature.text}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`w-full rounded-[8px] border px-4 py-[13px] text-[14px] font-semibold transition-all duration-200 ${
                  plan.featured
                    ? "border-[var(--red)] bg-[var(--red)] text-white hover:opacity-[0.85]"
                    : "border-[var(--border)] bg-transparent text-[var(--white)] hover:border-[var(--red)] hover:text-[var(--red)]"
                }`}
              >
                {plan.buttonLabel}
              </button>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
