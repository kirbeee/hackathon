"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AgentChat } from "./agent-chat";

const STEPS = [
  {
    title: "告訴 AI Agent 你的偏好",
    description: "直接用一句話說明預算、風險承受度與想投資的類別，不需要填表單。",
  },
  {
    title: "AI Agent 分析並回報風險",
    description: "AI Agent 查詢候選專案、計算風險分數，並說明它打算怎麼分配預算。",
  },
  {
    title: "確認後自動下單",
    description: "你同意後，AI Agent 送出 Solana devnet 付款並完成購買，結果即時顯示在對話中。",
  },
];

const SEEN_INTRO_KEY = "agent-fab-intro-seen";

export function AiAgentFab() {
  const [open, setOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(SEEN_INTRO_KEY)) setShowIntro(false);
      } catch {
        // localStorage unavailable (private browsing etc.) — default to showing the intro.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function dismissIntro() {
    setShowIntro(false);
    try {
      localStorage.setItem(SEEN_INTRO_KEY, "1");
    } catch {
      // Non-fatal — the intro will just show again next time.
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex max-h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-md [animation:pop-in_0.15s_ease-out]">
          {showIntro ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-strong">
                  Devnet 測試網示範
                </span>
                <button
                  type="button"
                  onClick={dismissIntro}
                  aria-label="關閉介紹，開始對話"
                  className="shrink-0 text-foreground/40 transition hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">AI Agent 理財助理</h2>
              <p className="text-sm leading-relaxed text-foreground/60">
                AI Agent 會根據你說的預算與風險偏好，分析平台上真實的專案資料、計算風險分數，並自動用
                Solana devnet 測試 SOL 下單購買。目前只會主動買入，不會賣出或監控後續市場變化，且使用的是
                測試網資金，不涉及真實金錢。
              </p>

              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                運作方式
              </p>
              <ol className="flex flex-col gap-3">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground/60">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <AgentChat onClose={() => setOpen(false)} />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "關閉 AI Agent" : "開啟 AI Agent 理財助理"}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface transition hover:border-brand/50 hover:shadow-sm active:scale-95"
      >
        <Image src="/cathay-tree.svg" alt="" aria-hidden="true" width={27} height={20} />
      </button>
    </div>
  );
}
