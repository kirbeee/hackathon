"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api-client";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import type { AppClient } from "@/app/providers";
import { sendTokenPayment } from "@/lib/token-payment";
import { TWD_PER_USDC } from "@/lib/rwa-payment";
import type { RewardTier } from "@/lib/types";

interface SubmitState {
  status: "idle" | "success" | "error";
  message?: string;
}

export function DonateForm({ slug, rewardTiers }: { slug: string; rewardTiers: RewardTier[] }) {
  const router = useRouter();
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const firstAvailable = rewardTiers.find((t) => t.claimed < t.totalSupply);
  const [selectedTierId, setSelectedTierId] = useState(firstAvailable?.id ?? "");
  const [backerName, setBackerName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selectedTier = rewardTiers.find((tier) => tier.id === selectedTierId);
    if (!selectedTier || selectedTier.claimed >= selectedTier.totalSupply) return;
    if (!connected?.signer) {
      setState({ status: "error", message: "請先連接 Phantom 錢包。" });
      return;
    }

    setPending(true);
    setState({ status: "idle" });
    try {
      const signature = await sendTokenPayment({
        client,
        signer: connected.signer,
        currency: "USDC",
        amount: (selectedTier.price / TWD_PER_USDC).toFixed(6),
      });
      await apiPost(`/campaigns/${slug}/donate`, {
        tierId: selectedTierId,
        backerName,
        message,
        txSignature: signature,
      });
      setState({
        status: "success",
        message: `認購完成，RWA Token 已記錄至你的投資部位（交易 ${signature.slice(0, 8)}…）`,
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "認購失敗，請稍後再試。",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-foreground/70">
          選擇債權認購方案
        </span>
        <div className="flex flex-col gap-2">
          {rewardTiers.map((t) => {
            const soldOut = t.claimed >= t.totalSupply;
            const remaining = t.totalSupply - t.claimed;
            return (
              <label
                key={t.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition ${
                  soldOut
                    ? "cursor-not-allowed border-border opacity-50"
                    : selectedTierId === t.id
                      ? "border-brand bg-brand-soft"
                      : "border-border hover:border-brand/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="radio"
                    name="tierId"
                    value={t.id}
                    checked={selectedTierId === t.id}
                    onChange={() => setSelectedTierId(t.id)}
                    disabled={soldOut}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{t.title}</span>
                      <span className="whitespace-nowrap font-semibold text-brand-strong">
                        {t.price / TWD_PER_USDC} USDC / 枚
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/60">{t.description}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-foreground/40">
                      <span className="font-mono">{t.tokenSymbol}</span>
                      <span>{soldOut ? "已認購完畢" : `剩餘 ${remaining} 個單位`}</span>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70" htmlFor="backerName">
          投資人名稱（選填）
        </label>
        <input
          id="backerName"
          value={backerName}
          onChange={(e) => setBackerName(e.target.value)}
          placeholder="匿名投資人"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70" htmlFor="message">
          投資備註（選填）
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="記錄本次認購目的或風險考量"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <p className="text-xs text-foreground/50">
        每次認購 1 枚 RWA Token，使用 Devnet USDC 付款。
        {connected ? "錢包已連接。" : "請先連接錢包。"}
      </p>

      <button
        type="submit"
        disabled={pending || !selectedTierId || !connected?.signer}
        className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {pending ? "認購處理中…" : "認購此債權單位"}
      </button>

      {state.status !== "idle" && (
        <p
          key={state.message}
          role="status"
          className={`text-sm opacity-0 [animation:fade-in_0.3s_ease-out_forwards] ${
            state.status === "success" ? "text-brand-strong" : "text-danger"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
