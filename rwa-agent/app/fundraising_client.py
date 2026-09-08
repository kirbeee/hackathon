"""Thin async HTTP client for fundraising-api — the single data/action seam
shared with fundraising-frontend and the wallet-connect frontend."""

from __future__ import annotations

import httpx

from app.settings import settings


class FundraisingApiError(RuntimeError):
    pass


async def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=settings.fundraising_api_url, timeout=10.0)


async def list_campaigns() -> list[dict]:
    async with await _client() as client:
        resp = await client.get("/campaigns")
        resp.raise_for_status()
        return resp.json()


async def get_campaign(slug: str) -> dict:
    async with await _client() as client:
        resp = await client.get(f"/campaigns/{slug}")
        resp.raise_for_status()
        return resp.json()


async def get_config() -> dict:
    async with await _client() as client:
        resp = await client.get("/config")
        resp.raise_for_status()
        return resp.json()


async def buy_shares(
    slug: str,
    amount: int,
    tx_signature: str,
    amount_lamports: int,
    wallet_address: str,
    via_ledger: bool = False,
) -> dict:
    async with await _client() as client:
        resp = await client.post(
            f"/campaigns/{slug}/buy-shares",
            json={
                "amount": amount,
                "txSignature": tx_signature,
                "amountLamports": amount_lamports,
                "walletAddress": wallet_address,
                "viaLedger": via_ledger,
            },
        )
        if resp.status_code >= 400:
            raise FundraisingApiError(resp.json().get("detail", resp.text))
        return resp.json()


async def donate(
    slug: str,
    tier_id: str,
    tx_signature: str,
    wallet_address: str,
    backer_name: str = "RWA Agent",
    via_ledger: bool = False,
) -> dict:
    async with await _client() as client:
        resp = await client.post(
            f"/campaigns/{slug}/donate",
            json={
                "tierId": tier_id,
                "backerName": backer_name,
                "message": "AI Agent 自動化買入",
                "txSignature": tx_signature,
                "walletAddress": wallet_address,
                "viaLedger": via_ledger,
            },
        )
        if resp.status_code >= 400:
            raise FundraisingApiError(resp.json().get("detail", resp.text))
        return resp.json()


async def get_wallet_history(wallet_address: str) -> dict:
    async with await _client() as client:
        resp = await client.get(f"/wallets/{wallet_address}/history")
        resp.raise_for_status()
        return resp.json()


async def get_ledger_balance(wallet_address: str) -> dict:
    """The custodial ledger balance a human wallet has deposited into the
    agent's pooled wallet but not yet spent -- see backend's
    app/store.py custodial-ledger section."""
    async with await _client() as client:
        resp = await client.get(f"/wallets/{wallet_address}/balance")
        resp.raise_for_status()
        return resp.json()


async def sell(
    slug: str,
    wallet_address: str,
    amount: int | None = None,
    tier_id: str | None = None,
    via_ledger: bool = False,
) -> dict:
    """Sell shares back (investment campaigns) or cancel a pledge (reward
    campaigns). Normally backend's treasury wallet signs and sends the devnet
    refund, so unlike buy_shares/donate there's no tx_signature to pass in
    here; a via_ledger sell skips the on-chain refund and credits
    wallet_address's ledger balance instead."""
    async with await _client() as client:
        resp = await client.post(
            f"/campaigns/{slug}/sell",
            json={
                "amount": amount,
                "tierId": tier_id,
                "walletAddress": wallet_address,
                "viaLedger": via_ledger,
            },
        )
        if resp.status_code >= 400:
            raise FundraisingApiError(resp.json().get("detail", resp.text))
        return resp.json()
