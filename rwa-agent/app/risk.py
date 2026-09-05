"""Deterministic risk scoring for RWA campaigns.

The LLM never invents this number — it only narrates a score computed here
from the campaign's own fields, so the same campaign always scores the same
way regardless of model output.

Every campaign is first classified into one of three business-model risk
tiers (`riskTier`, set in fundraising-api's seed data / campaign creation).
That tier fixes a [floor, ceiling] score band and therefore the resulting
low/medium/high level; the finer-grained signals below (funding progress,
premium, investor share, project status) only move the score *within* that
band, to rank campaigns of the same tier against each other.
"""

from __future__ import annotations

from typing import Literal, TypedDict

RiskLevel = Literal["low", "medium", "high"]
RiskTier = Literal["degen", "supporter", "diversifier"]


class TierInfo(TypedDict):
    label: str
    level: RiskLevel
    floor: float
    ceiling: float
    description: str


# Bands are chosen so a tier's score always resolves to its matching level
# via _level_for (thresholds at 35/65) — the tier alone determines the level;
# only the position within the band is data-driven.
TIER_INFO: dict[RiskTier, TierInfo] = {
    "degen": {
        "label": "The Degen",
        "level": "high",
        "floor": 65.0,
        "ceiling": 100.0,
        "description": (
            "高風險／高潛力：新創早期募資、新業務研發。失敗率較高，但一旦產品爆紅，"
            "Token 在二級市場的溢價空間最大，甚至附帶未來銷售分潤。"
        ),
    },
    "supporter": {
        "label": "The Supporter",
        "level": "medium",
        "floor": 35.0,
        "ceiling": 64.0,
        "description": (
            "中風險／穩定兌現：實體商品（如咖啡機）與小農契作。幾乎不會血本無歸，"
            "主要價值在於早鳥折扣優惠與提早享受商品的權利。"
        ),
    },
    "diversifier": {
        "label": "The Diversifier",
        "level": "low",
        "floor": 5.0,
        "ceiling": 30.0,
        "description": (
            "低風險／穩定收益：國泰商辦收租、基礎設施。由國泰地產或資管審核兜底，"
            "提供穩定的定期配息，讓小資族也能用小錢投資信義區房產。"
        ),
    },
}

# Campaigns predating the riskTier field (should not happen once fundraising-api
# always sets it, but keeps this module resilient to partial data).
_DEFAULT_TIER: RiskTier = "supporter"


def score_campaign(campaign: dict) -> tuple[float, RiskLevel]:
    """Return (score 0-100, level) — higher score means higher risk."""
    tier = campaign.get("riskTier") or _DEFAULT_TIER
    info = TIER_INFO.get(tier, TIER_INFO[_DEFAULT_TIER])

    raw = _raw_signal(campaign)  # 0-100, "how risky within its own tier"
    span = info["ceiling"] - info["floor"]
    score = info["floor"] + (raw / 100) * span
    return score, _level_for(score)


def tier_info(tier: str) -> TierInfo:
    """Label/description for a riskTier, for the agent to narrate against."""
    return TIER_INFO.get(tier, TIER_INFO[_DEFAULT_TIER])  # type: ignore[arg-type]


def _raw_signal(campaign: dict) -> float:
    """0-100 risk signal from the campaign's own funding/investment fields,
    independent of tier — used only to rank within a tier's band."""
    goal = campaign.get("goalAmount") or 0
    raised = campaign.get("raisedAmount") or 0
    funded_pct = min(raised / goal, 1.0) if goal else 0.0

    # Low funded-progress = still needs conviction from few backers = riskier.
    funding_risk = (1.0 - funded_pct) * 40

    if campaign.get("fundingModel") != "investment" or not campaign.get("investment"):
        # Reward-tier campaigns (mooncake boxes, coffee machines, ...) carry no
        # dividend/buyback terms to score against — funding progress alone.
        return min(funding_risk * (100 / 40), 100)

    terms = campaign["investment"]

    # A farmer/founder paying a steep premium to buy back early signals
    # either high confidence (good) or a cash-flow squeeze (bad) — treat a
    # very high premium as added risk, a token one as neutral.
    premium_risk = min(terms.get("premiumRate", 0) / 2, 20)

    # A bigger investor cut of annual income means slimmer margin for the
    # farmer/founder to still cover costs if income dips.
    investor_share_risk = min(terms.get("investorSharePercent", 0) / 100 * 20, 20)

    # A locked or withdraw-only project (status 2/3) is actively de-risking
    # for existing holders but signals the upside phase is over.
    status = terms.get("status", 1)
    status_risk = {1: 0, 2: 10, 3: 20}.get(status, 10)

    return min(funding_risk + premium_risk + investor_share_risk + status_risk, 100)


def _level_for(score: float) -> RiskLevel:
    if score < 35:
        return "low"
    if score < 65:
        return "medium"
    return "high"
