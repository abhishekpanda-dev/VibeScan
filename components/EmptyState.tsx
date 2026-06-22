import Link from "next/link";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow?: string;
  title: string;
};

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  title,
}: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/15 bg-[linear-gradient(180deg,rgba(15,24,37,0.8),rgba(5,8,15,0.88))] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--cyan)]">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-3 text-2xl font-semibold text-[var(--white)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <div className="mt-6">
          <Link
            href={actionHref}
            className="inline-flex rounded-2xl bg-[var(--red)] px-5 py-3 text-sm font-semibold text-[var(--white)] hover:brightness-110"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
