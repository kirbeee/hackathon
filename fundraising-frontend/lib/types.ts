export type CampaignCategory =
  | "agriculture"
  | "startup"
  | "lifestyle"
  | "tech"
  | "food"
  | "design";

export type FundingModel = "reward" | "investment";

/** Contract status codes from SafeHarvestNFT.sol: 1=normal, 2=withdraw-only, 3=locked. */
export type ProjectStatus = 1 | 2 | 3;

export interface RewardTier {
  id: string;
  tokenSymbol: string;
  title: string;
  price: number;
  description: string;
  totalSupply: number;
  claimed: number;
  estimatedDelivery: string;
}

/**
 * Mirrors the on-chain fields of contractTest/contracts/SafeHarvestNFT.sol —
 * this is a mock frontend model shaped to match that contract, not a live
 * chain integration (no wallet/RPC calls happen here).
 */
export interface InvestmentTerms {
  farmerName: string;
  totalShares: number;
  mintedShares: number;
  sharePrice: number;
  buildCost: number;
  annualIncome: number;
  investorSharePercent: number;
  interestRate: number;
  premiumRate: number;
  status: ProjectStatus;
  currentYear: number;
  cumulativePrincipal: number;
  remainingPrincipal: number;
  buybackActive: boolean;
  buybackPrice: number;
  holderCount: number;
  tokenSymbol: string;
}

/** The demo viewer's own position in one investment campaign (single mock user, no real accounts). */
export interface InvestorPosition {
  campaignId: string;
  shareCount: number;
  tokenIds: number[];
  pendingRewards: number;
}

export interface Donation {
  id: string;
  campaignId: string;
  tierId: string;
  backerName: string;
  amount: number;
  message?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  summary: string;
  story: string;
  category: CampaignCategory;
  creatorName: string;
  location: string;
  coverGradient: string;
  coverImage?: string;
  goalAmount: number;
  raisedAmount: number;
  backerCount: number;
  createdAt: string;
  deadline: string;
  fundingModel: FundingModel;
  rewardTiers: RewardTier[];
  investment?: InvestmentTerms;
}
