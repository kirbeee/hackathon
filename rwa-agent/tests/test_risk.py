from app.risk import TIER_INFO, score_campaign, tier_info


def _investment_campaign(risk_tier="degen", **overrides) -> dict:
    terms = {
        "premiumRate": 5.0,
        "investorSharePercent": 50.0,
        "status": 1,
        **overrides.get("investment", {}),
    }
    return {
        "fundingModel": "investment",
        "riskTier": risk_tier,
        "goalAmount": overrides.get("goalAmount", 100.0),
        "raisedAmount": overrides.get("raisedAmount", 100.0),
        "investment": terms,
    }


def test_reward_tier_supporter_campaign_is_medium_risk():
    score, level = score_campaign(
        {"fundingModel": "reward", "riskTier": "supporter", "goalAmount": 100, "raisedAmount": 100}
    )
    assert level == "medium"
    assert TIER_INFO["supporter"]["floor"] <= score <= TIER_INFO["supporter"]["ceiling"]


def test_diversifier_campaign_is_always_low_risk_even_if_underfunded():
    underfunded = _investment_campaign(
        risk_tier="diversifier",
        goalAmount=100,
        raisedAmount=0,
        investment={"premiumRate": 200, "investorSharePercent": 100, "status": 3},
    )
    score, level = score_campaign(underfunded)
    assert level == "low"
    assert score <= TIER_INFO["diversifier"]["ceiling"]


def test_degen_campaign_is_always_high_risk_even_if_fully_funded():
    fully_funded = _investment_campaign(
        risk_tier="degen",
        goalAmount=100,
        raisedAmount=100,
        investment={"premiumRate": 0, "investorSharePercent": 0, "status": 1},
    )
    score, level = score_campaign(fully_funded)
    assert level == "high"
    assert score >= TIER_INFO["degen"]["floor"]


def test_fully_funded_low_premium_scores_lower_than_underfunded_within_same_tier():
    fully_funded = _investment_campaign(risk_tier="degen", goalAmount=100, raisedAmount=100)
    underfunded = _investment_campaign(risk_tier="degen", goalAmount=100, raisedAmount=10)

    score_full, _ = score_campaign(fully_funded)
    score_under, _ = score_campaign(underfunded)

    assert score_full < score_under


def test_locked_status_adds_risk_within_same_tier():
    normal = _investment_campaign(risk_tier="supporter", investment={"status": 1})
    locked = _investment_campaign(risk_tier="supporter", investment={"status": 3})

    score_normal, _ = score_campaign(normal)
    score_locked, _ = score_campaign(locked)

    assert score_locked > score_normal


def test_score_never_exceeds_100():
    extreme = _investment_campaign(
        risk_tier="degen",
        goalAmount=100,
        raisedAmount=0,
        investment={"premiumRate": 200, "investorSharePercent": 100, "status": 3},
    )
    score, level = score_campaign(extreme)
    assert score <= 100
    assert level == "high"


def test_missing_risk_tier_falls_back_to_supporter():
    score, level = score_campaign({"fundingModel": "reward", "goalAmount": 100, "raisedAmount": 100})
    assert level == "medium"


def test_tier_info_returns_label_and_description():
    info = tier_info("diversifier")
    assert info["label"] == "The Diversifier"
    assert "國泰" in info["description"]
