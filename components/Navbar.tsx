import Link from "next/link";
import { ScanSearch, ShieldCheck } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#sample-report", label: "Sample Report" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 px-5 py-3 shadow-card sm:px-6">
        <Link
          href="#hero"
          className="flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_18px_40px_-18px_rgba(239,68,68,0.8)]">
            <ScanSearch className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              VibeScan
            </span>
            <span className="text-xs text-subtle">AI-native security scans</span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-strong lg:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
            Live scans for Vercel + Supabase
          </div>
          <Link
            href="#final-cta"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-foreground shadow-[0_12px_30px_-22px_rgba(2,6,23,0.9)] hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Start Free Scan
          </Link>
        </div>
      </div>
    </header>
  );
}
