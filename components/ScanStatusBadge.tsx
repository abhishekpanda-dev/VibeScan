import { getScanStatusLabel } from "@/lib/scan-utils";
import type { ScanStatus } from "@/types/database";

type ScanStatusBadgeProps = {
  status: ScanStatus;
};

const badgeClasses: Record<ScanStatus, string> = {
  complete:
    "border-[rgba(61,202,106,0.3)] bg-[rgba(61,202,106,0.12)] text-[#7DF0A0]",
  failed:
    "border-[rgba(255,59,59,0.35)] bg-[rgba(255,59,59,0.12)] text-[#FF8E8E]",
  pending:
    "border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.1)] text-[#FFD166]",
  running:
    "border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.1)] text-[var(--cyan)]",
};

export function ScanStatusBadge({ status }: ScanStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${badgeClasses[status]}`}
    >
      {getScanStatusLabel(status)}
    </span>
  );
}
