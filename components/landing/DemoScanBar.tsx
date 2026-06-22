"use client";

import { motion } from "framer-motion";

import SectionHeading from "@/components/landing/SectionHeading";

export default function DemoScanBar() {
  return (
    <section
      id="demo"
      className="scroll-mt-28 border-y border-[var(--border)] bg-[var(--bg2)] px-6 py-20 md:px-12 md:py-[100px]"
    >
      <div className="mx-auto max-w-[700px] text-center">
        <SectionHeading
          tag="Try it now"
          title="Scan your app for free"
          description="First scan is free. No account required. Get your report in 90 seconds."
          centered
        />

        <div className="mx-auto flex max-w-[700px] flex-col items-stretch gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-5 py-[6px] transition-colors duration-200 focus-within:border-[rgba(255,59,59,0.4)] sm:flex-row sm:items-center sm:gap-3 sm:pr-[6px]">
          <input
            type="url"
            inputMode="url"
            placeholder="https://yourapp.vercel.app"
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[14px] text-[var(--white)] outline-none placeholder:text-[var(--muted)]"
          />
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap rounded-[8px] bg-[var(--red)] px-[22px] py-[11px] text-[14px] font-semibold text-white transition-opacity duration-200 hover:opacity-[0.85]"
          >
            Scan now →
          </motion.button>
        </div>
        <p className="mt-[14px] text-[12px] text-[var(--muted)]">
          We only access what any browser can access. No code access, no installs.
        </p>
      </div>
    </section>
  );
}
