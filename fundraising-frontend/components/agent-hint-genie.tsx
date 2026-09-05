"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const TIPS = [
  "我會即時讀取平台上所有進行中的專案，包括募資進度、投資條款與回饋方案內容。",
  "風險分數是固定公式算出來的（募資進度、投資人分潤比例、溢價率、專案狀態），我只負責解讀分數、不會自己編數字。",
  "在你設定的預算與風險上限內，我會用自己的 Solana 錢包送出真實付款完成購買——目前是 devnet 測試網示範，不動用真實資金。",
  "我目前只負責主動買入，不會賣出或監控後續市場變化。",
];

const AUTO_ADVANCE_MS = 6000;

export function AgentHintGenie({ compact = false }: { compact?: boolean } = {}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TIPS.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const avatarSize = compact ? "h-8 w-8" : "h-10 w-10";
  const [imageWidth, imageHeight] = compact ? [18, 13] : [22, 16];

  return (
    <div
      className={`flex items-start gap-3 ${compact ? "" : "mt-10"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full border border-border bg-surface`}
      >
        <Image src="/cathay-tree.svg" alt="" aria-hidden="true" width={imageWidth} height={imageHeight} />
      </span>

      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground/70">{TIPS[index]}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {TIPS.map((tip, i) => (
              <button
                key={tip}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`提示 ${i + 1}／${TIPS.length}`}
                aria-current={i === index}
                className={`h-1.5 w-4 rounded-full transition ${
                  i === index ? "bg-brand" : "bg-border hover:bg-foreground/20"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
            className="ml-auto text-xs font-medium text-brand hover:underline"
          >
            下一個提示
          </button>
        </div>
      </div>
    </div>
  );
}
