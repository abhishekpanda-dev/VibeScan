"use client";

import { motion } from "framer-motion";

const logos = [
  { name: "Next.js", mark: "N" },
  { name: "Supabase", mark: "S" },
  { name: "Vercel", mark: "V" },
  { name: "Clerk", mark: "C" },
  { name: "Cursor", mark: "CU" },
  { name: "Claude Code", mark: "CC" },
];

export default function TrustBar() {
  return (
    <section className="border-y border-white/[0.08] bg-slate-950/40 px-6 py-8 backdrop-blur sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
          Built for the modern AI app stack
        </p>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-muted-strong shadow-[0_20px_44px_-34px_rgba(2,6,23,0.95)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xs font-semibold tracking-[0.14em] text-foreground">
                {logo.mark}
              </span>
              <span className="text-sm font-medium">{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
