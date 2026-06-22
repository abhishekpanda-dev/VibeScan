"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { terminalLines, type TerminalTone } from "@/components/landing/content";

const toneClasses: Record<TerminalTone, string> = {
  white: "text-[var(--white)]",
  muted: "text-[var(--muted)]",
  red: "text-[var(--red)]",
  yellow: "text-[#FFB800]",
  cyan: "text-[var(--cyan)]",
  green: "text-[#3DCA6A]",
};

export default function TerminalScanner() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleLines = useMemo(
    () => terminalLines.slice(0, visibleCount),
    [visibleCount],
  );

  useEffect(() => {
    const timeoutIds: number[] = [];
    const totalDuration = 400 + terminalLines[terminalLines.length - 1].delay;

    const runSequence = () => {
      terminalLines.forEach((line, index) => {
        timeoutIds.push(
          window.setTimeout(() => {
            setVisibleCount(index + 1);
          }, 400 + line.delay),
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
        }, totalDuration + 4000),
      );
    };

    runSequence();

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, showCursor]);

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg3)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">
          vibescan — scanning myapp.vercel.app
        </span>
      </div>
      <div
        ref={containerRef}
        className="min-h-[280px] overflow-hidden p-5 font-mono text-[12.5px] leading-[1.8] md:min-h-[320px]"
      >
        {visibleLines.map((line, index) => (
          <div key={`${line.text}-${index}`} className="mb-0.5 flex items-start gap-[10px]">
            <span className="w-0 shrink-0 text-[var(--muted)]" aria-hidden />
            <span className={`flex-1 whitespace-pre-wrap ${toneClasses[line.tone]}`}>
              {line.text || "\u00A0"}
            </span>
          </div>
        ))}
        {showCursor ? (
          <div className="mb-0.5 flex items-start gap-[10px]">
            <span className="w-0 shrink-0 text-[var(--muted)]" aria-hidden />
            <span className="animate-terminal-blink text-[var(--white)]">█</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
