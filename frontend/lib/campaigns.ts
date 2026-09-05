import { apiGet, apiPost } from "./api-client";
import type {
  Campaign,
  CampaignCategory,
  Donation,
  InvestorPosition,
  OnChainTransaction,
  ProjectStatus,
} from "./types";

export const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  agriculture: "永續農業",
  startup: "新創研發",
  lifestyle: "生活選物",
  tech: "科技 3C",
  food: "飲食禮盒",
  design: "設計工藝",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  1: "正常運作",
  2: "僅開放提領",
  3: "全面停止",
};

export async function listCampaigns(): Promise<Campaign[]> {
  return (await apiGet<Campaign[]>("/campaigns")) ?? [];
}

export async function getFeaturedCampaigns(limit = 3): Promise<Campaign[]> {
  const campaigns = await listCampaigns();
  return [...campaigns]
    .sort((a, b) => progressRatio(b) - progressRatio(a))
    .slice(0, limit);
}

function progressRatio(campaign: Campaign): number {
  return campaign.goalAmount > 0 ? campaign.raisedAmount / campaign.goalAmount : 0;
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  return apiGet<Campaign>(`/campaigns/${encodeURIComponent(slug)}`);
}

export async function getDonationsForCampaign(slug: string): Promise<Donation[]> {
  return (await apiGet<Donation[]>(`/campaigns/${encodeURIComponent(slug)}/donations`)) ?? [];
}

export async function getInvestorPosition(slug: string): Promise<InvestorPosition> {
  const position = await apiGet<InvestorPosition>(
    `/campaigns/${encodeURIComponent(slug)}/position`
  );
  return position ?? { campaignId: slug, shareCount: 0, tokenIds: [], pendingRewards: 0 };
}

export async function getOnChainTransactions(slug: string): Promise<OnChainTransaction[]> {
  return (
    (await apiGet<OnChainTransaction[]>(`/campaigns/${encodeURIComponent(slug)}/transactions`)) ??
    []
  );
}

export async function buyShares(slug: string, amount: number): Promise<void> {
  await apiPost(`/campaigns/${encodeURIComponent(slug)}/buy-shares`, { amount });
}

export async function runAnnualSettlement(slug: string): Promise<void> {
  await apiPost(`/campaigns/${encodeURIComponent(slug)}/settle`);
}

export async function farmerBuyBackAll(slug: string): Promise<void> {
  await apiPost(`/campaigns/${encodeURIComponent(slug)}/buyback`);
}

export async function claimInvestmentReward(slug: string): Promise<number> {
  const result = await apiPost<{ message: string; amount: number | null }>(
    `/campaigns/${encodeURIComponent(slug)}/claim-reward`
  );
  return result.amount ?? 0;
}

export async function setInvestmentStatus(slug: string, status: ProjectStatus): Promise<void> {
  await apiPost(`/campaigns/${encodeURIComponent(slug)}/status`, { status });
}

export async function createCampaign(input: {
  title: string;
  summary: string;
  story: string;
  category: CampaignCategory;
  creatorName: string;
  location: string;
  durationDays: number;
  rewardTiers: Array<{
    title: string;
    price: number;
    description: string;
    totalSupply: number;
  }>;
}): Promise<Campaign> {
  return apiPost<Campaign>("/campaigns", input);
}
