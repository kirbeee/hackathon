"""Pydantic models mirroring fundraising-frontend/lib/types.ts.

Keep field names and shapes identical to the TypeScript types — the
frontend's response typing assumes this JSON shape verbatim.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

CampaignCategory = Literal["agriculture", "startup", "lifestyle", "tech", "food", "design"]
FundingModel = Literal["reward", "investment"]
ProjectStatus = Literal[1, 2, 3]


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
    buybackActive: bool
    buybackPrice: float
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


class OnChainTransaction(BaseModel):
    """A logged Solana devnet payment backing a buy-shares purchase."""

    id: str
    campaignId: str
    amountLamports: int
    shares: int
    txSignature: str
    createdAt: str


class Campaign(BaseModel):
    id: str
    slug: str
    title: str
    summary: str
    story: str
    category: CampaignCategory
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


class BuySharesRequest(BaseModel):
    amount: int
    txSignature: Optional[str] = None
    amountLamports: Optional[int] = None


class ConfigResponse(BaseModel):
    solanaTreasuryAddress: str
    solanaCluster: str
    lamportsPerShareUnit: int


class SetStatusRequest(BaseModel):
    status: ProjectStatus


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
