import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/date";
import type { ScanStatus } from "@/types/database";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";

type ReportLayoutProps = {
  actions?: ReactNode;
  children: ReactNode;
  createdAt: string;
  description: string;
  eyebrow?: string;
  status: ScanStatus;
  title: string;
  url: string;
};

export function ReportLayout({
  actions,
  children,
  createdAt,
  description,
  eyebrow = "Report",
  status,
  title,
  url,
}: ReportLayoutProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_38%),linear-gradient(180deg,_#05080f_0%,_#07101b_50%,_#05080f_100%)] px-6 py-12 text-[var(--white)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,8,15,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--cyan)]">
                {eyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                {description}
              </p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Status
              </p>
              <div className="mt-3">
                <ScanStatusBadge status={status} />
              </div>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                URL
              </p>
              <p className="mt-3 break-all text-sm text-[var(--white)]">{url}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Created
              </p>
              <p className="mt-3 text-sm text-[var(--white)]">
                {formatDateTime(createdAt)}
              </p>
            </div>
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
