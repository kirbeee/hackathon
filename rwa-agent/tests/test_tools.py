"""Offline unit tests for the sell-side tools (get_market_data, sell_rwa) --
mocks fundraising-api over HTTP via respx, no live network/OpenAI needed,
unlike test_guardrails.py/test_purchase_confirmation.py."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import respx

from app import tools
from app.settings import settings

_FAKE_WALLET = "FakeAgentWallet1111111111111111111111111"


@pytest.fixture(autouse=True)
def fake_agent_wallet(monkeypatch):
    monkeypatch.setattr("app.solana_wallet.agent_pubkey", lambda: _FAKE_WALLET)


def _api_url(path: str) -> str:
    return f"{settings.fundraising_api_url}{path}"


def _future_deadline(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


@respx.mock
def test_get_market_data_investment_reports_progress_and_net_holdings():
    slug = "friendly-citrus-orchard-transition"
    campaign = {
        "slug": slug,
        "fundingModel": "investment",
        "goalAmount": 1000.0,
        "raisedAmount": 250.0,
        "deadline": _future_deadline(10),
        "investment": {"totalShares": 300, "mintedShares": 220},
    }
    history = {
        "walletAddress": _FAKE_WALLET,
        "donations": [],
        "investments": [
            {"campaignSlug": slug, "shares": 3},
            {"campaignSlug": "other-campaign", "shares": 99},
        ],
        "redemptions": [{"campaignSlug": slug, "shares": 1, "tierId": None}],
    }
    respx.get(_api_url(f"/campaigns/{slug}")).mock(return_value=httpx.Response(200, json=campaign))
    respx.get(_api_url(f"/wallets/{_FAKE_WALLET}/history")).mock(
        return_value=httpx.Response(200, json=history)
    )

    import asyncio

    result = json.loads(asyncio.run(tools.get_market_data(slug)))

    assert result["fundingProgressPct"] == 25.0
    assert result["remainingSupply"] == 80
    assert result["heldShares"] == 2  # 3 bought - 1 sold, ignoring the other campaign
    assert result["daysToDeadline"] >= 9


@respx.mock
def test_get_market_data_reward_excludes_redeemed_tiers():
    slug = "artisan-mid-autumn-mooncake-box"
    campaign = {
        "slug": slug,
        "fundingModel": "reward",
        "goalAmount": 400.0,
        "raisedAmount": 200.0,
        "deadline": _future_deadline(5),
        "rewardTiers": [{"id": "t1", "totalSupply": 10, "claimed": 4}],
    }
    history = {
        "walletAddress": _FAKE_WALLET,
        "donations": [
            {"campaignSlug": slug, "tierId": "t1"},
            {"campaignSlug": slug, "tierId": "t1"},
        ],
        "investments": [],
        "redemptions": [{"campaignSlug": slug, "tierId": "t1", "shares": 0}],
    }
    respx.get(_api_url(f"/campaigns/{slug}")).mock(return_value=httpx.Response(200, json=campaign))
    respx.get(_api_url(f"/wallets/{_FAKE_WALLET}/history")).mock(
        return_value=httpx.Response(200, json=history)
    )

    import asyncio

    result = json.loads(asyncio.run(tools.get_market_data(slug)))

    assert result["remainingSupply"] == 6
    # One donation's redemption cancels exactly one held t1, the other stays held.
    assert result["heldTierIds"] == ["t1"]


@respx.mock
def test_sell_rwa_investment_shares_hits_sell_endpoint_and_shapes_result():
    slug = "friendly-citrus-orchard-transition"
    campaign = {"slug": slug, "fundingModel": "investment"}
    respx.get(_api_url(f"/campaigns/{slug}")).mock(return_value=httpx.Response(200, json=campaign))
    sell_route = respx.post(_api_url(f"/campaigns/{slug}/sell")).mock(
        return_value=httpx.Response(
            200,
            json={"message": "已賣出 2 份 RWA Token", "amountLamports": 2_000_000, "txSignature": "sig-sell-1"},
        )
    )

    import asyncio

    result = json.loads(asyncio.run(tools.sell_rwa(slug, amount=2)))

    assert sell_route.called
    sent_body = json.loads(sell_route.calls.last.request.content)
    assert sent_body == {"amount": 2, "tierId": None, "walletAddress": _FAKE_WALLET, "viaLedger": False}
    assert result["shares"] == 2
    assert result["tierId"] is None
    assert result["lamportsRefunded"] == 2_000_000
    assert result["txSignature"] == "sig-sell-1"


@respx.mock
def test_sell_rwa_reward_tier_hits_sell_endpoint_with_tier_id():
    slug = "artisan-mid-autumn-mooncake-box"
    campaign = {"slug": slug, "fundingModel": "reward"}
    respx.get(_api_url(f"/campaigns/{slug}")).mock(return_value=httpx.Response(200, json=campaign))
    sell_route = respx.post(_api_url(f"/campaigns/{slug}/sell")).mock(
        return_value=httpx.Response(
            200,
            json={"message": "已取消此方案認購", "amountLamports": 1_000_000, "txSignature": "sig-sell-2"},
        )
    )

    import asyncio

    result = json.loads(asyncio.run(tools.sell_rwa(slug, tier_id="t1")))

    sent_body = json.loads(sell_route.calls.last.request.content)
    assert sent_body == {"amount": None, "tierId": "t1", "walletAddress": _FAKE_WALLET, "viaLedger": False}
    assert result["shares"] is None
    assert result["tierId"] == "t1"
    assert result["lamportsRefunded"] == 1_000_000


_HUMAN_WALLET = "HumanUserWallet2222222222222222222222222"


@respx.mock
def test_sell_rwa_with_user_wallet_attributes_to_user_and_uses_ledger():
    slug = "friendly-citrus-orchard-transition"
    campaign = {"slug": slug, "fundingModel": "investment"}
    respx.get(_api_url(f"/campaigns/{slug}")).mock(return_value=httpx.Response(200, json=campaign))
    sell_route = respx.post(_api_url(f"/campaigns/{slug}/sell")).mock(
        return_value=httpx.Response(
            200, json={"message": "已退回", "amountLamports": 1_000_000, "txSignature": None}
        )
    )

    import asyncio

    result = json.loads(asyncio.run(tools.sell_rwa(slug, amount=1, user_wallet=_HUMAN_WALLET)))

    sent_body = json.loads(sell_route.calls.last.request.content)
    assert sent_body == {
        "amount": 1,
        "tierId": None,
        "walletAddress": _HUMAN_WALLET,
        "viaLedger": True,
    }
    assert result["txSignature"] is None


@respx.mock
def test_get_wallet_balance_without_user_wallet_reports_pool_only(monkeypatch):
    monkeypatch.setattr("app.solana_wallet.get_balance_lamports", _async_return(4_000_000_000))

    import asyncio

    result = json.loads(asyncio.run(tools.get_wallet_balance()))

    assert result["agentPooledWallet"]["address"] == _FAKE_WALLET
    assert result["agentPooledWallet"]["lamports"] == 4_000_000_000
    assert "userLedgerBalance" not in result


@respx.mock
def test_get_wallet_balance_with_user_wallet_reports_ledger(monkeypatch):
    monkeypatch.setattr("app.solana_wallet.get_balance_lamports", _async_return(4_000_000_000))
    respx.get(_api_url(f"/wallets/{_HUMAN_WALLET}/balance")).mock(
        return_value=httpx.Response(200, json={"walletAddress": _HUMAN_WALLET, "availableLamports": 2_500_000})
    )

    import asyncio

    result = json.loads(asyncio.run(tools.get_wallet_balance(user_wallet=_HUMAN_WALLET)))

    assert result["userLedgerBalance"]["availableLamports"] == 2_500_000
    assert result["agentPooledWallet"]["lamports"] == 4_000_000_000


@respx.mock
def test_buy_rwa_with_user_wallet_refuses_before_paying_when_ledger_too_low(monkeypatch):
    slug = "friendly-citrus-orchard-transition"
    send_payment_calls: list[tuple[str, int]] = []
    monkeypatch.setattr(
        "app.solana_wallet.send_payment", _async_record(send_payment_calls, "sig-should-not-happen")
    )
    respx.get(_api_url(f"/campaigns/{slug}")).mock(
        return_value=httpx.Response(200, json={"slug": slug, "fundingModel": "investment"})
    )
    respx.get(_api_url("/config")).mock(
        return_value=httpx.Response(
            200,
            json={
                "solanaTreasuryAddress": "TreasuryAddr333333333333333333333333333",
                "solanaCluster": "devnet",
                "lamportsPerShareUnit": 1_000_000,
            },
        )
    )
    respx.get(_api_url(f"/wallets/{_HUMAN_WALLET}/balance")).mock(
        return_value=httpx.Response(200, json={"walletAddress": _HUMAN_WALLET, "availableLamports": 500_000})
    )
    buy_route = respx.post(_api_url(f"/campaigns/{slug}/buy-shares")).mock(
        return_value=httpx.Response(200, json={"message": "should not be called"})
    )

    import asyncio

    result = json.loads(asyncio.run(tools.buy_rwa(slug, amount=1, user_wallet=_HUMAN_WALLET)))

    assert "error" in result
    assert not send_payment_calls, "must not send a real payment when the ledger balance is too low"
    assert not buy_route.called


@respx.mock
def test_buy_rwa_with_user_wallet_pays_and_attributes_to_user(monkeypatch):
    slug = "friendly-citrus-orchard-transition"
    send_payment_calls: list[tuple[str, int]] = []
    monkeypatch.setattr(
        "app.solana_wallet.send_payment", _async_record(send_payment_calls, "sig-agent-pay-1")
    )
    respx.get(_api_url(f"/campaigns/{slug}")).mock(
        return_value=httpx.Response(200, json={"slug": slug, "fundingModel": "investment"})
    )
    respx.get(_api_url("/config")).mock(
        return_value=httpx.Response(
            200,
            json={
                "solanaTreasuryAddress": "TreasuryAddr333333333333333333333333333",
                "solanaCluster": "devnet",
                "lamportsPerShareUnit": 1_000_000,
            },
        )
    )
    respx.get(_api_url(f"/wallets/{_HUMAN_WALLET}/balance")).mock(
        return_value=httpx.Response(200, json={"walletAddress": _HUMAN_WALLET, "availableLamports": 5_000_000})
    )
    buy_route = respx.post(_api_url(f"/campaigns/{slug}/buy-shares")).mock(
        return_value=httpx.Response(200, json={"message": "已購買"})
    )

    import asyncio

    result = json.loads(asyncio.run(tools.buy_rwa(slug, amount=1, user_wallet=_HUMAN_WALLET)))

    assert send_payment_calls == [("TreasuryAddr333333333333333333333333333", 1_000_000)]
    sent_body = json.loads(buy_route.calls.last.request.content)
    assert sent_body["walletAddress"] == _HUMAN_WALLET
    assert sent_body["viaLedger"] is True
    assert result["txSignature"] == "sig-agent-pay-1"


def _async_return(value):
    async def _fn(*_args, **_kwargs):
        return value

    return _fn


def _async_record(calls: list[tuple[str, int]], signature: str):
    async def _fn(to_address: str, lamports: int) -> str:
        calls.append((to_address, lamports))
        return signature

    return _fn
