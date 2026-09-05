import pytest
from fastapi.testclient import TestClient

from app import store
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store():
    store.reset_for_tests()
    yield


def test_config_exposes_treasury_address():
    res = client.get("/config")
    assert res.status_code == 200
    body = res.json()
    assert len(body["solanaTreasuryAddress"]) > 30
    assert body["solanaCluster"] == "devnet"
    assert body["lamportsPerShareUnit"] > 0


def test_buy_shares_with_tx_signature_logs_onchain_transaction():
    slug = "friendly-citrus-orchard-transition"
    res = client.post(
        f"/campaigns/{slug}/buy-shares",
        json={"amount": 2, "txSignature": "fake-sig-abc123", "amountLamports": 2_000_000},
    )
    assert res.status_code == 200

    txs = client.get(f"/campaigns/{slug}/transactions").json()
    assert len(txs) == 1
    assert txs[0]["txSignature"] == "fake-sig-abc123"
    assert txs[0]["shares"] == 2
    assert txs[0]["amountLamports"] == 2_000_000


def test_buy_shares_without_tx_signature_logs_nothing():
    slug = "friendly-citrus-orchard-transition"
    res = client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 1})
    assert res.status_code == 200
    assert client.get(f"/campaigns/{slug}/transactions").json() == []


def test_list_campaigns_has_seed_data():
    res = client.get("/campaigns")
    assert res.status_code == 200
    campaigns = res.json()
    assert len(campaigns) == 6
    slugs = {c["slug"] for c in campaigns}
    assert "friendly-citrus-orchard-transition" in slugs
    assert "ai-support-copilot-rd-fund" in slugs


def test_get_campaign_404_for_unknown_slug():
    res = client.get("/campaigns/does-not-exist")
    assert res.status_code == 404


def test_get_campaign_detail_shape():
    res = client.get("/campaigns/friendly-citrus-orchard-transition")
    assert res.status_code == 200
    body = res.json()
    assert body["fundingModel"] == "investment"
    assert body["investment"]["totalShares"] == 300
    assert body["rewardTiers"] == []


def test_reward_tier_donate_flow():
    slug = "artisan-mid-autumn-mooncake-box"
    before = client.get(f"/campaigns/{slug}").json()

    res = client.post(f"/campaigns/{slug}/donate", json={"tierId": "t1", "backerName": "測試員"})
    assert res.status_code == 200

    after = client.get(f"/campaigns/{slug}").json()
    assert after["raisedAmount"] == before["raisedAmount"] + 880
    assert after["backerCount"] == before["backerCount"] + 1

    donations = client.get(f"/campaigns/{slug}/donations").json()
    assert any(d["backerName"] == "測試員" for d in donations)


def test_donate_rejects_unknown_tier():
    res = client.post(
        "/campaigns/artisan-mid-autumn-mooncake-box/donate",
        json={"tierId": "does-not-exist", "backerName": "x"},
    )
    assert res.status_code == 400


def test_donate_rejects_investment_campaign():
    res = client.post(
        "/campaigns/friendly-citrus-orchard-transition/donate",
        json={"tierId": "t1", "backerName": "x"},
    )
    assert res.status_code == 400


def test_buy_shares_updates_position_and_raised_amount():
    slug = "friendly-citrus-orchard-transition"
    before = client.get(f"/campaigns/{slug}").json()

    res = client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 3})
    assert res.status_code == 200

    position = client.get(f"/campaigns/{slug}/position").json()
    assert position["shareCount"] == 2 + 3
    assert len(set(position["tokenIds"])) == len(position["tokenIds"])  # no duplicate token ids

    after = client.get(f"/campaigns/{slug}").json()
    assert after["raisedAmount"] == before["raisedAmount"] + 3 * 3_000


def test_ai_campaign_opens_for_purchase():
    slug = "ai-support-copilot-rd-fund"
    before = client.get(f"/campaigns/{slug}").json()
    terms = before["investment"]
    assert terms["status"] == 1
    assert terms["totalShares"] - terms["mintedShares"] == 50
    assert terms["currentYear"] == 0
    assert terms["cumulativePrincipal"] == 0
    assert terms["remainingPrincipal"] == terms["buildCost"]
    assert terms["buybackPrice"] == 0
    assert client.get(f"/campaigns/{slug}/position").json()["pendingRewards"] == 0

    res = client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 1})
    assert res.status_code == 200
    after = client.get(f"/campaigns/{slug}").json()
    assert after["investment"]["mintedShares"] == terms["mintedShares"] + 1
    assert after["raisedAmount"] == before["raisedAmount"] + terms["sharePrice"]
    assert client.get(f"/campaigns/{slug}/position").json()["shareCount"] == 6


def test_buy_shares_rejects_exceeding_supply():
    res = client.post("/campaigns/ai-support-copilot-rd-fund/buy-shares", json={"amount": 51})
    assert res.status_code == 400


def test_ai_campaign_rejects_purchase_after_last_share():
    slug = "ai-support-copilot-rd-fund"
    assert client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 50}).status_code == 200
    assert client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 1}).status_code == 400


def test_settlement_requires_sold_out():
    res = client.post("/campaigns/friendly-citrus-orchard-transition/settle")
    assert res.status_code == 400


def test_full_investment_lifecycle_settle_buyback_claim():
    slug = "ai-support-copilot-rd-fund"
    # Set up the fully funded, first-year state explicitly for lifecycle coverage.
    campaign = store.get_campaign_by_slug(slug)
    campaign.investment.mintedShares = campaign.investment.totalShares
    campaign.raisedAmount = campaign.goalAmount
    campaign.investment.currentYear = 1
    campaign.investment.cumulativePrincipal = 300_000
    campaign.investment.remainingPrincipal = 1_300_000
    campaign.investment.buybackPrice = 1_696_000
    store.get_investor_position(campaign.id).pendingRewards = 7_500

    before_position = client.get(f"/campaigns/{slug}/position").json()
    assert before_position["pendingRewards"] == 7_500

    settle = client.post(f"/campaigns/{slug}/settle")
    assert settle.status_code == 200
    after_settle = client.get(f"/campaigns/{slug}/position").json()
    # investorIncome = 500_000 * 60% = 300_000; rewardPerShare = 300_000/200 = 1_500
    # position holds 5 shares -> +7_500
    assert after_settle["pendingRewards"] == 7_500 + 7_500

    claim = client.post(f"/campaigns/{slug}/claim-reward")
    assert claim.status_code == 200
    assert claim.json()["amount"] == 15_000
    after_claim = client.get(f"/campaigns/{slug}/position").json()
    assert after_claim["pendingRewards"] == 0
    assert after_claim["shareCount"] == 5  # buyback not active yet, shares untouched

    buyback = client.post(f"/campaigns/{slug}/buyback")
    assert buyback.status_code == 200
    after_buyback = client.get(f"/campaigns/{slug}").json()
    assert after_buyback["investment"]["buybackActive"] is True
    assert after_buyback["investment"]["status"] == 2

    claim_again = client.post(f"/campaigns/{slug}/claim-reward")
    assert claim_again.status_code == 200
    final_position = client.get(f"/campaigns/{slug}/position").json()
    assert final_position["pendingRewards"] == 0
    assert final_position["shareCount"] == 0  # returned to farmer after buyback claim
    assert final_position["tokenIds"] == []


def test_claim_reward_rejects_when_nothing_pending():
    res = client.post("/campaigns/friendly-citrus-orchard-transition/claim-reward")
    assert res.status_code == 400


def test_create_campaign_gets_unique_id_and_slug():
    payload = {
        "title": "測試手作陶杯募資",
        "summary": "職人手作陶杯，溫潤質感每日使用",
        "story": "這是一段長度超過三十個字的詳細說明，用來測試建立募資專案的完整流程與驗證邏輯是否正常運作。",
        "category": "design",
        "creatorName": "測試工作室",
        "location": "高雄市",
        "durationDays": 30,
        "rewardTiers": [
            {"title": "陶杯一個", "price": 500, "description": "手工陶杯一個", "totalSupply": 100}
        ],
    }
    res = client.post("/campaigns", json=payload)
    assert res.status_code == 200
    created = res.json()

    all_ids = [c["id"] for c in client.get("/campaigns").json()]
    assert len(all_ids) == len(set(all_ids)), "campaign ids must be unique"
    assert created["id"] not in {"c1", "c2", "c3", "c4", "c5", "c6"}


def test_create_campaign_rejects_short_story():
    payload = {
        "title": "夠長的標題測試",
        "summary": "這是一段足夠長的簡介文字",
        "story": "太短",
        "category": "design",
        "creatorName": "x",
        "location": "x",
        "durationDays": 30,
        "rewardTiers": [{"title": "a", "price": 1, "description": "b", "totalSupply": 1}],
    }
    res = client.post("/campaigns", json=payload)
    assert res.status_code == 400


def test_set_status_gates_buy_shares():
    slug = "friendly-citrus-orchard-transition"
    lock = client.post(f"/campaigns/{slug}/status", json={"status": 3})
    assert lock.status_code == 200

    res = client.post(f"/campaigns/{slug}/buy-shares", json={"amount": 1})
    assert res.status_code == 400
