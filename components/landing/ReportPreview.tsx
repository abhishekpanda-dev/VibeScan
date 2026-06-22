"use client";

import SectionHeading from "@/components/landing/SectionHeading";
import { reportFindings } from "@/components/landing/content";

const dotClasses = {
  red: "bg-[var(--red)]",
  yellow: "bg-[#FFB800]",
  cyan: "bg-[var(--cyan)]",
} as const;

const fixLines = [
  { text: "# Fix: Supabase service_role key exposed", tone: "title" },
  { text: "", tone: "spacer" },
  { text: "## Problem", tone: "muted" },
  { text: "Your service_role key is bundled into", tone: "body" },
  { text: "client-side JS. Anyone can extract it", tone: "body" },
  { text: "and bypass all RLS policies.", tone: "body" },
  { text: "", tone: "spacer" },
  { text: "## Fix", tone: "muted" },
  { text: "Move SUPABASE_SERVICE_ROLE_KEY to", tone: "fix" },
  { text: "server-only API routes. Never import", tone: "fix" },
  { text: "the admin client in /app or /components.", tone: "fix" },
  { text: "", tone: "spacer" },
  { text: "## Files to change", tone: "muted" },
  { text: "- lib/supabase/client.ts", tone: "fix" },
  { text: "- .env.local -> rename to SUPABASE_", tone: "fix" },
  { text: "  SERVICE_ROLE_KEY (no NEXT_PUBLIC_)", tone: "fix" },
] as const;

export default function ReportPreview() {
  return (
    <section className="px-6 py-20 md:px-12 md:py-[100px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          tag="Output"
          title="A report you can actually act on"
          description="Not a wall of jargon. Every finding comes with a one-click Claude fix."
        />
        <div className="grid overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg2)] lg:grid-cols-2">
          <div className="border-b border-[var(--border)] p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="mb-2 font-mono text-[60px] font-semibold leading-none text-[var(--red)] md:text-[72px]">
              3
            </div>
            <div className="mb-8 text-[13px] text-[var(--muted)]">
              critical findings - myapp.vercel.app
            </div>
            {reportFindings.map((finding) => (
              <div
                key={finding.title}
                className="mb-2.5 flex items-start gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg3)] px-4 py-[14px] last:mb-0"
              >
                <span
                  className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dotClasses[finding.dot]}`}
                />
                <div>
                  <div className="text-[13px] font-medium text-[var(--white)]">
                    {finding.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
                    {finding.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 lg:p-10">
            <div className="mb-2.5 font-mono text-[12px] uppercase tracking-[1px] text-[var(--muted)]">
              AI-Ready Fix - paste into Claude Code
            </div>
            <div className="rounded-[8px] border border-[rgba(0,212,255,0.15)] bg-[var(--bg3)] p-4 font-mono text-[12px] leading-[1.7] text-[#8A93A8]">
              {fixLines.map((line, index) => {
                if (line.tone === "spacer") {
                  return <div key={`spacer-${index}`} className="h-[10px]" />;
                }

                let className = "text-[#8A93A8]";
                if (line.tone === "title") {
                  className = "mb-2.5 font-semibold text-[var(--cyan)]";
                }
                if (line.tone === "muted") {
                  className = "text-[var(--muted)]";
                }
                if (line.tone === "fix") {
                  className = "text-[#3DCA6A]";
                }

                return (
                  <div key={`${line.text}-${index}`} className={`${className} whitespace-pre-wrap`}>
                    {line.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
