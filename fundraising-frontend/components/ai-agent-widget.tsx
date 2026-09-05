"use client";

import { address, lamports as lamportsAmount } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppClient } from "@/app/providers";
import {
  analyzeCampaigns,
  formatProposalMessage,
  parseUserPreferences,
  SUGGESTED_PROMPTS,
  type AgentProposal,
} from "@/lib/ai-agent";
import {
  agentBuySharesAction,
  agentDonateAction,
} from "@/lib/actions";
import type { Campaign } from "@/lib/types";
import { useWalletBalance } from "./wallet-status";

const INTRO_SEEN_KEY = "ai-agent-intro-seen";
const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

type ChatRole = "user" | "agent";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "告訴 AI Agent 你的偏好",
    description: "直接用一句話說明預算、風險承受度與想投資的類別，不需要填表單。",
  },
  {
    step: "2",
    title: "AI Agent 分析並回報風險",
    description: "AI Agent 查詢候選專案、計算風險分數，並說明它打算怎麼分配預算。",
  },
  {
    step: "3",
    title: "確認後自動下單",
    description: "你同意後，AI Agent 送出 Solana devnet 付款並完成購買，結果即時顯示在對話中。",
  },
];

function solToLamports(amount: number): bigint {
  const whole = Math.trunc(amount);
  const frac = amount - whole;
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(Math.round(frac * Number(LAMPORTS_PER_SOL)));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3c-1.2 0-2.2.8-2.5 1.9L8.1 8.5A4.5 4.5 0 0 0 4 12.8V14a2 2 0 0 0 2 2h1.1a3 3 0 0 0 5.8 0H14a2 2 0 0 0 2-2v-1.2a4.5 4.5 0 0 0-4.1-4.3L14.5 4.9C14.2 3.8 13.2 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M8.5 18.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-labelledby="ai-agent-intro-title"
        className="relative max-h-[85%] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉介紹"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition hover:bg-surface-muted hover:text-foreground"
        >
          ✕
        </button>

        <div className="flex flex-wrap items-center gap-2 pr-8">
          <span className="rounded-full border border-brand/30 bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
            Devnet 測試網示範
          </span>
        </div>

        <h2 id="ai-agent-intro-title" className="mt-3 text-lg font-bold text-foreground">
          AI Agent 理財助理
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          AI Agent 會根據你說的預算與風險偏好，分析平台上真實的專案資料、計算風險分數，並自動用
          Solana devnet 測試 SOL 下單購買。目前只會主動買入，不會賣出或監控後續市場變化，且使用的是
          測試網資金，不涉及真實金錢。
        </p>

        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-foreground/60">
          我會即時讀取平台上所有進行中的專案，包括募資進度、投資條款與回饋方案內容。
        </p>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">運作方式</p>
          <ol className="mt-3 space-y-3">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/60">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
        >
          開始聊天
        </button>
      </div>
    </div>
  );
}

export function AiAgentWidget() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const { lamports, status: balanceStatus } = useWalletBalance();

  const [open, setOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const listRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  const pushMessage = useCallback((role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: createId(), role, content }]);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, proposal]);

  useEffect(() => {
    if (!open || bootstrapped.current) return;
    bootstrapped.current = true;

    const seen = sessionStorage.getItem(INTRO_SEEN_KEY);
    setShowIntro(!seen);

    void fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data: Campaign[]) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]));

    setMessages([
      {
        id: createId(),
        role: "agent",
        content:
          "你好，我是 AI Agent 理財助理。請告訴我你的預算（SOL）、風險偏好與想投資的類別，我會分析平台上的專案並提出配置建議。",
      },
    ]);
  }, [open]);

  function handleOpen() {
    setOpen(true);
  }

  function handleCloseIntro() {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  }

  function handleClosePanel() {
    setOpen(false);
  }

  async function handleAnalyze(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || executing) return;

    pushMessage("user", trimmed);
    setInput("");
    setProposal(null);

    if (/^(確認|確認下單|同意|好)/.test(trimmed)) {
      if (!proposal) {
        pushMessage("agent", "請先描述你的投資偏好，等我提出配置建議後再確認下單。");
        return;
      }
      await executeProposal(proposal);
      return;
    }

    setLoading(true);
    try {
      let source = campaigns;
      if (source.length === 0) {
        const res = await fetch("/api/campaigns");
        source = await res.json();
        setCampaigns(Array.isArray(source) ? source : []);
      }

      const preferences = parseUserPreferences(trimmed);
      const result = analyzeCampaigns(source, preferences);
      setProposal(result);
      pushMessage("agent", formatProposalMessage(result));
    } catch {
      pushMessage("agent", "分析失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  async function executeProposal(current: AgentProposal) {
    if (!connected?.signer) {
      pushMessage("agent", "請先連接錢包，我才能用 devnet 測試 SOL 幫你下單。");
      return;
    }

    const totalLamports = solToLamports(current.preferences.budgetSol);
    if (lamports !== undefined && lamports < totalLamports) {
      pushMessage("agent", "錢包 devnet SOL 餘額不足，請先從水龍頭領取測試 SOL 後再試。");
      return;
    }

    setExecuting(true);
    pushMessage("agent", "收到確認，正在送出 devnet 付款並完成購買…");

    const treasury =
      process.env.NEXT_PUBLIC_AGENT_TREASURY_ADDRESS ??
      "11111111111111111111111111111112";

    const signatures: string[] = [];
    const errors: string[] = [];

    for (const item of current.recommendations) {
      try {
        const transfer = getTransferSolInstruction({
          source: connected.signer,
          destination: address(treasury),
          amount: lamportsAmount(solToLamports(item.allocationSol)),
        });
        const result = await client.sendTransaction([transfer]);
        signatures.push(result.context.signature);

        if (item.campaign.fundingModel === "investment") {
          await agentBuySharesAction(item.campaign.slug, 1);
        } else {
          const tier = item.campaign.rewardTiers.find((t) => t.claimed < t.totalSupply);
          if (tier) {
            await agentDonateAction(item.campaign.slug, tier.id);
          }
        }
      } catch (error) {
        errors.push(
          `${item.campaign.title}：${error instanceof Error ? error.message : "下單失敗"}`
        );
      }
    }

    if (signatures.length > 0) {
      pushMessage(
        "agent",
        `下單完成！已用 devnet 測試 SOL 完成 ${signatures.length} 筆付款，並同步更新平台紀錄。\n${signatures
          .map(
            (sig, i) =>
              `交易 ${i + 1}：https://explorer.solana.com/tx/${sig}?cluster=devnet`
          )
          .join("\n")}`
      );
    }

    if (errors.length > 0) {
      pushMessage("agent", `部分專案未能完成：\n${errors.join("\n")}`);
    }

    if (signatures.length === 0 && errors.length > 0) {
      pushMessage("agent", "所有下單都失敗了，請確認錢包已連接且有足夠 devnet SOL。");
    }

    setProposal(null);
    setExecuting(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="開啟 AI Agent 理財助理"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition hover:scale-105 hover:bg-brand-strong"
        >
          <AgentIcon className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[min(640px,calc(100vh-3rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {showIntro && <IntroModal onClose={handleCloseIntro} />}

          <header className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AgentIcon className="h-5 w-5 text-brand" />
                <p className="truncate text-sm font-bold text-foreground">AI Agent 理財助理</p>
              </div>
              <p className="mt-0.5 text-xs text-foreground/50">Devnet 測試網示範</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-foreground/50 transition hover:bg-surface hover:text-foreground"
              >
                說明
              </button>
              <button
                type="button"
                onClick={handleClosePanel}
                aria-label="關閉聊天"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/50 transition hover:bg-surface hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-brand text-white"
                      : "bg-surface-muted text-foreground/80"
                  }`}
                >
                  {message.role === "agent"
                    ? message.content.split(/(https:\/\/\S+)/g).map((part, i) =>
                        part.startsWith("https://") ? (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all font-medium text-brand underline"
                          >
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )
                    : message.content}
                </div>
              </div>
            ))}

            {loading && (
              <p className="text-xs text-foreground/45">AI Agent 正在分析專案…</p>
            )}

            {proposal && !executing && (
              <button
                type="button"
                onClick={() => void executeProposal(proposal)}
                disabled={!connected?.signer}
                className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connected?.signer ? "確認下單（Devnet）" : "請先連接錢包"}
              </button>
            )}
          </div>

          {!connected && (
            <p className="border-t border-border px-4 py-2 text-xs text-foreground/50">
              下單前請先在右上角連接 devnet 錢包。
            </p>
          )}

          {connected && balanceStatus !== "disabled" && lamports !== undefined && (
            <p className="border-t border-border px-4 py-2 text-xs text-foreground/50">
              錢包 devnet 餘額：{(Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(4)} SOL
            </p>
          )}

          <div className="border-t border-border px-3 py-2">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleAnalyze(prompt)}
                  disabled={loading || executing}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-foreground/65 transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleAnalyze(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="例如：我有 0.5 SOL，偏好低風險農業"
                disabled={loading || executing}
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || executing || !input.trim()}
                className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                送出
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
