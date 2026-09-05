"use client";

import { useEffect, useState } from "react";
import { formatCompactNumber } from "@/lib/format";

const DURATION_MS = 1200;

export function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  // Must match the server's render (0) exactly, or React flags a hydration
  // mismatch on first paint — the count-up only starts after mount.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // A scroll-triggered (IntersectionObserver) start isn't reliable across
    // every browser/environment, and these numbers shouldn't stay stuck at 0
    // because of it. Count up shortly after mount instead.
    let frame: number;
    const start = () => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startTime) / DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(eased * value));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const kickoff = requestAnimationFrame(start);
    return () => {
      cancelAnimationFrame(kickoff);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span>
      {formatCompactNumber(display)}
      {suffix}
    </span>
  );
}
