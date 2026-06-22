import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
};

export default function BrandLogo({
  href = "#top",
  className = "",
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={`font-mono text-[17px] font-semibold tracking-[-0.3px] text-[var(--white)] ${className}`}
    >
      Vibe<span className="text-[var(--red)]">Scan</span>
    </Link>
  );
}
