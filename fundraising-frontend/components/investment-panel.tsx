"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import {
  claimInvestmentRewardAction,
  completePaidSharePurchaseAction,
  farmerBuyBackAllAction,
  runAnnualSettlementAction,
  setInvestmentStatusAction,
  validatePaymentReportingAction,
  type InvestmentActionState,
} from "@/lib/actions";
import type { AppClient } from "@/app/providers";
import { STATUS_LABELS } from "@/lib/campaigns";
import { formatTWDT } from "@/lib/format";
import { sendTokenPayment } from "@/lib/token-payment";
import type {
  InvestmentTerms,
  InvestorPosition,
  PaymentCurrency,
  ProjectStatus,
} from "@/lib/types";

const initialState: InvestmentActionState = { status: "idle" };
const TWD_PER_USDC = 30;
const MAX_PAYMENT_TWD = 30_000;
const PAYMENT_TOLERANCE_TWD = 0.001;

function formatPaymentAmount(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function requiredPaymentAmount(
  currency: PaymentCurrency,
  shareAmount: number,
  sharePriceTwd: number
): string {
  const totalTwd = shareAmount * sharePriceTwd;
  return formatPaymentAmount(currency === "USDC" ? totalTwd / TWD_PER_USDC : totalTwd);
}

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
  projectName,
  investment,
  position,
}: {
  slug: string;
  projectName: string;
  investment: InvestmentTerms;
  position: InvestorPosition;
}) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const soldOut = investment.mintedShares >= investment.totalShares;
  const remaining = investment.totalShares - investment.mintedShares;
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
  const [currency, setCurrency] = useState<PaymentCurrency>("USDC");
  const [paymentAmount, setPaymentAmount] = useState(() =>
    requiredPaymentAmount("USDC", 1, investment.sharePrice)
  );
  const [tokenPrice, setTokenPrice] = useState(String(investment.sharePrice));
  const [backendEndpoint, setBackendEndpoint] = useState("");
  const [buyState, setBuyState] = useState<InvestmentActionState>(initialState);
  const [buyPending, setBuyPending] = useState(false);
  const [buyStage, setBuyStage] = useState<string | null>(null);
  const [paymentSignature, setPaymentSignature] = useState<string | null>(null);
  const numericPaymentAmount = Number(paymentAmount);
  const paymentTwdEquivalent =
    currency === "USDC" ? numericPaymentAmount * TWD_PER_USDC : numericPaymentAmount;
  const numericTokenPrice = Number(tokenPrice);
  const numericRwaTokenAmount = Math.floor(paymentTwdEquivalent / numericTokenPrice);
  const rwaTokenAmount =
    Number.isFinite(numericRwaTokenAmount) && numericRwaTokenAmount > 0
      ? formatPaymentAmount(numericRwaTokenAmount)
      : "";

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected?.signer) {
      setBuyState({ status: "error", message: "請先連接 Phantom 錢包。" });
      return;
    }
    if (!Number.isFinite(numericTokenPrice) || numericTokenPrice <= 0) {
      setBuyState({ status: "error", message: "請輸入有效的 RWA Token 價格。" });
      return;
    }
    if (
      !Number.isFinite(numericRwaTokenAmount) ||
      numericRwaTokenAmount < 1 ||
      numericRwaTokenAmount > remaining
    ) {
      setBuyState({
        status: "error",
        message: `換算後的 RWA Token 數量必須介於 1 和 ${remaining} 之間。`,
      });
      return;
    }
    if (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0) {
      setBuyState({ status: "error", message: "請輸入有效的付款金額。" });
      return;
    }
    if (paymentTwdEquivalent > MAX_PAYMENT_TWD + PAYMENT_TOLERANCE_TWD) {
      setBuyState({ status: "error", message: "單筆付款不得超過 NT$30,000 等值 Token。" });
      return;
    }

    setBuyPending(true);
    setBuyState(initialState);
    setPaymentSignature(null);

    try {
      const reporting = await validatePaymentReportingAction(backendEndpoint);
      if (reporting.status === "error") {
        setBuyState(reporting);
        return;
      }

      setBuyStage("等待 Phantom 確認付款…");
      const signature = await sendTokenPayment({
        client,
        signer: connected.signer,
        currency,
        amount: paymentAmount,
      });
      setPaymentSignature(signature);

      setBuyStage("付款已送出，正在回報投資交易後端…");
      const result = await completePaidSharePurchaseAction({
        slug,
        projectName,
        shareAmount: numericRwaTokenAmount,
        rwaTokenAmount,
        currency,
        paymentAmount,
        walletAddress: String(connected.account.address),
        endpoint: backendEndpoint,
      });
      setBuyState(result);
    } catch (error) {
      setBuyState({
        status: "error",
        message: error instanceof Error ? error.message : "付款失敗，請稍後再試。",
      });
    } finally {
      setBuyStage(null);
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

      <form onSubmit={handlePurchase} className="flex flex-col gap-3 border-t border-border pt-4">
        <label htmlFor="paymentAmount" className="text-sm font-medium text-foreground/70">
          購買 RWA Token（{formatTWDT(investment.sharePrice)} / 份，剩 {remaining} 份）
        </label>
        <div>
          <label htmlFor="backendEndpoint" className="mb-1 block text-xs text-foreground/50">
            付款回報 Endpoint（Demo）
          </label>
          <input
            id="backendEndpoint"
            type="url"
            value={backendEndpoint}
            onChange={(event) => setBackendEndpoint(event.target.value)}
            disabled={buyPending}
            placeholder="http://127.0.0.1:8000/payment"
            autoComplete="url"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-foreground/40">
            可在每次 Demo 前自由更換；留空時使用伺服器環境變數設定。
          </p>
        </div>
        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <label htmlFor="paymentCurrency" className="self-center text-xs text-foreground/50">
            付款幣別
          </label>
          <select
            id="paymentCurrency"
            value={currency}
            onChange={(event) => {
              const nextCurrency = event.target.value as PaymentCurrency;
              setCurrency(nextCurrency);
              setPaymentAmount(
                formatPaymentAmount(
                  nextCurrency === "USDC"
                    ? paymentTwdEquivalent / TWD_PER_USDC
                    : paymentTwdEquivalent
                )
              );
            }}
            disabled={buyPending}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="USDC">USDC</option>
            <option value="TWD">TWD Token</option>
          </select>

          <label htmlFor="paymentAmount" className="self-center text-xs text-foreground/50">
            支付金額
          </label>
          <div className="flex items-center gap-2">
            <input
              id="paymentAmount"
              type="number"
              min="0.000001"
              step="0.000001"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              disabled={buyPending}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <span className="w-16 text-xs font-semibold text-foreground/60">{currency}</span>
          </div>

          <label htmlFor="tokenPrice" className="self-center text-xs text-foreground/50">
            Token 價格（TWD）
          </label>
          <input
            id="tokenPrice"
            type="number"
            min="0.000001"
            step="0.000001"
            value={tokenPrice}
            onChange={(event) => setTokenPrice(event.target.value)}
            disabled={buyPending}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />

          <label htmlFor="rwaTokenAmount" className="self-center text-xs text-foreground/50">
            RWA Token 數量
          </label>
          <input
            id="rwaTokenAmount"
            type="text"
            value={rwaTokenAmount}
            readOnly
            className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground/70 outline-none"
          />
        </div>
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-foreground/60">
          本次付款等值 NT${Number.isFinite(paymentTwdEquivalent) ? paymentTwdEquivalent.toLocaleString("zh-TW") : "—"}
          ，換算 {rwaTokenAmount || "—"} 枚 RWA Token，單筆上限 NT$30,000
          {currency === "USDC" ? "（1 USDC = 30 TWD）" : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              buyPending ||
              soldOut ||
              !rwaTokenAmount ||
              numericRwaTokenAmount < 1 ||
              numericRwaTokenAmount > remaining ||
              paymentTwdEquivalent > MAX_PAYMENT_TWD ||
              investment.status !== 1 ||
              !connected?.signer
            }
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {buyPending ? "處理中…" : soldOut ? "已售罄" : connected?.signer ? "購買" : "請先連接錢包"}
          </button>
        </div>
        {buyStage && <p role="status" className="text-sm text-foreground/60">{buyStage}</p>}
        <ActionMessage state={buyState} />
        {paymentSignature && (
          <a
            href={`https://explorer.solana.com/tx/${paymentSignature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="break-all text-xs font-medium text-brand hover:underline"
          >
            查看 devnet 付款交易：{paymentSignature}
          </a>
        )}
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
