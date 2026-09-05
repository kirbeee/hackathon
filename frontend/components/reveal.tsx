"use client";

import { useEffect, useState } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  // Must match the server's render (false) exactly, or React flags a
  // hydration mismatch on first paint — the reveal only starts after mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // A scroll-triggered (IntersectionObserver) reveal isn't reliable across
    // every browser/environment, and this content shouldn't depend on it to
    // be visible at all. Fade in shortly after mount instead — same pattern
    // as the hero's own entrance.
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className ?? ""}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
