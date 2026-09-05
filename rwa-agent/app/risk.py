"""Deterministic risk scoring for RWA campaigns.

The LLM never invents this number — it only narrates a score computed here
from the campaign's own fields, so the same campaign always scores the same
way regardless of model output.
"""

from __future__ import annotations

from typing import Literal

RiskLevel = Literal["low", "medium", "high"]

# Reward-tier campaigns (mooncake boxes, coffee machines, ...) carry no
# dividend/buyback terms to score against — flat, low-stakes by construction.
_REWARD_TIER_SCORE = 20.0


def score_campaign(campaign: dict) -> tuple[float, RiskLevel]:
    """Return (score 0-100, level) — higher score means higher risk."""
    if campaign.get("fundingModel") != "investment" or not campaign.get("investment"):
        return _REWARD_TIER_SCORE, _level_for(_REWARD_TIER_SCORE)

    terms = campaign["investment"]
    goal = campaign.get("goalAmount") or 0
    raised = campaign.get("raisedAmount") or 0
    funded_pct = min(raised / goal, 1.0) if goal else 0.0

    # Low funded-progress = still needs conviction from few backers = riskier.
    funding_risk = (1.0 - funded_pct) * 40

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

    score = min(funding_risk + premium_risk + investor_share_risk + status_risk, 100)
    return score, _level_for(score)


def _level_for(score: float) -> RiskLevel:
    if score < 35:
        return "low"
    if score < 65:
        return "medium"
    return "high"
