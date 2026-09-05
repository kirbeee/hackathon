"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buyShares,
  claimInvestmentReward,
  createCampaign,
  farmerBuyBackAll,
  runAnnualSettlement,
  setInvestmentStatus,
} from "./campaigns";
import { ApiError } from "./api-client";
import { rwaAmountForPayment } from "./rwa-payment";
import type { CampaignCategory, PaymentCurrency, ProjectStatus } from "./types";

export interface CampaignFormState {
  status: "idle" | "error";
  message?: string;
}

export interface InvestmentActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

const CATEGORIES: CampaignCategory[] = [
  "agriculture",
  "startup",
  "lifestyle",
  "tech",
  "food",
  "design",
];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

interface ParsedTier {
  title: string;
  price: number;
  description: string;
  totalSupply: number;
}

function parseTiers(raw: string): ParsedTier[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const tiers: ParsedTier[] = [];
    for (const item of parsed) {
      if (
        typeof item?.title !== "string" ||
        typeof item?.description !== "string" ||
        typeof item?.price !== "number" ||
        typeof item?.totalSupply !== "number"
      ) {
        return null;
      }
      tiers.push({
        title: item.title,
        description: item.description,
        price: item.price,
        totalSupply: item.totalSupply,
      });
    }
    return tiers;
  } catch {
    return null;
  }
}

export async function createCampaignAction(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const story = String(formData.get("story") ?? "").trim();
  const category = String(formData.get("category") ?? "") as CampaignCategory;
  const creatorName = String(formData.get("creatorName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const durationDays = Number(formData.get("durationDays"));
  const tiersRaw = String(formData.get("rewardTiersJson") ?? "");

  if (title.length < 4) {
    return { status: "error", message: "專案標題至少需要 4 個字。" };
  }
  if (summary.length < 10) {
    return { status: "error", message: "請寫一段至少 10 個字的專案簡介。" };
  }
  if (story.length < 30) {
    return { status: "error", message: "請寫一段至少 30 個字的發行說明，揭露資金用途與主要風險。" };
  }
  if (!CATEGORIES.includes(category)) {
    return { status: "error", message: "請選擇一個專案分類。" };
  }
  if (!creatorName) {
    return { status: "error", message: "請填寫發起人或團隊名稱。" };
  }
  if (!location) {
    return { status: "error", message: "請填寫執行地點。" };
  }
  if (!Number.isFinite(durationDays) || durationDays < 7 || durationDays > 90) {
    return { status: "error", message: "認購期間請設定在 7 到 90 天之間。" };
  }

  const tiers = parseTiers(tiersRaw);
  if (!tiers || tiers.length === 0) {
    return { status: "error", message: "請至少新增一個 RWA Token 債權認購級距。" };
  }
  for (const t of tiers) {
    if (t.title.trim().length < 2) {
      return { status: "error", message: "每個方案都需要名稱。" };
    }
    if (!Number.isFinite(t.price) || t.price < 1) {
      return { status: "error", message: "每個方案的金額需大於 0。" };
    }
    if (!Number.isFinite(t.totalSupply) || t.totalSupply < 1) {
      return { status: "error", message: "每個方案的 Token 發行量需大於 0。" };
    }
  }

  let campaign;
  try {
    campaign = await createCampaign({
      title,
      summary,
      story,
      category,
      creatorName,
      location,
      durationDays,
      rewardTiers: tiers,
    });
  } catch (error) {
    return { status: "error", message: errorMessage(error, "建立專案失敗，請稍後再試。") };
  }

  revalidatePath("/campaigns");
  revalidatePath("/");
  redirect(`/campaigns/${campaign.slug}`);
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

export async function buySharesAction(
  slug: string,
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "請輸入大於 0 的購買股數。" };
  }

  return runInvestmentAction(slug, async () => {
    await buyShares(slug, Math.floor(amount));
    return `已成功購買 ${Math.floor(amount)} 份 RWA Token。`;
  });
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

    await buyShares(input.slug, shareAmount);
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

export async function runAnnualSettlementAction(
  slug: string,
  _prevState: InvestmentActionState
): Promise<InvestmentActionState> {
  return runInvestmentAction(slug, async () => {
    await runAnnualSettlement(slug);
    return "年度結算已完成，分紅已計入你的待領餘額。";
  });
}

export async function farmerBuyBackAllAction(
  slug: string,
  _prevState: InvestmentActionState
): Promise<InvestmentActionState> {
  return runInvestmentAction(slug, async () => {
    await farmerBuyBackAll(slug);
    return "農夫已買回全部股份，買回款已計入你的待領餘額。";
  });
}

export async function setInvestmentStatusAction(
  slug: string,
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  const status = Number(formData.get("status")) as ProjectStatus;
  if (status !== 1 && status !== 2 && status !== 3) {
    return { status: "error", message: "無效的狀態代碼。" };
  }

  return runInvestmentAction(slug, async () => {
    await setInvestmentStatus(slug, status);
    return "專案狀態已更新。";
  });
}
