from app.risk import score_campaign


def _investment_campaign(**overrides) -> dict:
    terms = {
        "premiumRate": 5.0,
        "investorSharePercent": 50.0,
        "status": 1,
        **overrides.get("investment", {}),
    }
    return {
        "fundingModel": "investment",
        "goalAmount": overrides.get("goalAmount", 100.0),
        "raisedAmount": overrides.get("raisedAmount", 100.0),
        "investment": terms,
    }


def test_reward_tier_campaign_is_flat_low_risk():
    score, level = score_campaign({"fundingModel": "reward"})
    assert level == "low"
    assert score == 20.0


def test_fully_funded_low_premium_scores_lower_than_underfunded():
    fully_funded = _investment_campaign(goalAmount=100, raisedAmount=100)
    underfunded = _investment_campaign(goalAmount=100, raisedAmount=10)

    score_full, _ = score_campaign(fully_funded)
    score_under, _ = score_campaign(underfunded)

    assert score_full < score_under


def test_locked_status_adds_risk():
    normal = _investment_campaign(investment={"status": 1})
    locked = _investment_campaign(investment={"status": 3})

    score_normal, _ = score_campaign(normal)
    score_locked, _ = score_campaign(locked)

    assert score_locked > score_normal


def test_score_never_exceeds_100():
    extreme = _investment_campaign(
        goalAmount=100,
        raisedAmount=0,
        investment={"premiumRate": 200, "investorSharePercent": 100, "status": 3},
    )
    score, level = score_campaign(extreme)
    assert score <= 100
    assert level == "high"
