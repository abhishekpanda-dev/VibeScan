"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SectionHeading from "@/components/landing/SectionHeading";
import { pricingPlans } from "@/components/landing/content";

type PricingProps = {
  isAuthenticated: boolean;
};

export default function Pricing({ isAuthenticated }: PricingProps) {
  const searchParams = useSearchParams();
  const preferredPlan = searchParams.get("plan");

  return (
    <section id="pricing" className="scroll-mt-28 px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Pricing"
          title="Choose the scan that fits your release cadence"
          description="Start with a one-time security report or move to Pro for unlimited scanning and ongoing coverage."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {pricingPlans.map((plan) => {
            const ctaHref = isAuthenticated ? plan.ctaAuthHref : plan.ctaGuestHref;
            const isPlanFocused = preferredPlan === plan.id;

            return (
              <motion.article
                key={plan.name}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden rounded-[24px] border p-8 shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${
                  plan.featured
                    ? "border-[rgba(255,59,59,0.36)] bg-[linear-gradient(145deg,rgba(255,59,59,0.12),rgba(15,24,37,0.94)_42%,rgba(10,15,26,0.96))]"
                    : "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,24,37,0.9),rgba(10,15,26,0.96))]"
                } ${isPlanFocused ? "ring-1 ring-[rgba(0,212,255,0.42)]" : ""}`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
                    plan.featured
                      ? "bg-[linear-gradient(90deg,transparent,rgba(255,59,59,0.7),transparent)]"
                      : "bg-[linear-gradient(90deg,transparent,rgba(0,212,255,0.45),transparent)]"
                  }`}
                />

                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[12px] uppercase tracking-[1.2px] text-[var(--muted)]">
                      {plan.name}
                    </div>
                    <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[var(--white)]">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {plan.featured && plan.featuredLabel ? (
                      <span className="rounded-full bg-[var(--red)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                        {plan.featuredLabel}
                      </span>
                    ) : null}
                    {plan.savingsLabel ? (
                      <span className="rounded-full border border-[rgba(255,184,0,0.22)] bg-[rgba(255,184,0,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFB800]">
                        {plan.savingsLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="max-w-[32rem] text-[15px] leading-[1.7] text-[#8A93A8]">
                  {plan.description}
                </p>

                <div className="mt-8 flex flex-wrap items-end gap-x-3 gap-y-2">
                  <div className="text-[50px] font-bold leading-none tracking-[-0.04em] text-[var(--white)]">
                    {plan.price}
                  </div>
                  {plan.originalPrice ? (
                    <div className="pb-1 text-[20px] text-[var(--muted)] line-through">
                      {plan.originalPrice}
                    </div>
                  ) : null}
                  <div className="pb-2 text-[14px] text-[var(--muted)]">{plan.billingLabel}</div>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-white/4 px-4 py-3 text-[14px] text-[#D6DEEF]"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          plan.featured
                            ? "bg-[rgba(255,59,59,0.18)] text-[var(--red)]"
                            : "bg-[rgba(0,212,255,0.14)] text-[var(--cyan)]"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={ctaHref}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border px-5 py-4 text-[14px] font-semibold transition-all duration-200 ${
                    plan.featured
                      ? "border-[var(--red)] bg-[var(--red)] text-white hover:-translate-y-px hover:brightness-110"
                      : "border-[rgba(255,255,255,0.12)] bg-white/6 text-[var(--white)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.24)] hover:bg-white/10"
                  }`}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
