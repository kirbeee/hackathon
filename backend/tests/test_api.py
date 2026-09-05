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


def test_wallet_history_collects_donations_and_investments_across_campaigns():
    wallet = "WalletAddr111111111111111111111111111111"
    other_wallet = "OtherWallet2222222222222222222222222222"

    client.post(
        "/campaigns/friendly-citrus-orchard-transition/buy-shares",
        json={
            "amount": 1,
            "txSignature": "sig-shares-1",
            "amountLamports": 1_000_000,
            "walletAddress": wallet,
        },
    )
    client.post(
        "/campaigns/artisan-mid-autumn-mooncake-box/donate",
        json={"tierId": "t1", "txSignature": "sig-donate-1", "walletAddress": wallet},
    )
    client.post(
        "/campaigns/artisan-mid-autumn-mooncake-box/donate",
        json={"tierId": "t1", "txSignature": "sig-donate-2", "walletAddress": other_wallet},
    )

    history = client.get(f"/wallets/{wallet}/history").json()
    assert history["walletAddress"] == wallet
    assert len(history["donations"]) == 1
    assert history["donations"][0]["txSignature"] == "sig-donate-1"
    assert history["donations"][0]["campaignSlug"] == "artisan-mid-autumn-mooncake-box"
    assert len(history["investments"]) == 1
    assert history["investments"][0]["txSignature"] == "sig-shares-1"
    assert history["investments"][0]["campaignSlug"] == "friendly-citrus-orchard-transition"

    assert client.get(f"/wallets/{other_wallet}/history").json()["donations"][0]["txSignature"] == "sig-donate-2"
    assert client.get("/wallets/never-used-address/history").json() == {
        "walletAddress": "never-used-address",
        "donations": [],
        "investments": [],
    }


def test_list_campaigns_has_seed_data():
    res = client.get("/campaigns")
    assert res.status_code == 200
    campaigns = res.json()
    assert len(campaigns) == 7
    slugs = {c["slug"] for c in campaigns}
    assert "friendly-citrus-orchard-transition" in slugs
    assert "ai-support-copilot-rd-fund" in slugs
    assert "cathay-xinyi-office-rental-income-rwa" in slugs

    by_slug = {c["slug"]: c for c in campaigns}
    assert by_slug["ai-support-copilot-rd-fund"]["riskTier"] == "degen"
    assert by_slug["friendly-citrus-orchard-transition"]["riskTier"] == "supporter"
    assert by_slug["cathay-xinyi-office-rental-income-rwa"]["riskTier"] == "diversifier"


def test_get_campaign_404_for_unknown_slug():
    res = client.get("/campaigns/does-not-exist")
    assert res.status_code == 404


def test_all_demo_tokens_cost_one_usdc_and_totals_match():
    for campaign in client.get("/campaigns").json():
        if campaign["investment"]:
            terms = campaign["investment"]
            assert terms["sharePrice"] == 30
            assert campaign["raisedAmount"] == terms["mintedShares"] * 30
            assert campaign["goalAmount"] == terms["totalShares"] * 30
            assert terms["buildCost"] == campaign["goalAmount"]
        else:
            tiers = campaign["rewardTiers"]
            assert all(tier["price"] == 30 for tier in tiers)
            assert campaign["raisedAmount"] == sum(tier["claimed"] * 30 for tier in tiers)
            assert campaign["goalAmount"] == sum(tier["totalSupply"] * 30 for tier in tiers)


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
    assert after["raisedAmount"] == before["raisedAmount"] + 30
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
    assert after["raisedAmount"] == before["raisedAmount"] + 3 * 30


def test_ai_campaign_opens_for_purchase():
    slug = "ai-support-copilot-rd-fund"
    before = client.get(f"/campaigns/{slug}").json()
    terms = before["investment"]
    assert terms["status"] == 1
    assert terms["totalShares"] - terms["mintedShares"] == 50
    assert terms["currentYear"] == 0
    assert terms["cumulativePrincipal"] == 0
    assert terms["remainingPrincipal"] == terms["buildCost"]
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
    assert created["id"] not in {"c1", "c2", "c3", "c4", "c5", "c6", "c7"}


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
