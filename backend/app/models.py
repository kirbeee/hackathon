"""Pydantic models mirroring fundraising-frontend/lib/types.ts.

Keep field names and shapes identical to the TypeScript types — the
frontend's response typing assumes this JSON shape verbatim.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

CampaignCategory = Literal[
    "agriculture", "startup", "lifestyle", "tech", "food", "design", "real-estate"
]
FundingModel = Literal["reward", "investment"]
ProjectStatus = Literal[1, 2, 3]

# The three-tier risk framework the RWA agent narrates against — orthogonal to
# `category` (industry theme): this is the business-model risk class.
#   degen        - 高風險/高潛力: 新創早期募資、新業務研發
#   supporter    - 中風險/穩定兌現: 實體商品與小農契作
#   diversifier  - 低風險/穩定收益: 國泰商辦收租、基礎設施
RiskTier = Literal["degen", "supporter", "diversifier"]


class RewardTier(BaseModel):
    id: str
    tokenSymbol: str
    title: str
    price: float
    description: str
    totalSupply: int
    claimed: int
    estimatedDelivery: str


class InvestmentTerms(BaseModel):
    farmerName: str
    totalShares: int
    mintedShares: int
    sharePrice: float
    buildCost: float
    annualIncome: float
    investorSharePercent: float
    interestRate: float
    premiumRate: float
    status: ProjectStatus
    currentYear: int
    cumulativePrincipal: float
    remainingPrincipal: float
    holderCount: int
    tokenSymbol: str


class InvestorPosition(BaseModel):
    campaignId: str
    shareCount: int
    tokenIds: list[int]
    pendingRewards: float


class Donation(BaseModel):
    id: str
    campaignId: str
    tierId: str
    backerName: str
    amount: float
    message: Optional[str] = None
    createdAt: str
    txSignature: Optional[str] = None
    walletAddress: Optional[str] = None


class OnChainTransaction(BaseModel):
    """A logged Solana devnet payment backing a buy-shares purchase."""

    id: str
    campaignId: str
    amountLamports: int
    shares: int
    txSignature: str
    createdAt: str
    walletAddress: Optional[str] = None


class WalletDonationRecord(BaseModel):
    campaignSlug: str
    campaignTitle: str
    tierId: str
    amount: float
    message: Optional[str] = None
    createdAt: str
    txSignature: Optional[str] = None


class WalletInvestmentRecord(BaseModel):
    campaignSlug: str
    campaignTitle: str
    amountLamports: int
    shares: int
    txSignature: str
    createdAt: str


class WalletHistoryResponse(BaseModel):
    walletAddress: str
    donations: list[WalletDonationRecord]
    investments: list[WalletInvestmentRecord]


class Campaign(BaseModel):
    id: str
    slug: str
    title: str
    summary: str
    story: str
    category: CampaignCategory
    riskTier: RiskTier
    creatorName: str
    location: str
    coverGradient: str
    coverImage: Optional[str] = None
    goalAmount: float
    raisedAmount: float
    backerCount: int
    createdAt: str
    deadline: str
    fundingModel: FundingModel
    rewardTiers: list[RewardTier]
    investment: Optional[InvestmentTerms] = None


# ---- request bodies -------------------------------------------------------


class DonateRequest(BaseModel):
    tierId: str
    backerName: str = ""
    message: str = ""
    txSignature: Optional[str] = None
    walletAddress: Optional[str] = None


class BuySharesRequest(BaseModel):
    amount: int
    txSignature: Optional[str] = None
    amountLamports: Optional[int] = None
    walletAddress: Optional[str] = None


class ConfigResponse(BaseModel):
    solanaTreasuryAddress: str
    solanaCluster: str
    lamportsPerShareUnit: int


class RewardTierInput(BaseModel):
    title: str
    price: float
    description: str
    totalSupply: int


class CreateCampaignRequest(BaseModel):
    title: str
    summary: str
    story: str
    category: CampaignCategory
    creatorName: str
    location: str
    durationDays: int
    rewardTiers: list[RewardTierInput]


class ActionResult(BaseModel):
    message: str
    amount: Optional[float] = None
