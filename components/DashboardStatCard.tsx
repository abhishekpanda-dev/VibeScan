type DashboardStatCardProps = {
  hint?: string;
  label: string;
  value: number | string;
};

export function DashboardStatCard({
  hint,
  label,
  value,
}: DashboardStatCardProps) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-6 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[var(--white)]">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}
