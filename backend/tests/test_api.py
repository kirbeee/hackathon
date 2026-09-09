import pytest
from fastapi.testclient import TestClient

from app import chain_verify, store, treasury_wallet
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store():
    store.reset_for_tests()
    yield


@pytest.fixture(autouse=True)
def fake_chain_verify(monkeypatch):
    """buy-shares/donate/deposit verify a claimed txSignature really moved
    the money on-chain -- stub that out by default so tests can use
    made-up signatures like the rest of this offline suite does, same
    reasoning as fake_treasury_payment. Tests that care about rejection
    override this with monkeypatch themselves."""

    async def _fake_verify(signature: str, from_address: str, min_lamports: int) -> None:
        return None

    monkeypatch.setattr(chain_verify, "verify_spent_at_least", _fake_verify)


@pytest.fixture
def fake_treasury_payment(monkeypatch):
    """Sell/redeem sends a real treasury-signed devnet refund -- stub it out
    so these tests stay offline, same as buy/donate never touching Solana."""
    calls: list[tuple[str, int]] = []

    async def _fake_send_payment(to_address: str, lamports: int) -> str:
        calls.append((to_address, lamports))
        return f"fake-refund-sig-{len(calls)}"

    monkeypatch.setattr(treasury_wallet, "send_payment", _fake_send_payment)
    return calls


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
        "redemptions": [],
        "deposits": [],
        "availableLamports": 0,
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


def test_buy_shares_rejects_unverifiable_signature(monkeypatch):
    async def _fail_verify(signature, from_address, min_lamports):
        raise chain_verify.TransferVerificationError("找不到這筆交易")

    monkeypatch.setattr(chain_verify, "verify_spent_at_least", _fail_verify)

    slug = "friendly-citrus-orchard-transition"
    wallet = "UnverifiedWalletCCCCCCCCCCCCCCCCCCCCCCCCCCC"
    res = client.post(
        f"/campaigns/{slug}/buy-shares",
        json={"amount": 1, "txSignature": "fake-sig", "walletAddress": wallet},
    )
    assert res.status_code == 400
    assert client.get(f"/wallets/{wallet}/history").json()["investments"] == []


def test_buy_shares_without_wallet_address_skips_verification(monkeypatch):
    """A signature paired with no walletAddress can never be redeemed (see
    get_wallet_shares_held), so there's nothing worth verifying -- and the
    existing demo-position flow (no wallet at all) must keep working."""

    def _boom(*_args, **_kwargs):
        raise AssertionError("must not attempt verification with no walletAddress")

    monkeypatch.setattr(chain_verify, "verify_spent_at_least", _boom)

    res = client.post(
        "/campaigns/friendly-citrus-orchard-transition/buy-shares",
        json={"amount": 1, "txSignature": "sig-no-wallet"},
    )
    assert res.status_code == 200


def test_same_tx_signature_cannot_back_two_purchases():
    slug = "friendly-citrus-orchard-transition"
    wallet = "ReplayWalletDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
    body = {"amount": 1, "txSignature": "sig-replay-1", "walletAddress": wallet}

    first = client.post(f"/campaigns/{slug}/buy-shares", json=body)
    assert first.status_code == 200

    second = client.post(f"/campaigns/{slug}/buy-shares", json=body)
    assert second.status_code == 400

    held_shares = client.get(f"/wallets/{wallet}/history").json()["investments"]
    assert len(held_shares) == 1


def test_sell_rejects_donation_that_was_never_signature_backed(fake_treasury_payment):
    """A donation recorded with no txSignature (or no walletAddress) must
    never be redeemable for a real refund -- see preview_redeem_donation."""
    slug = "artisan-mid-autumn-mooncake-box"
    wallet = "NoProofWalletEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"

    client.post(f"/campaigns/{slug}/donate", json={"tierId": "t1", "walletAddress": wallet})

    res = client.post(f"/campaigns/{slug}/sell", json={"tierId": "t1", "walletAddress": wallet})
    assert res.status_code == 400
    assert not fake_treasury_payment


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


def test_sell_shares_refunds_and_updates_position(fake_treasury_payment):
    slug = "friendly-citrus-orchard-transition"
    wallet = "SellerWallet1111111111111111111111111111"

    client.post(
        f"/campaigns/{slug}/buy-shares",
        json={
            "amount": 3,
            "txSignature": "sig-buy-1",
            "amountLamports": 3_000_000,
            "walletAddress": wallet,
        },
    )
    before = client.get(f"/campaigns/{slug}").json()
    position_before = client.get(f"/campaigns/{slug}/position").json()

    res = client.post(f"/campaigns/{slug}/sell", json={"amount": 2, "walletAddress": wallet})
    assert res.status_code == 200
    body = res.json()
    assert body["amountLamports"] == 2 * store.LAMPORTS_PER_SHARE_UNIT
    assert body["txSignature"]
    assert fake_treasury_payment == [(wallet, 2 * store.LAMPORTS_PER_SHARE_UNIT)]

    after = client.get(f"/campaigns/{slug}").json()
    assert after["investment"]["mintedShares"] == before["investment"]["mintedShares"] - 2
    assert after["raisedAmount"] == before["raisedAmount"] - 2 * before["investment"]["sharePrice"]

    position_after = client.get(f"/campaigns/{slug}/position").json()
    assert position_after["shareCount"] == position_before["shareCount"] - 2

    history = client.get(f"/wallets/{wallet}/history").json()
    assert len(history["redemptions"]) == 1
    assert history["redemptions"][0]["shares"] == 2
    assert history["redemptions"][0]["campaignSlug"] == slug


def test_sell_shares_rejects_selling_more_than_wallet_holds(fake_treasury_payment):
    slug = "friendly-citrus-orchard-transition"
    wallet = "SellerWallet2222222222222222222222222222"

    client.post(
        f"/campaigns/{slug}/buy-shares",
        json={"amount": 1, "txSignature": "sig-buy-2", "walletAddress": wallet},
    )
    res = client.post(f"/campaigns/{slug}/sell", json={"amount": 2, "walletAddress": wallet})
    assert res.status_code == 400
    assert not fake_treasury_payment, "should never touch the treasury for a rejected sell"


def test_sell_shares_rejects_wallet_with_no_holdings(fake_treasury_payment):
    slug = "friendly-citrus-orchard-transition"
    res = client.post(
        f"/campaigns/{slug}/sell",
        json={"amount": 1, "walletAddress": "NeverBoughtAnything333333333333333333333"},
    )
    assert res.status_code == 400
    assert not fake_treasury_payment


def test_sell_reward_tier_cancels_pledge_and_refunds(fake_treasury_payment):
    slug = "artisan-mid-autumn-mooncake-box"
    wallet = "RewardSellerWallet44444444444444444444444"

    client.post(
        f"/campaigns/{slug}/donate",
        json={"tierId": "t1", "txSignature": "sig-donate-3", "walletAddress": wallet},
    )
    before = client.get(f"/campaigns/{slug}").json()

    res = client.post(f"/campaigns/{slug}/sell", json={"tierId": "t1", "walletAddress": wallet})
    assert res.status_code == 200
    body = res.json()
    assert body["amountLamports"] == store.LAMPORTS_PER_SHARE_UNIT
    assert fake_treasury_payment == [(wallet, store.LAMPORTS_PER_SHARE_UNIT)]

    after = client.get(f"/campaigns/{slug}").json()
    tier_before = next(t for t in before["rewardTiers"] if t["id"] == "t1")
    tier_after = next(t for t in after["rewardTiers"] if t["id"] == "t1")
    assert tier_after["claimed"] == tier_before["claimed"] - 1
    assert after["raisedAmount"] == before["raisedAmount"] - tier_before["price"]
    assert after["backerCount"] == before["backerCount"] - 1

    # Same wallet can't redeem the same pledge twice.
    res_again = client.post(f"/campaigns/{slug}/sell", json={"tierId": "t1", "walletAddress": wallet})
    assert res_again.status_code == 400


def test_sell_surfaces_treasury_payment_failure_without_mutating_state(monkeypatch):
    slug = "friendly-citrus-orchard-transition"
    wallet = "SellerWallet5555555555555555555555555555"
    client.post(
        f"/campaigns/{slug}/buy-shares",
        json={"amount": 1, "txSignature": "sig-buy-5", "walletAddress": wallet},
    )
    before = client.get(f"/campaigns/{slug}").json()

    async def _fail(to_address: str, lamports: int) -> str:
        raise treasury_wallet.InsufficientTreasuryFundsError("treasury is dry")

    monkeypatch.setattr(treasury_wallet, "send_payment", _fail)

    res = client.post(f"/campaigns/{slug}/sell", json={"amount": 1, "walletAddress": wallet})
    assert res.status_code == 502

    after = client.get(f"/campaigns/{slug}").json()
    assert after["investment"]["mintedShares"] == before["investment"]["mintedShares"]


def test_deposit_credits_ledger_balance():
    wallet = "DepositorWallet6666666666666666666666666"

    res = client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 5_000_000, "txSignature": "sig-dep-1"})
    assert res.status_code == 200
    assert res.json()["availableLamports"] == 5_000_000

    res2 = client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 1_000_000, "txSignature": "sig-dep-2"})
    assert res2.json()["availableLamports"] == 6_000_000

    balance = client.get(f"/wallets/{wallet}/balance").json()
    assert balance == {"walletAddress": wallet, "availableLamports": 6_000_000}

    history = client.get(f"/wallets/{wallet}/history").json()
    assert history["availableLamports"] == 6_000_000
    assert len(history["deposits"]) == 2
    assert {d["txSignature"] for d in history["deposits"]} == {"sig-dep-1", "sig-dep-2"}


def test_deposit_rejects_non_positive_amount():
    res = client.post(
        "/wallets/SomeWallet7777777777777777777777777777/deposit",
        json={"amountLamports": 0, "txSignature": "sig-dep-x"},
    )
    assert res.status_code == 400


def test_via_ledger_buy_shares_debits_balance_and_attributes_holding():
    slug = "friendly-citrus-orchard-transition"
    wallet = "LedgerBuyerWallet888888888888888888888888"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 3_000_000, "txSignature": "sig-dep-3"})

    res = client.post(
        f"/campaigns/{slug}/buy-shares",
        json={
            "amount": 2,
            "txSignature": "sig-agent-buy-1",
            "amountLamports": 2_000_000,
            "walletAddress": wallet,
            "viaLedger": True,
        },
    )
    assert res.status_code == 200

    balance = client.get(f"/wallets/{wallet}/balance").json()
    assert balance["availableLamports"] == 1_000_000  # 3M deposited - 2M spent

    history = client.get(f"/wallets/{wallet}/history").json()
    assert len(history["investments"]) == 1
    assert history["investments"][0]["shares"] == 2


def test_via_ledger_buy_shares_rejects_insufficient_balance():
    slug = "friendly-citrus-orchard-transition"
    wallet = "PoorLedgerWallet99999999999999999999999999"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 500_000, "txSignature": "sig-dep-4"})

    res = client.post(
        f"/campaigns/{slug}/buy-shares",
        json={
            "amount": 1,
            "txSignature": "sig-agent-buy-2",
            "amountLamports": 1_000_000,
            "walletAddress": wallet,
            "viaLedger": True,
        },
    )
    assert res.status_code == 400
    assert client.get(f"/wallets/{wallet}/balance").json()["availableLamports"] == 500_000


def test_via_ledger_donate_debits_fixed_unit_price():
    slug = "artisan-mid-autumn-mooncake-box"
    wallet = "LedgerDonorWalletAAAAAAAAAAAAAAAAAAAAAAAAA"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 1_000_000, "txSignature": "sig-dep-5"})

    res = client.post(
        f"/campaigns/{slug}/donate",
        json={"tierId": "t1", "txSignature": "sig-agent-donate-1", "walletAddress": wallet, "viaLedger": True},
    )
    assert res.status_code == 200
    assert client.get(f"/wallets/{wallet}/balance").json()["availableLamports"] == 0


def test_via_ledger_buy_never_verifies_signature_against_the_credited_wallet(monkeypatch):
    """Regression test: a viaLedger buy is paid by the agent's own pooled
    wallet, not walletAddress -- pinning walletAddress as the expected
    payer (as the real deposit/direct-buy checks do) would reject every
    legitimate agent-paid purchase with a false "payer doesn't match"
    error. The ledger debit itself (bounded by a previously verified
    deposit) is what makes this safe without per-buy verification."""

    slug = "friendly-citrus-orchard-transition"
    wallet = "LedgerBuyerWalletGGGGGGGGGGGGGGGGGGGGGGGGG"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 2_000_000, "txSignature": "sig-dep-6"})

    def _boom(*_args, **_kwargs):
        raise AssertionError("must not verify a viaLedger buy's signature against walletAddress")

    monkeypatch.setattr(chain_verify, "verify_spent_at_least", _boom)

    res = client.post(
        f"/campaigns/{slug}/buy-shares",
        json={
            "amount": 1,
            "txSignature": "sig-agent-buy-3",
            "amountLamports": 1_000_000,
            "walletAddress": wallet,
            "viaLedger": True,
        },
    )
    assert res.status_code == 200


def test_via_ledger_donate_never_verifies_signature_against_the_credited_wallet(monkeypatch):
    slug = "artisan-mid-autumn-mooncake-box"
    wallet = "LedgerDonorWalletHHHHHHHHHHHHHHHHHHHHHHHHH"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 1_000_000, "txSignature": "sig-dep-7"})

    def _boom(*_args, **_kwargs):
        raise AssertionError("must not verify a viaLedger donate's signature against walletAddress")

    monkeypatch.setattr(chain_verify, "verify_spent_at_least", _boom)

    res = client.post(
        f"/campaigns/{slug}/donate",
        json={"tierId": "t1", "txSignature": "sig-agent-donate-2", "walletAddress": wallet, "viaLedger": True},
    )
    assert res.status_code == 200


def test_via_ledger_sell_credits_balance_without_treasury_payment(fake_treasury_payment):
    slug = "friendly-citrus-orchard-transition"
    wallet = "LedgerSellerWalletBBBBBBBBBBBBBBBBBBBBBBBB"
    client.post(f"/wallets/{wallet}/deposit", json={"amountLamports": 3_000_000, "txSignature": "sig-dep-6"})
    client.post(
        f"/campaigns/{slug}/buy-shares",
        json={
            "amount": 2,
            "txSignature": "sig-agent-buy-3",
            "amountLamports": 2_000_000,
            "walletAddress": wallet,
            "viaLedger": True,
        },
    )

    res = client.post(
        f"/campaigns/{slug}/sell", json={"amount": 1, "walletAddress": wallet, "viaLedger": True}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["txSignature"] is None
    assert body["amountLamports"] == store.LAMPORTS_PER_SHARE_UNIT
    assert not fake_treasury_payment, "a viaLedger sell must never touch the treasury wallet"

    balance = client.get(f"/wallets/{wallet}/balance").json()
    assert balance["availableLamports"] == 1_000_000 + store.LAMPORTS_PER_SHARE_UNIT
