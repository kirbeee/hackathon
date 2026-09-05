"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  claimInvestmentRewardAction,
  farmerBuyBackAllAction,
  runAnnualSettlementAction,
  setInvestmentStatusAction,
  type InvestmentActionState,
} from "@/lib/actions";
import { apiPost } from "@/lib/api-client";
import { STATUS_LABELS } from "@/lib/campaigns";
import { formatTWDT } from "@/lib/format";
import { LAMPORTS_PER_SHARE_UNIT } from "@/lib/solana";
import { useTreasuryPayment } from "@/lib/use-treasury-payment";
import type { InvestmentTerms, InvestorPosition, ProjectStatus } from "@/lib/types";

const initialState: InvestmentActionState = { status: "idle" };

function ActionMessage({ state }: { state: InvestmentActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      key={state.message}
      role="status"
      className={`text-sm opacity-0 [animation:fade-in_0.3s_ease-out_forwards] ${state.status === "success" ? "text-brand" : "text-danger"}`}
    >
      {state.message}
    </p>
  );
}

export function InvestmentPanel({
  slug,
  investment,
  position,
}: {
  slug: string;
  investment: InvestmentTerms;
  position: InvestorPosition;
}) {
  const router = useRouter();
  const { pay, connected } = useTreasuryPayment();
  const soldOut = investment.mintedShares >= investment.totalShares;
  const remaining = investment.totalShares - investment.mintedShares;

  const [buyPending, setBuyPending] = useState(false);
  const [buyState, setBuyState] = useState<InvestmentActionState>(initialState);

  const [claimState, claimAction, claimPending] = useActionState(
    claimInvestmentRewardAction.bind(null, slug),
    initialState
  );
  const [settleState, settleAction, settlePending] = useActionState(
    runAnnualSettlementAction.bind(null, slug),
    initialState
  );
  const [buybackState, buybackAction, buybackPending] = useActionState(
    farmerBuyBackAllAction.bind(null, slug),
    initialState
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setInvestmentStatusAction.bind(null, slug),
    initialState
  );
  const [amount, setAmount] = useState(1);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setBuyPending(true);
    setBuyState(initialState);
    try {
      const lamports = amount * LAMPORTS_PER_SHARE_UNIT;
      const signature = await pay(lamports);
      await apiPost(`/campaigns/${slug}/buy-shares`, {
        amount,
        txSignature: signature,
        amountLamports: lamports,
      });
      setBuyState({
        status: "success",
        message: `已成功購買 ${amount} 份 RWA Token（交易 ${signature.slice(0, 8)}…）`,
      });
      router.refresh();
    } catch (error) {
      setBuyState({
        status: "error",
        message: error instanceof Error ? error.message : "購買失敗，請稍後再試。",
      });
    } finally {
      setBuyPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <InfoRow label="每份價格" value={formatTWDT(investment.sharePrice)} />
        <InfoRow label="已售出" value={`${investment.mintedShares} / ${investment.totalShares} 份`} />
        <InfoRow label="建設成本" value={formatTWDT(investment.buildCost)} />
        <InfoRow label="年收益" value={formatTWDT(investment.annualIncome)} />
        <InfoRow label="投資人分潤" value={`${investment.investorSharePercent}%`} />
        <InfoRow label="目前年度" value={`第 ${investment.currentYear} 年`} />
        <InfoRow label="持有人數" value={`${investment.holderCount} 人`} />
        <InfoRow label="專案狀態" value={STATUS_LABELS[investment.status]} />
      </div>

      {investment.buybackActive && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-brand">
          農夫已啟動買回，領取分紅後你持有的 RWA Token 將自動歸還給農夫。
        </p>
      )}

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">你的持股</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-foreground/70">
          <span>持有份數</span>
          <span className="text-right font-medium text-foreground">{position.shareCount} 份</span>
          <span>待領分紅</span>
          <span className="text-right font-medium text-brand">
            {formatTWDT(position.pendingRewards)}
          </span>
        </div>

        <form action={claimAction} className="mt-3">
          <button
            type="submit"
            disabled={claimPending || position.pendingRewards <= 0 || investment.status === 3}
            className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {claimPending ? "領取中…" : "領取分紅"}
          </button>
        </form>
        <ActionMessage state={claimState} />
      </div>

      <form onSubmit={handleBuy} className="flex flex-col gap-3 border-t border-border pt-4">
        <label htmlFor="amount" className="text-sm font-medium text-foreground/70">
          購買 RWA Token（{formatTWDT(investment.sharePrice)} / 份，剩 {remaining} 份）
        </label>
        <p className="text-xs text-foreground/50">
          每份會透過 Solana 錢包發送 0.001 SOL Devnet 測試轉帳作為付款證明，
          {connected ? "錢包已連接。" : "尚未連接錢包，送出時會請你先連接。"}
        </p>
        <div className="flex gap-2">
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            max={Math.max(remaining, 1)}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 1)}
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={buyPending || soldOut || investment.status !== 1}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {buyPending ? "處理中…" : soldOut ? "已售罄" : "購買"}
          </button>
        </div>
        <ActionMessage state={buyState} />
      </form>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          平台管理（Demo 模擬）
        </p>

        <form action={settleAction}>
          <button
            type="submit"
            disabled={settlePending || !soldOut || investment.status !== 1}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            {settlePending ? "結算中…" : "執行年度結算"}
          </button>
        </form>
        <ActionMessage state={settleState} />

        <form action={buybackAction}>
          <button
            type="submit"
            disabled={
              buybackPending ||
              !soldOut ||
              investment.status !== 1 ||
              investment.buybackPrice <= 0 ||
              investment.buybackActive
            }
            className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            {buybackPending
              ? "買回中…"
              : `農夫買回全部${investment.buybackPrice > 0 ? `（${formatTWDT(investment.buybackPrice)}）` : ""}`}
          </button>
        </form>
        <ActionMessage state={buybackState} />

        <form action={statusAction} className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={investment.status}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {([1, 2, 3] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}. {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={statusPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            切換
          </button>
        </form>
        <ActionMessage state={statusState} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-foreground/50">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </>
  );
}
