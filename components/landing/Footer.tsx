import BrandLogo from "@/components/landing/BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-10 md:px-12">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <BrandLogo />
        <p className="text-[13px] text-[var(--muted)]">
          Built for indie hackers who ship fast and want to sleep at night.
        </p>
        <p className="text-[12px] text-[var(--muted)]">© 2026 VibeScan</p>
      </div>
    </footer>
  );
}
