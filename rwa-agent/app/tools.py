"""The buy- and sell-side tools the LLM can call, matching hackathon/README.md
section 10's MCP tool list in full. These are also re-exported as real MCP
tools by app/mcp_server.py — this module is the single source of truth for
both the in-process OpenAI tool-calling loop (app/agent.py) and any external
MCP client."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from app import fundraising_client, risk, solana_wallet

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_rwa_assets",
            "description": "List all RWA campaigns currently open for investment on the platform.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_score",
            "description": (
                "Compute a deterministic 0-100 risk score (and low/medium/high level) "
                "for one campaign by slug. Always call this before deciding to buy."
            ),
            "parameters": {
                "type": "object",
                "properties": {"slug": {"type": "string"}},
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_wallet_balance",
            "description": (
                "Get the user's custodial ledger balance (how much devnet SOL they've "
                "deposited into the agent's wallet and haven't spent yet -- this is what "
                "actually limits how much you can buy_rwa for them) plus the agent's own "
                "pooled wallet address/SOL balance for reference."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_data",
            "description": (
                "Get funding-progress/supply signals for one campaign (fundingProgressPct, "
                "remainingSupply, daysToDeadline) plus how much of it this user currently "
                "holds (heldShares for investment campaigns, heldTierIds for reward "
                "campaigns). There is no live secondary-market price here — this is the closest "
                "signal to one, and also the only way to know current holdings before selling. "
                "Always call this before deciding to sell_rwa on a campaign."
            ),
            "parameters": {
                "type": "object",
                "properties": {"slug": {"type": "string"}},
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buy_rwa",
            "description": (
                "Buy an RWA token on the user's behalf: pays out of the agent's pooled "
                "devnet wallet, debiting the cost from the user's own custodial ledger "
                "balance (see get_wallet_balance) -- fails if that balance is too low, "
                "even if the pooled wallet itself has enough SOL. Then records the "
                "purchase in fundraising-api under the user's holdings. For an "
                "'investment' campaign, `amount` is the number of shares to buy. For a "
                "'reward' campaign, `tier_id` selects which reward tier to back (one "
                "unit per call)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string"},
                    "amount": {
                        "type": "integer",
                        "description": "Number of shares to buy (investment campaigns only). Defaults to 1.",
                    },
                    "tier_id": {
                        "type": "string",
                        "description": "Reward tier id to back (reward campaigns only).",
                    },
                },
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "sell_rwa",
            "description": (
                "Sell an RWA token back to the issuer on the user's behalf: the refund is "
                "credited straight back to the user's own custodial ledger balance (see "
                "get_wallet_balance), not sent as a separate on-chain payment, since the "
                "cash never left the agent's pooled wallet in the first place. There is no "
                "secondary market, so this redeems at the same demo unit price it was "
                "bought at, not a market price. For an 'investment' campaign, `amount` is "
                "the number of shares to sell — it can never exceed what get_market_data "
                "reported as heldShares. For a 'reward' campaign, `tier_id` cancels one "
                "already-backed pledge of that tier."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string"},
                    "amount": {
                        "type": "integer",
                        "description": "Number of shares to sell (investment campaigns only).",
                    },
                    "tier_id": {
                        "type": "string",
                        "description": "Reward tier id to cancel (reward campaigns only).",
                    },
                },
                "required": ["slug"],
            },
        },
    },
]


async def get_rwa_assets() -> str:
    campaigns = await fundraising_client.list_campaigns()
    summary = [
        {
            "slug": c["slug"],
            "title": c["title"],
            "category": c["category"],
            "riskTier": c.get("riskTier"),
            "fundingModel": c["fundingModel"],
            "goalAmount": c["goalAmount"],
            "raisedAmount": c["raisedAmount"],
        }
        for c in campaigns
    ]
    return json.dumps(summary, ensure_ascii=False)


async def get_risk_score(slug: str) -> str:
    campaign = await fundraising_client.get_campaign(slug)
    score, level = risk.score_campaign(campaign)
    tier = campaign.get("riskTier")
    info = risk.tier_info(tier) if tier else None
    return json.dumps(
        {
            "slug": slug,
            "score": round(score, 1),
            "level": level,
            "riskTier": tier,
            "tierLabel": info["label"] if info else None,
            "tierDescription": info["description"] if info else None,
        },
        ensure_ascii=False,
    )


async def get_wallet_balance(*, user_wallet: str | None = None) -> str:
    lamports = await solana_wallet.get_balance_lamports()
    data: dict[str, Any] = {
        "agentPooledWallet": {
            "address": solana_wallet.agent_pubkey(),
            "lamports": lamports,
            "sol": lamports / 1_000_000_000,
        }
    }
    if user_wallet:
        ledger = await fundraising_client.get_ledger_balance(user_wallet)
        available = ledger["availableLamports"]
        data["userLedgerBalance"] = {
            "walletAddress": user_wallet,
            "availableLamports": available,
            "availableSol": available / 1_000_000_000,
        }
    else:
        data["note"] = (
            "No user_wallet in this session -- nothing has been deposited, so buy_rwa "
            "cannot spend on anyone's behalf yet."
        )
    return json.dumps(data, ensure_ascii=False)


async def get_market_data(slug: str, *, user_wallet: str | None = None) -> str:
    campaign, history = await asyncio.gather(
        fundraising_client.get_campaign(slug),
        fundraising_client.get_wallet_history(user_wallet or solana_wallet.agent_pubkey()),
    )

    goal = campaign.get("goalAmount") or 0
    raised = campaign.get("raisedAmount") or 0
    funding_progress_pct = round((raised / goal * 100) if goal else 0.0, 1)

    deadline = datetime.fromisoformat(campaign["deadline"])
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    days_to_deadline = (deadline - datetime.now(timezone.utc)).days

    data: dict[str, Any] = {
        "slug": slug,
        "fundingModel": campaign["fundingModel"],
        "fundingProgressPct": funding_progress_pct,
        "daysToDeadline": days_to_deadline,
    }

    if campaign["fundingModel"] == "investment":
        terms = campaign["investment"]
        data["remainingSupply"] = terms["totalShares"] - terms["mintedShares"]
        bought = sum(t["shares"] for t in history["investments"] if t["campaignSlug"] == slug)
        sold = sum(r["shares"] for r in history["redemptions"] if r["campaignSlug"] == slug)
        data["heldShares"] = bought - sold
    else:
        data["remainingSupply"] = sum(
            t["totalSupply"] - t["claimed"] for t in campaign.get("rewardTiers", [])
        )
        held_tier_ids = [d["tierId"] for d in history["donations"] if d["campaignSlug"] == slug]
        for redeemed_tier_id in (
            r["tierId"] for r in history["redemptions"] if r["campaignSlug"] == slug
        ):
            if redeemed_tier_id in held_tier_ids:
                held_tier_ids.remove(redeemed_tier_id)
        data["heldTierIds"] = held_tier_ids

    return json.dumps(data, ensure_ascii=False)


async def buy_rwa(
    slug: str, amount: int = 1, tier_id: str | None = None, *, user_wallet: str | None = None
) -> str:
    """Always pays for real out of the agent's own devnet wallet. When
    user_wallet is set, that payment is on the user's behalf: the purchase
    is attributed to user_wallet and its cost is debited from user_wallet's
    custodial ledger balance (via_ledger=True) rather than being free money
    -- checked up front so an insufficient balance is refused before any
    real payment goes out, not after. This pre-check and the backend's
    authoritative debit aren't atomic with each other, so two concurrent
    buy_rwa calls for the same user_wallet can both pass the pre-check and
    both send a real payment before either debits the ledger, leaving the
    second call's payment sent with no compensating ledger credit if the
    backend then rejects it; low-probability for a single-operator demo and
    not worth server-side locking for, but worth knowing about before
    reusing this pattern somewhere concurrency actually matters. Without a
    user_wallet (e.g. a standalone/MCP call with no session user), it falls
    back to the agent's own pubkey and no ledger is touched -- matches the
    original buy-only behavior."""
    campaign = await fundraising_client.get_campaign(slug)
    config = await fundraising_client.get_config()
    treasury = config["solanaTreasuryAddress"]
    lamports_per_unit = config["lamportsPerShareUnit"]
    owner = user_wallet or solana_wallet.agent_pubkey()
    via_ledger = user_wallet is not None

    lamports = (
        amount * lamports_per_unit if campaign["fundingModel"] == "investment" else lamports_per_unit
    )
    if via_ledger:
        ledger = await fundraising_client.get_ledger_balance(user_wallet)
        available = ledger["availableLamports"]
        if available < lamports:
            return json.dumps(
                {
                    "error": (
                        f"這個使用者的可投資餘額只有 {available} lamports，"
                        f"不足支付 {lamports} lamports，需要先儲值。"
                    )
                },
                ensure_ascii=False,
            )

    if campaign["fundingModel"] == "investment":
        signature = await solana_wallet.send_payment(treasury, lamports)
        result = await fundraising_client.buy_shares(
            slug, amount, signature, lamports, owner, via_ledger
        )
        return json.dumps(
            {
                "slug": slug,
                "fundingModel": "investment",
                "shares": amount,
                "lamports": lamports,
                "txSignature": signature,
                "apiMessage": result.get("message"),
            },
            ensure_ascii=False,
        )

    tiers = campaign.get("rewardTiers", [])
    chosen_tier = tier_id
    if not chosen_tier:
        available_tiers = [t for t in tiers if t["claimed"] < t["totalSupply"]]
        if not available_tiers:
            return json.dumps({"error": f"No reward tiers left to back on {slug}."})
        chosen_tier = available_tiers[0]["id"]

    signature = await solana_wallet.send_payment(treasury, lamports_per_unit)
    result = await fundraising_client.donate(
        slug, chosen_tier, signature, owner, via_ledger=via_ledger
    )
    return json.dumps(
        {
            "slug": slug,
            "fundingModel": "reward",
            "tierId": chosen_tier,
            "lamports": lamports_per_unit,
            "txSignature": signature,
            "apiMessage": result.get("message"),
        },
        ensure_ascii=False,
    )


async def sell_rwa(
    slug: str, amount: int | None = None, tier_id: str | None = None, *, user_wallet: str | None = None
) -> str:
    campaign = await fundraising_client.get_campaign(slug)
    owner = user_wallet or solana_wallet.agent_pubkey()
    via_ledger = user_wallet is not None
    result = await fundraising_client.sell(
        slug, owner, amount=amount, tier_id=tier_id, via_ledger=via_ledger
    )
    return json.dumps(
        {
            "slug": slug,
            "fundingModel": campaign["fundingModel"],
            "shares": amount if campaign["fundingModel"] == "investment" else None,
            "tierId": tier_id if campaign["fundingModel"] == "reward" else None,
            "lamportsRefunded": result.get("amountLamports"),
            "txSignature": result.get("txSignature"),
            "apiMessage": result.get("message"),
        },
        ensure_ascii=False,
    )


DISPATCH = {
    "get_rwa_assets": get_rwa_assets,
    "get_risk_score": get_risk_score,
    "get_market_data": get_market_data,
    "get_wallet_balance": get_wallet_balance,
    "buy_rwa": buy_rwa,
    "sell_rwa": sell_rwa,
}

# Tools that take a keyword-only `user_wallet` param the LLM never sees or
# fills in (it's not in TOOL_SCHEMAS) -- the caller injects it from session/
# request context instead. See app/agent.py's dispatch loop.
USER_WALLET_TOOLS = {"get_market_data", "get_wallet_balance", "buy_rwa", "sell_rwa"}
