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


async def buy_shares(slug: str, amount: int, tx_signature: str, amount_lamports: int) -> dict:
    async with await _client() as client:
        resp = await client.post(
            f"/campaigns/{slug}/buy-shares",
            json={
                "amount": amount,
                "txSignature": tx_signature,
                "amountLamports": amount_lamports,
            },
        )
        if resp.status_code >= 400:
            raise FundraisingApiError(resp.json().get("detail", resp.text))
        return resp.json()


async def donate(slug: str, tier_id: str, tx_signature: str, backer_name: str = "RWA Agent") -> dict:
    async with await _client() as client:
        resp = await client.post(
            f"/campaigns/{slug}/donate",
            json={
                "tierId": tier_id,
                "backerName": backer_name,
                "message": "AI Agent 自動化買入",
                "txSignature": tx_signature,
            },
        )
        if resp.status_code >= 400:
            raise FundraisingApiError(resp.json().get("detail", resp.text))
        return resp.json()
