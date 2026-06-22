import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Search } from "lucide-react";
import { signOut } from "@/app/dashboard/actions";
import BrandLogo from "@/components/landing/BrandLogo";
import { navLinks } from "@/components/landing/content";

type NavbarProps = {
  viewer: {
    avatarUrl: string | null;
    displayEmail: string;
    displayName: string;
    initials: string;
  } | null;
};

export default function Navbar({ viewer }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[rgba(5,8,15,0.85)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-[18px] sm:flex-row sm:items-center sm:justify-between md:px-12">
        <BrandLogo href="/" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] text-[var(--muted)] transition-colors duration-200 hover:text-[var(--white)]"
            >
              {link.label}
            </Link>
          ))}

          {viewer ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-white/5 px-4 py-[9px] text-[13px] font-semibold text-[var(--white)] transition-all duration-200 hover:border-[rgba(255,255,255,0.24)] hover:bg-white/8"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              <details className="group relative [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-white/5 px-3 py-2 text-left transition-all duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-white/8">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,59,59,0.16)] bg-cover bg-center font-mono text-[12px] font-semibold text-[var(--red)]"
                    style={
                      viewer.avatarUrl
                        ? { backgroundImage: `url(${viewer.avatarUrl})` }
                        : undefined
                    }
                  >
                    {viewer.avatarUrl ? null : viewer.initials}
                  </span>

                  <span className="hidden min-w-0 md:block">
                    <span className="block max-w-[180px] truncate text-[13px] font-medium text-[var(--white)]">
                      {viewer.displayEmail}
                    </span>
                    <span className="block text-[11px] text-[var(--muted)]">Account</span>
                  </span>

                  <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                </summary>

                <div className="absolute right-0 top-[calc(100%+10px)] w-[260px] overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(15,24,37,0.96),rgba(5,8,15,0.98))] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div className="rounded-[14px] border border-white/6 bg-white/4 px-4 py-3">
                    <div className="text-[12px] font-medium text-[var(--white)]">
                      {viewer.displayName}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--muted)]">
                      {viewer.displayEmail}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-1">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-3 rounded-[12px] px-4 py-3 text-[13px] text-[var(--white)] transition-colors duration-200 hover:bg-white/6"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[var(--red)]" />
                      Open dashboard
                    </Link>
                    <Link
                      href="/scan"
                      className="inline-flex items-center gap-3 rounded-[12px] px-4 py-3 text-[13px] text-[var(--white)] transition-colors duration-200 hover:bg-white/6"
                    >
                      <Search className="h-4 w-4 text-[var(--cyan)]" />
                      Run a scan
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="inline-flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-[13px] text-[var(--white)] transition-colors duration-200 hover:bg-white/6"
                      >
                        <LogOut className="h-4 w-4 text-[#FFB800]" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-white/5 px-4 py-[9px] text-[13px] font-semibold text-[var(--white)] transition-all duration-200 hover:border-[rgba(255,255,255,0.24)] hover:bg-white/8"
              >
                Sign In
              </Link>
              <Link
                href="/auth?next=/scan"
                className="rounded-[10px] bg-[var(--red)] px-5 py-[9px] text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(255,59,59,0.28)] transition-all duration-200 hover:-translate-y-px hover:opacity-[0.9]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
