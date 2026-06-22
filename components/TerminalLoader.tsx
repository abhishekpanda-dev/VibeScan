"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanStatus } from "@/types/database";

type TerminalLoaderProps = {
  status: Extract<ScanStatus, "pending" | "running">;
  url: string;
};

type LoaderTone = "white" | "muted" | "cyan" | "yellow" | "green";

const toneClasses: Record<LoaderTone, string> = {
  cyan: "text-[var(--cyan)]",
  green: "text-[#7DF0A0]",
  muted: "text-[var(--muted)]",
  white: "text-[var(--white)]",
  yellow: "text-[#FFD166]",
};

function buildTerminalLines(
  status: Extract<ScanStatus, "pending" | "running">,
  url: string,
) {
  if (status === "pending") {
    return [
      { delay: 0, text: `$ queue ${url}`, tone: "white" as const },
      { delay: 700, text: "[info] Scan accepted and placed in the queue.", tone: "muted" as const },
      { delay: 1400, text: "[wait] Reserving worker capacity...", tone: "yellow" as const },
      { delay: 2200, text: "[wait] Preparing server-side checks...", tone: "muted" as const },
      { delay: 3000, text: "[ready] Refresh this report in a moment to see live status changes.", tone: "cyan" as const },
    ];
  }

  return [
    { delay: 0, text: `$ vibescan ${url}`, tone: "white" as const },
    { delay: 700, text: "[info] Crawling public routes and assets...", tone: "muted" as const },
    { delay: 1400, text: "[info] Inspecting JavaScript bundles and headers...", tone: "muted" as const },
    { delay: 2200, text: "[info] Probing exposed configuration files...", tone: "cyan" as const },
    { delay: 3000, text: "[wait] Findings are being stored on the report record.", tone: "green" as const },
  ];
}

export function TerminalLoader({ status, url }: TerminalLoaderProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalLines = useMemo(() => buildTerminalLines(status, url), [status, url]);
  const visibleLines = useMemo(
    () => terminalLines.slice(0, visibleCount),
    [terminalLines, visibleCount],
  );

  useEffect(() => {
    const refreshIntervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 3000);

    return () => {
      window.clearInterval(refreshIntervalId);
    };
  }, [router]);

  useEffect(() => {
    const timeoutIds: number[] = [];
    const totalDuration = 500 + terminalLines[terminalLines.length - 1].delay;

    const runSequence = () => {
      terminalLines.forEach((line, index) => {
        timeoutIds.push(
          window.setTimeout(() => {
            setVisibleCount(index + 1);
          }, 500 + line.delay),
        );
      });

      timeoutIds.push(
        window.setTimeout(() => {
          setShowCursor(true);
        }, totalDuration + 120),
      );

      timeoutIds.push(
        window.setTimeout(() => {
          setVisibleCount(0);
          setShowCursor(false);
          runSequence();
        }, totalDuration + 3500),
      );
    };

    runSequence();

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [terminalLines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [showCursor, visibleLines]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg2)] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg3)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">
          vibescan - {status === "pending" ? "queued" : "running"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="min-h-[320px] overflow-hidden p-5 font-mono text-[12.5px] leading-[1.9]"
      >
        {visibleLines.map((line, index) => (
          <div key={`${line.text}-${index}`} className="mb-1 flex items-start gap-3">
            <span className="text-[var(--muted)]">$</span>
            <span className={`flex-1 whitespace-pre-wrap ${toneClasses[line.tone]}`}>
              {line.text}
            </span>
          </div>
        ))}
        {showCursor ? (
          <div className="flex items-start gap-3">
            <span className="text-[var(--muted)]">$</span>
            <span className="animate-terminal-blink text-[var(--white)]">|</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
