"use client";

import { useActionState, useState } from "react";
import { donateAction, type DonateFormState } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import type { RewardTier } from "@/lib/types";
import { WalletStatusPanel } from "./wallet-status";

const initialState: DonateFormState = { status: "idle" };

export function DonateForm({ slug, rewardTiers }: { slug: string; rewardTiers: RewardTier[] }) {
  const [state, formAction, pending] = useActionState(
    donateAction.bind(null, slug),
    initialState
  );
  const firstAvailable = rewardTiers.find((t) => t.claimed < t.totalSupply);
  const [selectedTierId, setSelectedTierId] = useState(firstAvailable?.id ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <WalletStatusPanel compact />

      <div>
        <span className="mb-2 block text-sm font-medium text-foreground/70">
          選擇 RWA Token 回饋方案
        </span>
        <div className="flex flex-col gap-2">
          {rewardTiers.map((t) => {
            const soldOut = t.claimed >= t.totalSupply;
            const remaining = t.totalSupply - t.claimed;
            return (
              <label
                key={t.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition ${
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
                        {formatCurrency(t.price)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/60">{t.description}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-foreground/40">
                      <span className="font-mono">{t.tokenSymbol}</span>
                      <span>{soldOut ? "已兌換完畢" : `剩 ${remaining} 個 Token`}</span>
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
          您的稱呼（選填）
        </label>
        <input
          id="backerName"
          name="backerName"
          placeholder="匿名贊助者"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70" htmlFor="message">
          給發起人的話（選填）
        </label>
        <textarea
          id="message"
          name="message"
          rows={2}
          placeholder="加油！"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedTierId}
        className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "處理中…" : "取得這個 RWA Token"}
      </button>

      {state.status !== "idle" && (
        <p
          role="status"
          className={`text-sm ${
            state.status === "success" ? "text-brand-strong" : "text-danger"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
