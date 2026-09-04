"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addDonation,
  buyShares,
  claimInvestmentReward,
  createCampaign,
  farmerBuyBackAll,
  runAnnualSettlement,
  setInvestmentStatus,
} from "./campaigns";
import { ApiError } from "./api-client";
import type { CampaignCategory, ProjectStatus } from "./types";

export interface DonateFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

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

export async function donateAction(
  slug: string,
  _prevState: DonateFormState,
  formData: FormData
): Promise<DonateFormState> {
  const tierId = String(formData.get("tierId") ?? "");
  if (!tierId) {
    return { status: "error", message: "請選擇一個 RWA Token 方案。" };
  }

  const backerName = String(formData.get("backerName") ?? "");
  const message = String(formData.get("message") ?? "");

  try {
    await addDonation(slug, { tierId, backerName, message });
  } catch (error) {
    return { status: "error", message: errorMessage(error, "贊助失敗，請稍後再試。") };
  }

  revalidatePath(`/campaigns/${slug}`);
  return { status: "success", message: "感謝你的支持！這個 RWA Token 已經是你的了。" };
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
    return { status: "error", message: "請寫一段至少 30 個字的詳細說明，讓贊助者了解為什麼值得支持。" };
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
    return { status: "error", message: "募資天數請設定在 7 到 90 天之間。" };
  }

  const tiers = parseTiers(tiersRaw);
  if (!tiers || tiers.length === 0) {
    return { status: "error", message: "請至少新增一個 RWA Token 回饋方案。" };
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
