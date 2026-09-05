"""FastAPI app serving RWA campaign data as JSON to the fundraising-frontend
(Next.js) and the separate wallet-connect frontend.

This is a mock data layer — see app/store.py. It does not call the
contractTest smart contracts or any wallet/chain; investment-model
campaigns just mirror that contract's field shapes.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import store
from app.models import (
    ActionResult,
    BuySharesRequest,
    Campaign,
    ConfigResponse,
    CreateCampaignRequest,
    DonateRequest,
    Donation,
    InvestorPosition,
    OnChainTransaction,
    SetStatusRequest,
)

app = FastAPI(title="Fundraising API", version="0.1.0")

# Local hackathon demo: allow any origin so the wallet frontend (unknown
# port/host) can call this too. Tighten via CORS_ALLOW_ORIGINS before any
# real deployment.
_allow_origins = os.environ.get("CORS_ALLOW_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_origins == "*" else _allow_origins.split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/config", response_model=ConfigResponse)
def get_config() -> ConfigResponse:
    return ConfigResponse(
        solanaTreasuryAddress=store.SOLANA_TREASURY_ADDRESS,
        solanaCluster=store.SOLANA_CLUSTER,
        lamportsPerShareUnit=store.LAMPORTS_PER_SHARE_UNIT,
    )


@app.get("/campaigns", response_model=list[Campaign])
def list_campaigns() -> list[Campaign]:
    return store.list_campaigns()


@app.get("/campaigns/{slug}", response_model=Campaign)
def get_campaign(slug: str) -> Campaign:
    try:
        return store.get_campaign_by_slug(slug)
    except store.CampaignNotFoundError:
        raise HTTPException(status_code=404, detail="找不到這個募資專案。")


@app.get("/campaigns/{slug}/donations", response_model=list[Donation])
def get_donations(slug: str) -> list[Donation]:
    campaign = _require_campaign(slug)
    return store.get_donations_for_campaign(campaign.id)


@app.get("/campaigns/{slug}/position", response_model=InvestorPosition)
def get_position(slug: str) -> InvestorPosition:
    campaign = _require_campaign(slug)
    return store.get_investor_position(campaign.id)


@app.get("/campaigns/{slug}/transactions", response_model=list[OnChainTransaction])
def get_transactions(slug: str) -> list[OnChainTransaction]:
    campaign = _require_campaign(slug)
    return store.get_onchain_transactions(campaign.id)


@app.post("/campaigns/{slug}/donate", response_model=ActionResult)
def donate(slug: str, body: DonateRequest) -> ActionResult:
    campaign = _require_campaign(slug)
    try:
        store.add_donation(
            campaign.id, body.tierId, body.backerName, body.message, body.txSignature
        )
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message="感謝你的支持！這個 RWA Token 已經是你的了。")


@app.post("/campaigns/{slug}/buy-shares", response_model=ActionResult)
def buy_shares(slug: str, body: BuySharesRequest) -> ActionResult:
    campaign = _require_campaign(slug)
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="請輸入大於 0 的購買股數。")
    try:
        store.buy_shares(campaign.id, body.amount, body.txSignature, body.amountLamports)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message=f"已成功購買 {body.amount} 份 RWA Token。")


@app.post("/campaigns/{slug}/claim-reward", response_model=ActionResult)
def claim_reward(slug: str) -> ActionResult:
    campaign = _require_campaign(slug)
    try:
        amount = store.claim_investment_reward(campaign.id)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message=f"已領取分紅 {amount:,.0f} TWDT。", amount=amount)


@app.post("/campaigns/{slug}/settle", response_model=ActionResult)
def settle(slug: str) -> ActionResult:
    campaign = _require_campaign(slug)
    try:
        store.run_annual_settlement(campaign.id)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message="年度結算已完成，分紅已計入你的待領餘額。")


@app.post("/campaigns/{slug}/buyback", response_model=ActionResult)
def buyback(slug: str) -> ActionResult:
    campaign = _require_campaign(slug)
    try:
        store.farmer_buy_back_all(campaign.id)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message="農夫已買回全部股份，買回款已計入你的待領餘額。")


@app.post("/campaigns/{slug}/status", response_model=ActionResult)
def set_status(slug: str, body: SetStatusRequest) -> ActionResult:
    campaign = _require_campaign(slug)
    store.set_investment_status(campaign.id, body.status)
    return ActionResult(message="專案狀態已更新。")


@app.post("/campaigns", response_model=Campaign)
def create_campaign(body: CreateCampaignRequest) -> Campaign:
    if len(body.title) < 4:
        raise HTTPException(status_code=400, detail="專案標題至少需要 4 個字。")
    if len(body.summary) < 10:
        raise HTTPException(status_code=400, detail="請寫一段至少 10 個字的專案簡介。")
    if len(body.story) < 30:
        raise HTTPException(
            status_code=400, detail="請寫一段至少 30 個字的詳細說明，讓贊助者了解為什麼值得支持。"
        )
    if not body.creatorName:
        raise HTTPException(status_code=400, detail="請填寫發起人或團隊名稱。")
    if not body.location:
        raise HTTPException(status_code=400, detail="請填寫執行地點。")
    if not (7 <= body.durationDays <= 90):
        raise HTTPException(status_code=400, detail="募資天數請設定在 7 到 90 天之間。")
    if not body.rewardTiers:
        raise HTTPException(status_code=400, detail="請至少新增一個 RWA Token 回饋方案。")
    for t in body.rewardTiers:
        if len(t.title.strip()) < 2:
            raise HTTPException(status_code=400, detail="每個方案都需要名稱。")
        if t.price < 1:
            raise HTTPException(status_code=400, detail="每個方案的金額需大於 0。")
        if t.totalSupply < 1:
            raise HTTPException(status_code=400, detail="每個方案的 Token 發行量需大於 0。")

    return store.create_campaign(
        title=body.title,
        summary=body.summary,
        story=body.story,
        category=body.category,
        creatorName=body.creatorName,
        location=body.location,
        durationDays=body.durationDays,
        rewardTiers=body.rewardTiers,
    )


def _require_campaign(slug: str) -> Campaign:
    try:
        return store.get_campaign_by_slug(slug)
    except store.CampaignNotFoundError:
        raise HTTPException(status_code=404, detail="找不到這個募資專案。")
