type SectionHeadingProps = {
  tag: string;
  title: string;
  description: string;
  centered?: boolean;
};

export default function SectionHeading({
  tag,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center" : ""}>
      <div
        className={`mb-[14px] font-mono text-[11px] uppercase tracking-[2px] text-[var(--red)] ${centered ? "text-center" : ""}`}
      >
        {tag}
      </div>
      <h2 className="mb-4 text-[34px] font-bold leading-[1.2] tracking-[-1px] text-[var(--white)] md:text-[38px]">
        {title}
      </h2>
      <p
        className={`mb-14 text-[16px] leading-[1.7] text-[#8A93A8] ${centered ? "mx-auto max-w-[700px] text-center" : "max-w-[520px]"}`}
      >
        {description}
      </p>
    </div>
  );
}
