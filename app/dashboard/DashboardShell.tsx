"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, ScanSummary } from "@/types/database";

const RING_CIRCUMFERENCE = 364.4;
const CONTAINER_TRANSITION = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1] as const,
};

type DashboardShellProps = {
  paymentSuccess: boolean;
  profile: Profile;
  scans: ScanSummary[];
  signOutAction: () => Promise<void>;
  totalScansUsed: number;
  user: {
    email: string | null;
    id: string;
  };
};

type NavItem = {
  badge?: number;
  href: string;
  icon: string;
  label: string;
};

type ActivityTone = "cyan" | "green" | "red" | "yellow";

type ActivityItem = {
  description: string;
  id: string;
  timestamp: string;
  title: string;
  tone: ActivityTone;
};

type ScoreTone = {
  color: string;
  glow: string;
  label: string;
  stroke: string;
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: CONTAINER_TRANSITION,
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

function extractHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

function formatRelativeTime(value: string, referenceTime: number) {
  const deltaMs = new Date(value).getTime() - referenceTime;
  const relativeTime = new Intl.RelativeTimeFormat("en-US", {
    numeric: "auto",
  });
  const minutes = Math.round(deltaMs / 60000);

  if (Math.abs(minutes) < 60) {
    return relativeTime.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return relativeTime.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return relativeTime.format(days, "day");
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatMemberDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatMemberYear(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
  }).format(new Date(value));
}

function getLowCount(scan: ScanSummary) {
  return Math.max(
    0,
    scan.findingsCount -
      scan.criticalFindings -
      scan.highFindings -
      scan.mediumFindings,
  );
}

function getScoreTone(score: number | null): ScoreTone {
  if (score === null) {
    return {
      color: "#4B5670",
      glow: "rgba(255, 59, 59, 0.18)",
      label: "NO DATA",
      stroke: "rgba(255, 59, 59, 0.2)",
    };
  }

  if (score <= 40) {
    return {
      color: "#FF3B3B",
      glow: "rgba(255, 59, 59, 0.35)",
      label: "CRITICAL",
      stroke: "#FF3B3B",
    };
  }

  if (score <= 70) {
    return {
      color: "#FFB800",
      glow: "rgba(255, 184, 0, 0.32)",
      label: "AT RISK",
      stroke: "#FFB800",
    };
  }

  return {
    color: "#22C55E",
    glow: "rgba(34, 197, 94, 0.3)",
    label: "SECURE",
    stroke: "#22C55E",
  };
}

function getSeverityDot(scan: ScanSummary) {
  if (scan.criticalFindings > 0) {
    return {
      color: "#FF3B3B",
      glow: "0 0 18px rgba(255, 59, 59, 0.45)",
    };
  }

  if (scan.highFindings > 0) {
    return {
      color: "#FFB800",
      glow: "0 0 16px rgba(255, 184, 0, 0.28)",
    };
  }

  if (scan.mediumFindings > 0 || getLowCount(scan) > 0) {
    return {
      color: "#00D4FF",
      glow: "0 0 16px rgba(0, 212, 255, 0.28)",
    };
  }

  return {
    color: "#22C55E",
    glow: "0 0 16px rgba(34, 197, 94, 0.24)",
  };
}

function getTrendSummary(scans: ScanSummary[]) {
  if (scans.length < 2) {
    return null;
  }

  const latestScan = scans[0];
  const latestTimestamp = new Date(latestScan.createdAt).getTime();
  const oldestComparableScan =
    [...scans]
      .reverse()
      .find((scan) => latestTimestamp - new Date(scan.createdAt).getTime() <= 604800000) ??
    scans[scans.length - 1];

  if (!oldestComparableScan || oldestComparableScan.id === latestScan.id) {
    return null;
  }

  const delta = latestScan.securityScore - oldestComparableScan.securityScore;

  if (delta > 0) {
    return {
      accent: "#22C55E",
      description: `Security score improved +${delta} points this week`,
    };
  }

  if (delta < 0) {
    return {
      accent: "#FFB800",
      description: `Security score changed ${delta} points since your previous scan`,
    };
  }

  return {
    accent: "#6B7592",
    description: "Security score is unchanged from your previous scan",
  };
}

function createActivityItems(
  scans: ScanSummary[],
  profile: Profile,
  relativeReferenceTime: number | null,
): ActivityItem[] {
  const latestSortKey = Math.max(
    new Date(profile.created_at).getTime(),
    ...scans.map((scan) => new Date(scan.createdAt).getTime()),
  );
  const activities: Array<ActivityItem & { sortKey: number }> = [
    {
      description: "Your VibeScan workspace is ready for reports and monitoring.",
      id: "account-created",
      sortKey: new Date(profile.created_at).getTime(),
      timestamp: formatShortDate(profile.created_at),
      title: "Account created",
      tone: "green",
    },
  ];

  for (const scan of scans) {
    const host = extractHostname(scan.url);
    const sortKey = new Date(scan.createdAt).getTime();

    if (scan.status === "failed") {
      activities.push({
        description: `${host} could not be analyzed. Retry the scan to generate a report.`,
        id: `scan-failed-${scan.id}`,
        sortKey,
        timestamp: formatShortDate(scan.createdAt),
        title: "Scan failed",
        tone: "red",
      });
      continue;
    }

    if (scan.status === "complete") {
      const tone =
        scan.criticalFindings > 0
          ? "red"
          : scan.highFindings > 0
            ? "yellow"
            : scan.mediumFindings > 0 || getLowCount(scan) > 0
              ? "cyan"
              : "green";

      activities.push({
        description: `${host} scored ${scan.securityScore}/100 with ${scan.findingsCount} findings.`,
        id: `scan-complete-${scan.id}`,
        sortKey,
        timestamp: formatShortDate(scan.createdAt),
        title: "Completed scan",
        tone,
      });
      continue;
    }

    activities.push({
      description: `${host} is still in progress. Last activity was ${
        relativeReferenceTime === null
          ? "recently"
          : formatRelativeTime(scan.createdAt, relativeReferenceTime)
      }.`,
      id: `scan-progress-${scan.id}`,
      sortKey,
      timestamp: formatShortDate(scan.createdAt),
      title: scan.status === "running" ? "Scan running" : "Scan queued",
      tone: scan.status === "running" ? "cyan" : "yellow",
    });
  }

  if (profile.scan_credits === 0) {
    activities.push({
      description: "0 scan credits - buy a scan or upgrade to Pro to keep scanning.",
      id: "credits-warning",
      sortKey: latestSortKey + 1,
      timestamp: "Now",
      title: "Credits depleted",
      tone: "yellow",
    });
  }

  return activities
    .sort((left, right) => right.sortKey - left.sortKey)
    .slice(0, 6)
    .map((activity) => {
      const { sortKey, ...rest } = activity;
      void sortKey;
      return rest;
    });
}

function AnimatedCounter({
  className,
  value,
}: {
  className?: string;
  value: number;
}) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latestValue) {
        setDisplayValue(Math.round(latestValue));
      },
    });

    return () => {
      controls.stop();
    };
  }, [motionValue, value]);

  return (
    <span className={className}>{displayValue.toLocaleString("en-US")}</span>
  );
}

function SidebarLink({
  active,
  badge,
  href,
  icon,
  label,
  onNavigate,
}: NavItem & {
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-[8px] border px-[10px] py-[9px] text-[13px] font-medium ${
        active
          ? "border-[rgba(255,59,59,0.15)] bg-[rgba(255,59,59,0.10)] text-[#F0F4FF]"
          : "border-transparent text-[#6B7592] hover:bg-white/4 hover:text-[#F0F4FF]"
      }`}
    >
      <span className="flex w-4 shrink-0 items-center justify-center text-sm">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {typeof badge === "number" ? (
        <span className="ml-auto rounded-full bg-[rgba(255,59,59,0.12)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#FF7070]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileTabBar({
  activeHash,
  onNavigate,
  pathname,
}: {
  activeHash: string;
  onNavigate: (href: string) => void;
  pathname: string;
}) {
  const items: NavItem[] = [
    { href: "/dashboard", icon: "⬡", label: "Dashboard" },
    { href: "/scan", icon: "⚡", label: "New Scan" },
    { href: "/dashboard#history", icon: "📋", label: "History" },
    { href: "/dashboard#findings", icon: "🔴", label: "Findings" },
    { href: "/#pricing", icon: "💳", label: "Billing" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CONTAINER_TRANSITION}
      className="fixed inset-x-4 bottom-4 z-40 rounded-[18px] border border-white/8 bg-[rgba(10,15,26,0.92)] px-3 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const hash = item.href.split("#")[1] ?? "";
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard" && !activeHash
              : hash
                ? pathname === "/dashboard" && activeHash === hash
                : pathname === item.href;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.href)}
              className={`flex h-11 items-center justify-center rounded-[12px] border text-base ${
                isActive
                  ? "border-[rgba(255,59,59,0.16)] bg-[rgba(255,59,59,0.12)] text-[#F0F4FF]"
                  : "border-transparent text-[#6B7592]"
              }`}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}

function DashboardStatTile({
  description,
  icon,
  tag,
  value,
}: {
  description: string;
  icon: string;
  tag: string;
  value: React.ReactNode;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-[14px] border border-white/6 bg-[#0A0F1A] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg">{icon}</span>
        <span className="rounded-[4px] bg-white/5 px-[7px] py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6B7592]">
          {tag}
        </span>
      </div>
      <div className="mt-4">{value}</div>
      <p className="mt-2 text-[11px] text-[#6B7592]">{description}</p>
    </motion.div>
  );
}

function SeverityCard({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: {
    bg: string;
    border: string;
    text: string;
  };
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-[14px] border bg-[#0A0F1A] p-5"
      style={{
        borderColor: tone.border,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02)`,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4B5670]">
        {label}
      </p>
      <p
        className="mt-3 font-mono text-[28px] font-semibold"
        style={{ color: tone.text }}
      >
        {count}
      </p>
      <div
        className="mt-4 h-1.5 rounded-full"
        style={{
          background: tone.bg,
        }}
      />
    </motion.div>
  );
}

function QuickActionButton({
  label,
  onClick,
  tone = "ghost",
}: {
  label: string;
  onClick: () => void;
  tone?: "ghost" | "primary";
}) {
  const classes =
    tone === "primary"
      ? "border-transparent bg-[#FF3B3B] text-white shadow-[0_10px_30px_rgba(255,59,59,0.25)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(255,59,59,0.35)]"
      : "border-white/8 bg-white/4 text-[#C9D3EA] hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/6 hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[10px] border px-3 py-2 text-[12px] font-medium ${classes}`}
    >
      {label}
    </button>
  );
}

export function DashboardShell({
  paymentSuccess,
  profile,
  scans,
  signOutAction,
  totalScansUsed,
  user,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [profileState, setProfileState] = useState(profile);
  const [showPaymentToast, setShowPaymentToast] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const [referenceTime, setReferenceTime] = useState<number | null>(null);

  const displayEmail = user.email ?? profile.email;
  const latestScan = scans[0] ?? null;
  const latestScanLowCount = latestScan ? getLowCount(latestScan) : 0;
  const scoreTone = getScoreTone(latestScan?.securityScore ?? null);
  const scoreValue = latestScan?.securityScore ?? null;
  const scoreOffset =
    scoreValue === null
      ? RING_CIRCUMFERENCE
      : RING_CIRCUMFERENCE * (1 - scoreValue / 100);
  const trendSummary = getTrendSummary(scans);
  const activityItems = createActivityItems(scans, profileState, referenceTime);

  function handleNavigation(href: string) {
    if (href.includes("#")) {
      const hash = href.split("#")[1] ?? "";
      setActiveHash(hash);
    } else if (href === "/dashboard") {
      setActiveHash("");
    }

    router.push(href);
  }

  const workspaceItems: NavItem[] = [
    { href: "/dashboard", icon: "⬡", label: "Dashboard" },
    { href: "/scan", icon: "⚡", label: "New Scan" },
    {
      badge: totalScansUsed,
      href: "/dashboard#history",
      icon: "📋",
      label: "Scan History",
    },
  ];

  const reportItems: NavItem[] = [
    {
      href: "/dashboard#findings",
      icon: "🔴",
      label: "Critical Findings",
    },
    {
      href: "/dashboard#shared",
      icon: "📤",
      label: "Shared Reports",
    },
  ];

  const accountItems: NavItem[] = [
    { href: "/#pricing", icon: "💳", label: "Billing" },
    { href: "/dashboard#account", icon: "⚙", label: "Settings" },
  ];

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setReferenceTime(Date.now());
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash.replace(/^#/, ""));
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    if (!showPaymentToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowPaymentToast(false);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showPaymentToast]);

  const confirmPayment = useEffectEvent(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      return false;
    }

    setProfileState(data);

    if (data.scan_credits > 0 || data.subscription_status === "active") {
      setShowPaymentToast(true);
      router.replace(pathname, { scroll: false });
      startTransition(() => {
        router.refresh();
      });
      return true;
    }

    return false;
  });

  useEffect(() => {
    if (!paymentSuccess) {
      return undefined;
    }

    let isCancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (isCancelled) {
        return;
      }

      attempts += 1;
      const confirmed = await confirmPayment();

      if (confirmed || attempts >= 5) {
        if (!confirmed) {
          router.replace(pathname, { scroll: false });
        }

        isCancelled = true;
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pathname, paymentSuccess, router]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05080F] text-[#F0F4FF] md:h-screen">
      <div className="flex min-h-screen flex-col md:grid md:h-screen md:grid-cols-[220px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={CONTAINER_TRANSITION}
          className="hidden h-screen overflow-hidden border-r border-white/6 bg-[#0A0F1A] md:flex md:flex-col"
        >
          <div className="border-b border-white/6 px-5 py-6">
            <div className="font-mono text-[16px] font-semibold tracking-[-0.02em] text-[#F0F4FF]">
              Vibe<span className="text-[#FF3B3B]">Scan</span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4B5670]">
              Security Scanner
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <div>
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                Workspace
              </p>
              <div className="space-y-1.5">
                {workspaceItems.map((item) => {
                  const hash = item.href.split("#")[1] ?? "";
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard" && !activeHash
                      : pathname === "/dashboard" && activeHash === hash;

                  return (
                    <SidebarLink
                      key={item.label}
                      {...item}
                      active={active}
                      onNavigate={() => {
                        if (item.href.includes("#")) {
                          setActiveHash(hash);
                        } else {
                          setActiveHash("");
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                Reports
              </p>
              <div className="space-y-1.5">
                {reportItems.map((item) => {
                  const hash = item.href.split("#")[1] ?? "";

                  return (
                    <SidebarLink
                      key={item.label}
                      {...item}
                      active={pathname === "/dashboard" && activeHash === hash}
                      onNavigate={() => setActiveHash(hash)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                Account
              </p>
              <div className="space-y-1.5">
                {accountItems.map((item) => {
                  const hash = item.href.split("#")[1] ?? "";
                  const active = hash
                    ? pathname === "/dashboard" && activeHash === hash
                    : pathname === item.href;

                  return (
                    <SidebarLink
                      key={item.label}
                      {...item}
                      active={active}
                      onNavigate={hash ? () => setActiveHash(hash) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div
            id="account"
            className="border-t border-white/6 px-5 py-4"
          >
            <div className="flex items-center gap-3 rounded-[14px] border border-white/6 bg-white/4 px-3 py-3">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FF3B3B,#FF6B6B)] font-mono text-[12px] font-bold text-white">
                {(displayEmail[0] ?? "V").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-[#6B7592]">{displayEmail}</p>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="mt-0.5 text-[11px] text-[#4B5670] hover:text-[#FF3B3B]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </motion.aside>

        <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#05080F] md:h-screen">
          <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] md:left-[220px]" />

          <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/6 bg-[#05080F] px-4 py-[18px] sm:px-6 md:px-8">
            <div>
              <h1 className="text-[20px] font-bold tracking-[-0.03em] text-[#F0F4FF]">
                Security Dashboard
              </h1>
              <p className="mt-0.5 text-[12px] text-[#6B7592]">
                Monitor your vibe-coded apps - last checked just now
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="rounded-[8px] bg-[#FF3B3B] px-5 py-2.5 text-[13px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,59,59,0.35)]"
            >
              ⚡ New Scan
            </button>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={listVariants}
            className="relative z-10 flex-1 overflow-y-auto px-4 py-7 pb-28 sm:px-6 md:px-8 md:pb-8"
          >
            <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
              <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <motion.section
                  variants={itemVariants}
                  className="relative overflow-hidden rounded-[16px] border border-white/6 bg-[#0A0F1A] p-7"
                >
                  <div className="absolute left-1/2 top-[-40px] h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,59,59,0.08)_0%,transparent_70%)]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#4B5670]">
                      Security Score
                    </p>

                    <motion.div
                      whileHover={{
                        scale: 1.02,
                        filter: `drop-shadow(0 0 24px ${scoreTone.glow})`,
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <div
                        className="absolute inset-0 rounded-full blur-2xl"
                        style={{
                          background: `radial-gradient(circle, ${scoreTone.glow} 0%, transparent 70%)`,
                        }}
                      />
                      <svg
                        viewBox="0 0 140 140"
                        className="relative h-[140px] w-[140px] -rotate-90"
                      >
                        <circle
                          cx="70"
                          cy="70"
                          r="58"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="10"
                        />
                        <motion.circle
                          cx="70"
                          cy="70"
                          r="58"
                          fill="none"
                          stroke={scoreTone.stroke}
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeLinecap="round"
                          strokeWidth="10"
                          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                          animate={{ strokeDashoffset: scoreOffset }}
                          transition={{
                            duration: 1.2,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        />
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        {scoreValue === null ? (
                          <>
                            <div className="font-mono text-[36px] text-[#4B5670]">-</div>
                            <div className="font-mono text-[13px] text-[#4B5670]">/ 100</div>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4B5670]">
                              No Data
                            </div>
                          </>
                        ) : (
                          <>
                            <AnimatedCounter
                              value={scoreValue}
                              className="font-mono text-[36px] font-semibold"
                            />
                            <div className="font-mono text-[13px] text-[#6B7592]">/ 100</div>
                            <div
                              className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em]"
                              style={{ color: scoreTone.color }}
                            >
                              {scoreTone.label}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>

                      <p className="mt-4 max-w-[220px] text-center text-[11px] leading-5 text-[#6B7592]">
                      {latestScan
                        ? `Last scanned: ${extractHostname(latestScan.url)} - ${
                            referenceTime === null
                              ? "recently"
                              : formatRelativeTime(
                                  latestScan.createdAt,
                                  referenceTime,
                                )
                          }`
                        : "Run your first scan to generate a security score"}
                    </p>

                    <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                      <QuickActionButton
                        label="New Scan"
                        onClick={() => router.push("/scan")}
                        tone="primary"
                      />
                      <QuickActionButton
                        label="View Reports"
                        onClick={() => handleNavigation("/dashboard#history")}
                      />
                      <QuickActionButton
                        label="Upgrade"
                        onClick={() => router.push("/#pricing")}
                      />
                    </div>
                  </div>
                </motion.section>

                <motion.section
                  variants={listVariants}
                  className="flex flex-col gap-3"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <DashboardStatTile
                      description="Total scans run"
                      icon="📊"
                      tag="All Time"
                      value={
                        <AnimatedCounter
                          value={totalScansUsed}
                          className="font-mono text-[26px] font-semibold text-[#F0F4FF]"
                        />
                      }
                    />
                    <DashboardStatTile
                      description="Scan credits remaining"
                      icon="🎯"
                      tag="Balance"
                      value={
                        <AnimatedCounter
                          value={profileState.scan_credits}
                          className={`font-mono text-[26px] font-semibold ${
                            profileState.scan_credits === 0
                              ? "text-[#FF3B3B]"
                              : "text-[#F0F4FF]"
                          }`}
                        />
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DashboardStatTile
                      description="Subscription tier"
                      icon="🛡️"
                      tag="Tier"
                      value={
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[18px] font-semibold ${
                              profileState.subscription_tier === "pro"
                                ? "text-[#00D4FF]"
                                : "text-[#6B7592]"
                            }`}
                          >
                            {profileState.subscription_tier === "pro" ? "Pro" : "Free"}
                          </span>
                          {profileState.subscription_tier === "pro" ? (
                            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#00D4FF]">
                              Pro
                            </span>
                          ) : null}
                        </div>
                      }
                    />
                    <DashboardStatTile
                      description={`Member since ${formatMemberYear(profileState.created_at)}`}
                      icon="📅"
                      tag="Joined"
                      value={
                        <span className="font-mono text-[16px] font-semibold text-[#F0F4FF]">
                          {formatMemberDate(profileState.created_at)}
                        </span>
                      }
                    />
                  </div>

                  <motion.div
                    variants={itemVariants}
                    className="rounded-[12px] border border-[rgba(255,59,59,0.20)] bg-[linear-gradient(135deg,rgba(255,59,59,0.06)_0%,#0A0F1A_60%)] p-[18px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6B7592]">
                        Current Plan
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                          profileState.subscription_tier === "pro"
                            ? "bg-[rgba(255,59,59,0.12)] text-[#FF7070]"
                            : "bg-white/5 text-[#6B7592]"
                        }`}
                      >
                        {profileState.subscription_tier === "pro" ? "PRO" : "FREE"}
                      </span>
                    </div>

                    {profileState.subscription_tier === "pro" ? (
                      <>
                        <p className="mt-3 text-[12px] leading-6 text-[#6B7592]">
                          You&apos;re on Pro. Unlimited scans, weekly monitoring, and AI-powered fixes stay active on this workspace.
                        </p>
                        <button
                          type="button"
                          onClick={() => router.push("/#pricing")}
                          className="mt-4 rounded-[7px] border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-medium text-[#B8C3DB] hover:border-white/16 hover:text-white"
                        >
                          Manage billing -&gt;
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 text-[12px] leading-6 text-[#6B7592]">
                          You have {profileState.scan_credits} scan credits. Buy a single scan for $9 or go Pro for unlimited scans plus weekly monitoring alerts.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => router.push("/?plan=pro#pricing")}
                            className="min-w-[180px] flex-1 rounded-[7px] bg-[#FF3B3B] px-4 py-2 text-[12px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,59,59,0.32)]"
                          >
                            ⚡ Get Pro - $19/mo
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push("/?plan=onetime#pricing")}
                            className="rounded-[7px] border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-medium text-[#6B7592] hover:text-white"
                          >
                            $9 one-time
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>

                  {trendSummary ? (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-[12px] border border-white/6 bg-[#0A0F1A] px-4 py-3"
                    >
                      <p className="text-[12px] font-medium" style={{ color: trendSummary.accent }}>
                        {trendSummary.description}
                      </p>
                    </motion.div>
                  ) : null}
                </motion.section>
              </div>

              <section id="findings" className="space-y-4">
                <motion.div variants={itemVariants}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                    Findings Snapshot
                  </p>
                  <h2 className="mt-1 text-[18px] font-semibold text-[#F0F4FF]">
                    Latest scan severity summary
                  </h2>
                </motion.div>

                <motion.div
                  variants={listVariants}
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <SeverityCard
                    label="Critical"
                    count={latestScan?.criticalFindings ?? 0}
                    tone={{
                      bg: "linear-gradient(90deg, rgba(255,59,59,0.32), rgba(255,59,59,0.12))",
                      border: "rgba(255,59,59,0.16)",
                      text: "#FF3B3B",
                    }}
                  />
                  <SeverityCard
                    label="High"
                    count={latestScan?.highFindings ?? 0}
                    tone={{
                      bg: "linear-gradient(90deg, rgba(255,184,0,0.28), rgba(255,184,0,0.1))",
                      border: "rgba(255,184,0,0.16)",
                      text: "#FFB800",
                    }}
                  />
                  <SeverityCard
                    label="Medium"
                    count={latestScan?.mediumFindings ?? 0}
                    tone={{
                      bg: "linear-gradient(90deg, rgba(0,212,255,0.28), rgba(0,212,255,0.1))",
                      border: "rgba(0,212,255,0.16)",
                      text: "#00D4FF",
                    }}
                  />
                  <SeverityCard
                    label="Low"
                    count={latestScanLowCount}
                    tone={{
                      bg: "linear-gradient(90deg, rgba(34,197,94,0.26), rgba(34,197,94,0.1))",
                      border: "rgba(34,197,94,0.16)",
                      text: "#22C55E",
                    }}
                  />
                </motion.div>
              </section>

              <section id="history" className="space-y-4">
                <motion.div
                  variants={itemVariants}
                  className="flex items-end justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                      Scan History
                    </p>
                    <h2 className="mt-1 text-[14px] font-semibold text-[#F0F4FF]">
                      Your scanned apps
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/dashboard#history")}
                    className="text-[12px] text-[#6B7592] hover:text-white"
                  >
                    View all -&gt;
                  </button>
                </motion.div>

                {scans.length === 0 ? (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-[16px] border border-dashed border-white/8 bg-[#0A0F1A] px-8 py-14 text-center"
                  >
                    <div className="text-[40px] opacity-40">🔍</div>
                    <h3 className="mt-4 text-[16px] font-semibold text-[#F0F4FF]">
                      No scans yet
                    </h3>
                    <p className="mx-auto mt-3 max-w-[320px] text-[12px] leading-6 text-[#6B7592]">
                      Paste your Vercel URL and VibeScan will find vulnerabilities your AI missed in under 90 seconds.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/scan")}
                      className="mt-6 rounded-[8px] bg-[#FF3B3B] px-6 py-2.5 text-[13px] font-semibold text-white hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,59,59,0.3)]"
                    >
                      ⚡ Run your first scan
                    </button>
                  </motion.div>
                ) : (
                  <motion.div variants={listVariants} className="space-y-3">
                    {scans.map((scan) => {
                      const dot = getSeverityDot(scan);
                      const scanScoreTone =
                        scan.status === "complete"
                          ? getScoreTone(scan.securityScore)
                          : null;

                      return (
                        <motion.button
                          key={scan.id}
                          variants={itemVariants}
                          whileHover={{ y: -2 }}
                          type="button"
                          onClick={() => router.push(`/report/${scan.id}`)}
                          className="group flex w-full flex-col gap-4 rounded-[12px] border border-white/6 bg-[#0A0F1A] px-5 py-4 text-left hover:border-white/12 md:flex-row md:items-center"
                        >
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: dot.color,
                              boxShadow: dot.glow,
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[#F0F4FF]">
                              {scan.url}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-[#6B7592]">
                              {scan.status === "complete"
                                ? `${scan.criticalFindings} critical  |  ${scan.highFindings} high  |  ${scan.mediumFindings} medium`
                                : `Status: ${scan.status.toUpperCase()}`}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-4 md:block md:text-right">
                            <div>
                              {scan.status === "complete" ? (
                                <p
                                  className="font-mono text-[12px] font-semibold"
                                  style={{ color: scanScoreTone?.color }}
                                >
                                  {scan.securityScore}/100
                                </p>
                              ) : (
                                <p className="font-mono text-[12px] font-semibold uppercase text-[#6B7592]">
                                  {scan.status}
                                </p>
                              )}
                              <p className="mt-1 font-mono text-[11px] text-[#4B5670]">
                                {formatShortDate(scan.createdAt)}
                              </p>
                            </div>
                            <p className="text-[12px] text-[#6B7592] opacity-100 md:mt-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                              View report -&gt;
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </section>

              <div id="shared" />

              <section className="space-y-4">
                <motion.div variants={itemVariants}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4B5670]">
                    Activity
                  </p>
                  <h2 className="mt-1 text-[14px] font-semibold text-[#F0F4FF]">
                    Recent events
                  </h2>
                </motion.div>

                {activityItems.length === 0 ? (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-[12px] border border-dashed border-white/8 bg-[#0A0F1A] px-6 py-6 text-center text-[12px] text-[#6B7592]"
                  >
                    No activity yet
                  </motion.div>
                ) : (
                  <motion.div variants={listVariants} className="space-y-2">
                    {activityItems.map((item) => {
                      const toneClasses: Record<ActivityTone, string> = {
                        cyan: "bg-[#00D4FF]",
                        green: "bg-[#22C55E]",
                        red: "bg-[#FF3B3B]",
                        yellow: "bg-[#FFB800]",
                      };

                      return (
                        <motion.div
                          key={item.id}
                          variants={itemVariants}
                          className="flex items-center gap-4 rounded-[10px] border border-white/6 bg-[#0A0F1A] px-[18px] py-[14px]"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${toneClasses[item.tone]}`}
                          />
                          <p className="min-w-0 flex-1 text-[12px] text-[#6B7592]">
                            <span className="font-medium text-[#F0F4FF]">{item.title}</span>
                            {" - "}
                            {item.description}
                          </p>
                          <span className="shrink-0 font-mono text-[11px] text-[#4B5670]">
                            {item.timestamp}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      </div>

      <MobileTabBar
        activeHash={activeHash}
        onNavigate={handleNavigation}
        pathname={pathname}
      />

      <AnimatePresence>
        {showPaymentToast ? (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={CONTAINER_TRANSITION}
            className="fixed right-4 top-4 z-50 rounded-[14px] border border-[rgba(34,197,94,0.24)] bg-[rgba(13,27,18,0.96)] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <p className="text-[13px] font-medium text-[#9AF2B5]">
              Payment confirmed - you&apos;re ready to scan!
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}