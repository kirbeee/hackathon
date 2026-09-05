"""The four buy-side tools the LLM can call, matching hackathon/README.md
section 10's MCP tool list (sell_rwa / get_market_data intentionally out of
scope for this phase — see project memory)."""

from __future__ import annotations

import json
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
            "description": "Get the agent's own Solana devnet wallet address and current SOL balance.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buy_rwa",
            "description": (
                "Buy an RWA token: sends a real Solana devnet SOL payment from the "
                "agent's wallet to the campaign treasury, then records the purchase in "
                "fundraising-api. For an 'investment' campaign, `amount` is the number "
                "of shares to buy. For a 'reward' campaign, `tier_id` selects which "
                "reward tier to back (one unit per call)."
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
]


async def get_rwa_assets() -> str:
    campaigns = await fundraising_client.list_campaigns()
    summary = [
        {
            "slug": c["slug"],
            "title": c["title"],
            "category": c["category"],
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
    return json.dumps({"slug": slug, "score": round(score, 1), "level": level}, ensure_ascii=False)


async def get_wallet_balance() -> str:
    lamports = await solana_wallet.get_balance_lamports()
    return json.dumps(
        {
            "address": solana_wallet.agent_pubkey(),
            "lamports": lamports,
            "sol": lamports / 1_000_000_000,
        }
    )


async def buy_rwa(slug: str, amount: int = 1, tier_id: str | None = None) -> str:
    campaign = await fundraising_client.get_campaign(slug)
    config = await fundraising_client.get_config()
    treasury = config["solanaTreasuryAddress"]
    lamports_per_unit = config["lamportsPerShareUnit"]

    if campaign["fundingModel"] == "investment":
        lamports = amount * lamports_per_unit
        signature = await solana_wallet.send_payment(treasury, lamports)
        result = await fundraising_client.buy_shares(slug, amount, signature, lamports)
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
        available = [t for t in tiers if t["claimed"] < t["totalSupply"]]
        if not available:
            return json.dumps({"error": f"No reward tiers left to back on {slug}."})
        chosen_tier = available[0]["id"]

    signature = await solana_wallet.send_payment(treasury, lamports_per_unit)
    result = await fundraising_client.donate(slug, chosen_tier, signature)
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


DISPATCH = {
    "get_rwa_assets": get_rwa_assets,
    "get_risk_score": get_risk_score,
    "get_wallet_balance": get_wallet_balance,
    "buy_rwa": buy_rwa,
}
