import { tickerItems } from "@/components/landing/content";

export default function SecurityTicker() {
  const loopedItems = [...tickerItems, ...tickerItems];

  return (
    <div className="overflow-hidden border-t border-[var(--border)] bg-[var(--bg2)] py-[14px]">
      <div className="flex w-max whitespace-nowrap animate-security-ticker">
        {loopedItems.map((item, index) => (
          <span
            key={`${item.level}-${item.text}-${index}`}
            className="px-10 font-mono text-[12px] text-[var(--muted)]"
          >
            {item.icon}{" "}
            {item.level === "CRITICAL" ? (
              <span className="text-[var(--red)]">{item.level}</span>
            ) : (
              item.level
            )}{" "}
            — {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
