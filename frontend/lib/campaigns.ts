import { apiGet, apiPost } from "./api-client";
import type {
  Campaign,
  CampaignCategory,
  Donation,
  InvestorPosition,
  OnChainTransaction,
  ProjectStatus,
  WalletBalance,
  WalletHistory,
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

export async function buyShares(
  slug: string,
  amount: number,
  walletAddress?: string
): Promise<void> {
  await apiPost(`/campaigns/${encodeURIComponent(slug)}/buy-shares`, { amount, walletAddress });
}

export async function donate(
  slug: string,
  tierId: string,
  txSignature: string,
  backerName?: string,
  message?: string,
  walletAddress?: string
): Promise<{ message: string }> {
  return apiPost<{ message: string }>(`/campaigns/${encodeURIComponent(slug)}/donate`, {
    tierId,
    backerName,
    message,
    txSignature,
    walletAddress,
  });
}

export async function getWalletHistory(address: string): Promise<WalletHistory> {
  return (
    (await apiGet<WalletHistory>(`/wallets/${encodeURIComponent(address)}/history`)) ?? {
      walletAddress: address,
      donations: [],
      investments: [],
      redemptions: [],
      deposits: [],
      availableLamports: 0,
    }
  );
}

export async function getWalletBalance(address: string): Promise<WalletBalance> {
  return (
    (await apiGet<WalletBalance>(`/wallets/${encodeURIComponent(address)}/balance`)) ?? {
      walletAddress: address,
      availableLamports: 0,
    }
  );
}

/** Reports an already-completed real devnet payment from `address` to the AI
 * agent's wallet, crediting `address`'s custodial ledger balance. */
export async function depositToLedger(
  address: string,
  amountLamports: number,
  txSignature: string
): Promise<{ message: string; availableLamports: number }> {
  return apiPost(`/wallets/${encodeURIComponent(address)}/deposit`, { amountLamports, txSignature });
}

export async function claimInvestmentReward(slug: string): Promise<number> {
  const result = await apiPost<{ message: string; amount: number | null }>(
    `/campaigns/${encodeURIComponent(slug)}/claim-reward`
  );
  return result.amount ?? 0;
}
