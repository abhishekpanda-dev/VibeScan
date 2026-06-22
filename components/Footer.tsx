import Link from "next/link";
import { ScanSearch } from "lucide-react";

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#final-cta", label: "Pricing" },
  { href: "#how-it-works", label: "Docs" },
  { href: "#footer", label: "Privacy" },
  { href: "mailto:contact@vibescan.dev", label: "Contact" },
];

export default function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-white/[0.08] bg-slate-950/40 px-6 py-10 backdrop-blur sm:px-8 lg:px-10"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_18px_40px_-18px_rgba(239,68,68,0.8)]">
            <ScanSearch className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">
              VibeScan
            </p>
            <p className="text-sm text-subtle">
              Security scanning for AI-built web apps.
            </p>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
