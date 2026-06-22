import BrandLogo from "@/components/landing/BrandLogo";
import { navLinks } from "@/components/landing/content";

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[rgba(5,8,15,0.85)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-[18px] sm:flex-row sm:items-center sm:justify-between md:px-12">
        <BrandLogo />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] text-[var(--muted)] transition-colors duration-200 hover:text-[var(--white)]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#pricing"
            className="rounded-[6px] bg-[var(--red)] px-5 py-[9px] text-[13px] font-semibold text-white transition-opacity duration-200 hover:opacity-[0.85]"
          >
            Scan your app →
          </a>
        </div>
      </div>
    </nav>
  );
}
