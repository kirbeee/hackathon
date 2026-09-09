"use server";

import { revalidatePath } from "next/cache";
import {
  buyShares,
  claimInvestmentReward,
  depositToLedger,
  donate,
  getWalletBalance,
  getWalletHistory,
} from "./campaigns";
import { ApiError } from "./api-client";
import { rwaAmountForPayment } from "./rwa-payment";
import type { PaymentCurrency, WalletHistory } from "./types";

export interface InvestmentActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

async function runInvestmentAction(
  slug: string,
  run: () => Promise<string>
): Promise<InvestmentActionState> {
  try {
    const message = await run();
    revalidatePath(`/campaigns/${slug}`);
    return { status: "success", message };
  } catch (error) {
    return { status: "error", message: errorMessage(error, "操作失敗，請稍後再試。") };
  }
}

/** Demo-only submission: no wallet payment or swap is requested or verified. */
export async function submitDemoSharePurchaseAction(input: {
  slug: string;
  projectName: string;
  shareAmount: number;
  rwaTokenAmount: string;
  currency: PaymentCurrency;
  paymentAmount: string;
  walletAddress: string;
  endpoint?: string;
}): Promise<InvestmentActionState> {
  const shareAmount = input.shareAmount;
  if (!Number.isFinite(shareAmount) || shareAmount <= 0) {
    return { status: "error", message: "請輸入大於 0 的購買股數。" };
  }
  if (!/^\d+(?:\.\d+)?$/.test(input.rwaTokenAmount) || Number(input.rwaTokenAmount) <= 0) {
    return { status: "error", message: "換算後的 RWA Token 數量無效。" };
  }
  if (input.currency !== "USDC" && input.currency !== "TWD") {
    return { status: "error", message: "不支援的付款幣別。" };
  }
  if (!/^\d+(?:\.\d+)?$/.test(input.paymentAmount) || Number(input.paymentAmount) <= 0) {
    return { status: "error", message: "請輸入有效的付款金額。" };
  }
  const expectedShares = rwaAmountForPayment(Number(input.paymentAmount), input.currency);
  if (expectedShares === null || shareAmount !== expectedShares || Number(input.rwaTokenAmount) !== expectedShares) {
    return { status: "error", message: "付款金額與 RWA 數量不符：1 USDC = 1 枚 RWA，最低認購 1 枚。" };
  }
  if (!input.projectName.trim() || !input.walletAddress.trim()) {
    return { status: "error", message: "專案名稱或付款錢包地址缺失。" };
  }

  return runInvestmentAction(input.slug, async () => {
    const endpoint = input.endpoint?.trim() || process.env.FUNDRAISING_PAYMENT_ENDPOINT?.trim();
    if (!endpoint || endpoint.toLowerCase() === "none") {
      throw new Error("付款回報 Endpoint 尚未設定，請在購買區塊輸入 Endpoint。");
    }
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      throw new Error("付款回報 Endpoint 格式不正確。");
    }
    if (endpointUrl.protocol !== "http:" && endpointUrl.protocol !== "https:") {
      throw new Error("付款回報 Endpoint 只支援 HTTP 或 HTTPS。");
    }

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: input.projectName.trim(),
        rwaTokenAmount: input.rwaTokenAmount,
        walletAddress: input.walletAddress.trim(),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`認購請求失敗（HTTP ${response.status}），請確認後端服務。`);
    }

    await buyShares(input.slug, shareAmount, input.walletAddress.trim());
    return `認購完成，已登記 ${input.rwaTokenAmount} 枚 RWA Token。`;
  });
}

export async function validatePaymentReportingAction(
  endpointOverride?: string
): Promise<InvestmentActionState> {
  const endpoint = endpointOverride?.trim() || process.env.FUNDRAISING_PAYMENT_ENDPOINT?.trim();
  if (!endpoint || endpoint.toLowerCase() === "none") {
    return { status: "error", message: "請輸入付款回報 Endpoint。" };
  }
  try {
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== "http:" && endpointUrl.protocol !== "https:") {
      return { status: "error", message: "Endpoint 只支援 HTTP 或 HTTPS。" };
    }
  } catch {
    return { status: "error", message: "Endpoint 格式不正確。" };
  }
  return { status: "success" };
}
export async function claimInvestmentRewardAction(
  slug: string,
  _prevState: InvestmentActionState
): Promise<InvestmentActionState> {
  return runInvestmentAction(slug, async () => {
    const amount = await claimInvestmentReward(slug);
    return `已領取分紅 ${amount.toLocaleString("zh-TW")} TWDT。`;
  });
}

/**
 * Reports an already-completed on-chain payment to `backend`. Runs server-side
 * (this file is "use server") so the call never leaves the Next.js server as a
 * browser fetch -- avoids Chrome's Local Network Access permission prompt that
 * blocks a public-origin page (the Cloudflare tunnel) from reaching the
 * loopback backend directly, which otherwise strands an already-paid donation.
 */
export async function reportDonationAction(input: {
  slug: string;
  tierId: string;
  txSignature: string;
  backerName?: string;
  message?: string;
  walletAddress?: string;
}): Promise<InvestmentActionState> {
  return runInvestmentAction(input.slug, async () => {
    const result = await donate(
      input.slug,
      input.tierId,
      input.txSignature,
      input.backerName,
      input.message,
      input.walletAddress
    );
    return result.message;
  });
}

export interface WalletHistoryState {
  status: "idle" | "success" | "error";
  message?: string;
  data?: WalletHistory;
}

/** Looks up a wallet's donation/investment history server-side (same reasoning
 * as reportDonationAction: keeps the call to `backend` off the browser). */
export async function lookupWalletHistoryAction(address: string): Promise<WalletHistoryState> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { status: "error", message: "請輸入錢包地址。" };
  }
  try {
    const data = await getWalletHistory(trimmed);
    return { status: "success", data };
  } catch (error) {
    return { status: "error", message: errorMessage(error, "查詢失敗，請稍後再試。") };
  }
}

export interface WalletBalanceState {
  status: "idle" | "success" | "error";
  message?: string;
  availableLamports?: number;
}

/** Looks up a wallet's AI-agent custodial ledger balance server-side (same
 * reasoning as reportDonationAction: keeps the call to `backend` off the
 * browser). */
export async function lookupWalletBalanceAction(address: string): Promise<WalletBalanceState> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { status: "error", message: "請提供錢包地址。" };
  }
  try {
    const { availableLamports } = await getWalletBalance(trimmed);
    return { status: "success", availableLamports };
  } catch (error) {
    return { status: "error", message: errorMessage(error, "查詢餘額失敗，請稍後再試。") };
  }
}

/**
 * Reports an already-completed real devnet payment from `walletAddress` to
 * the AI agent's pooled wallet, crediting `walletAddress`'s custodial
 * ledger balance by the same amount. Server-side for the same reason as
 * reportDonationAction (avoids the browser calling `backend` directly).
 */
export async function depositToAgentAction(input: {
  walletAddress: string;
  amountLamports: number;
  txSignature: string;
}): Promise<WalletBalanceState> {
  try {
    const { availableLamports } = await depositToLedger(
      input.walletAddress,
      input.amountLamports,
      input.txSignature
    );
    return { status: "success", availableLamports };
  } catch (error) {
    return { status: "error", message: errorMessage(error, "儲值回報失敗，請稍後再試。") };
  }
}
