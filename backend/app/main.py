"""FastAPI app serving RWA campaign data as JSON to the frontend
(Next.js) and the separate wallet-connect frontend.

This is a mock data layer — see app/store.py. It does not call the
contractTest smart contracts or any wallet/chain; investment-model
campaigns just mirror that contract's field shapes.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import chain_verify, store, treasury_wallet
from app.models import (
    ActionResult,
    BuySharesRequest,
    Campaign,
    ConfigResponse,
    CreateCampaignRequest,
    DepositRequest,
    DepositResult,
    DonateRequest,
    Donation,
    InvestorPosition,
    OnChainTransaction,
    SellRequest,
    SellResult,
    WalletBalanceResponse,
    WalletDepositRecord,
    WalletDonationRecord,
    WalletHistoryResponse,
    WalletInvestmentRecord,
    WalletRedemptionRecord,
)

app = FastAPI(title="Fundraising API", version="0.1.0")

# Local hackathon demo: allow any origin so the wallet frontend (unknown
# port/host) can call this too. Tighten via CORS_ALLOW_ORIGINS before any
# real deployment.
#
# allow_private_network is required because the browser loads
# fundraising-frontend over the public HTTPS tunnel, then calls this service
# on a private/loopback address (127.0.0.1:8000) for the client-side payment
# flow -- Chrome's Private Network Access preflight blocks that by default
# ("Disallowed CORS private-network"), which surfaces to users as a plain
# "Failed to fetch" with no other clue.
_allow_origins = os.environ.get("CORS_ALLOW_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_origins == "*" else _allow_origins.split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
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
        raise HTTPException(status_code=404, detail="找不到這個投資標的。")


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


@app.get("/wallets/{address}/history", response_model=WalletHistoryResponse)
def get_wallet_history(address: str) -> WalletHistoryResponse:
    """Every donation/investment purchase a wallet address paid for, across all
    campaigns -- keyed by the walletAddress reported alongside each payment's
    txSignature, not by any account/session (there isn't one in this demo)."""
    donations, transactions, wallet_redemptions, wallet_deposits = store.get_wallet_history(address)
    campaigns_by_id = {c.id: c for c in store.list_campaigns()}

    return WalletHistoryResponse(
        walletAddress=address,
        donations=[
            WalletDonationRecord(
                campaignSlug=campaigns_by_id[d.campaignId].slug,
                campaignTitle=campaigns_by_id[d.campaignId].title,
                tierId=d.tierId,
                amount=d.amount,
                message=d.message,
                createdAt=d.createdAt,
                txSignature=d.txSignature,
            )
            for d in donations
            if d.campaignId in campaigns_by_id
        ],
        investments=[
            WalletInvestmentRecord(
                campaignSlug=campaigns_by_id[t.campaignId].slug,
                campaignTitle=campaigns_by_id[t.campaignId].title,
                amountLamports=t.amountLamports,
                shares=t.shares,
                txSignature=t.txSignature,
                createdAt=t.createdAt,
            )
            for t in transactions
            if t.campaignId in campaigns_by_id
        ],
        redemptions=[
            WalletRedemptionRecord(
                campaignSlug=campaigns_by_id[r.campaignId].slug,
                campaignTitle=campaigns_by_id[r.campaignId].title,
                amountLamports=r.amountLamports,
                shares=r.shares,
                tierId=r.tierId,
                txSignature=r.txSignature,
                createdAt=r.createdAt,
            )
            for r in wallet_redemptions
            if r.campaignId in campaigns_by_id
        ],
        deposits=[
            WalletDepositRecord(
                amountLamports=d.amountLamports,
                txSignature=d.txSignature,
                createdAt=d.createdAt,
            )
            for d in wallet_deposits
        ],
        availableLamports=store.get_ledger_balance(address),
    )


@app.post("/wallets/{address}/deposit", response_model=DepositResult)
async def deposit(address: str, body: DepositRequest) -> DepositResult:
    """Reports an already-completed real devnet payment from `address` to the
    AI agent's wallet, crediting `address`'s custodial ledger balance -- see
    the "custodial ledger" section in app/store.py. Unlike buy-shares/donate
    (whose recorded purchase is inert on its own), a credited ledger balance
    can later leave the pool for real via a via_ledger-funded buy plus a
    non-viaLedger sell, so txSignature is verified on-chain here, not just
    trusted -- see app/chain_verify.py."""
    if body.amountLamports <= 0:
        raise HTTPException(status_code=400, detail="請輸入大於 0 的儲值金額。")
    try:
        await chain_verify.verify_spent_at_least(body.txSignature, address, body.amountLamports)
    except chain_verify.TransferVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        balance = store.record_deposit(address, body.amountLamports, body.txSignature)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return DepositResult(message=f"已儲值 {body.amountLamports} lamports。", availableLamports=balance)


@app.get("/wallets/{address}/balance", response_model=WalletBalanceResponse)
def wallet_balance(address: str) -> WalletBalanceResponse:
    return WalletBalanceResponse(walletAddress=address, availableLamports=store.get_ledger_balance(address))


async def _verify_payment_if_redeemable(
    tx_signature: str | None, wallet_address: str | None, min_lamports: int
) -> None:
    """Verifies tx_signature really moved at least min_lamports out of
    wallet_address on-chain, when both are given -- see
    app/chain_verify.py. A record made with only one of the two (or
    neither) can never be matched by get_wallet_shares_held or
    preview_redeem_donation's wallet_address filter, so it can never be
    redeemed later either -- nothing to verify in that case."""
    if not tx_signature or not wallet_address:
        return
    try:
        await chain_verify.verify_spent_at_least(tx_signature, wallet_address, min_lamports)
    except chain_verify.TransferVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/campaigns/{slug}/donate", response_model=ActionResult)
async def donate(slug: str, body: DonateRequest) -> ActionResult:
    campaign = _require_campaign(slug)
    await _verify_payment_if_redeemable(body.txSignature, body.walletAddress, store.LAMPORTS_PER_SHARE_UNIT)
    try:
        store.add_donation(
            campaign.id,
            body.tierId,
            body.backerName,
            body.message,
            body.txSignature,
            body.walletAddress,
            body.viaLedger,
        )
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message="認購完成，RWA Token 已記錄至你的投資部位。")


@app.post("/campaigns/{slug}/buy-shares", response_model=ActionResult)
async def buy_shares(slug: str, body: BuySharesRequest) -> ActionResult:
    campaign = _require_campaign(slug)
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="請輸入大於 0 的購買股數。")
    min_lamports = body.amountLamports or body.amount * store.LAMPORTS_PER_SHARE_UNIT
    await _verify_payment_if_redeemable(body.txSignature, body.walletAddress, min_lamports)
    try:
        store.buy_shares(
            campaign.id,
            body.amount,
            body.txSignature,
            body.amountLamports,
            body.walletAddress,
            body.viaLedger,
        )
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message=f"已成功購買 {body.amount} 份 RWA Token。")


@app.post("/campaigns/{slug}/sell", response_model=SellResult)
async def sell(slug: str, body: SellRequest) -> SellResult:
    """Sell shares back (investment campaigns) or cancel a pledge (reward
    campaigns) at the same demo unit price it was bought at. No secondary
    market/live price feed exists yet, so this is a treasury buyback, not a
    market trade -- see app/store.py's sell/redeem section.

    Normally the treasury wallet, not the caller, signs and sends the
    refund, since only the treasury keypair here can move funds back out of
    it; that's why this validates first, pays out, and only then mutates
    campaign state -- a failed on-chain payment must never look like a
    completed sale. A viaLedger sell skips the on-chain payment entirely and
    credits walletAddress's custodial ledger balance instead, since that
    holding was funded from the ledger rather than a real payment from
    walletAddress in the first place (see app/store.py's custodial-ledger
    section).
    """
    campaign = _require_campaign(slug)
    if not body.walletAddress:
        raise HTTPException(status_code=400, detail="請提供賣出的錢包地址。")

    try:
        if campaign.fundingModel == "investment":
            if not body.amount or body.amount <= 0:
                raise HTTPException(status_code=400, detail="請輸入大於 0 的賣出股數。")
            lamports = store.preview_sell_shares(campaign.id, body.amount, body.walletAddress)
        else:
            if not body.tierId:
                raise HTTPException(status_code=400, detail="請提供要取消的方案 tierId。")
            donation, lamports = store.preview_redeem_donation(
                campaign.id, body.tierId, body.walletAddress
            )
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    signature: str | None
    if body.viaLedger:
        store.credit_ledger(body.walletAddress, lamports)
        signature = None
    else:
        try:
            signature = await treasury_wallet.send_payment(body.walletAddress, lamports)
        except treasury_wallet.InsufficientTreasuryFundsError as e:
            raise HTTPException(status_code=502, detail=str(e))

    refund_desc = f"已退回 {lamports} lamports 至你的可投資餘額" if body.viaLedger else f"退款 {lamports} lamports"

    if campaign.fundingModel == "investment":
        store.apply_sell_shares(campaign.id, body.amount)
        store.record_redemption(campaign.id, lamports, body.amount, None, signature, body.walletAddress)
        message = f"已賣出 {body.amount} 份 RWA Token，{refund_desc}。"
    else:
        store.apply_redeem_donation(donation, campaign.id, body.tierId)
        store.record_redemption(campaign.id, lamports, 0, body.tierId, signature, body.walletAddress)
        message = f"已取消此方案認購，{refund_desc}。"

    return SellResult(message=message, amountLamports=lamports, txSignature=signature)


@app.post("/campaigns/{slug}/claim-reward", response_model=ActionResult)
def claim_reward(slug: str) -> ActionResult:
    campaign = _require_campaign(slug)
    try:
        amount = store.claim_investment_reward(campaign.id)
    except store.ActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ActionResult(message=f"已領取分紅 {amount:,.0f} TWDT。", amount=amount)


@app.post("/campaigns", response_model=Campaign)
def create_campaign(body: CreateCampaignRequest) -> Campaign:
    if len(body.title) < 4:
        raise HTTPException(status_code=400, detail="專案標題至少需要 4 個字。")
    if len(body.summary) < 10:
        raise HTTPException(status_code=400, detail="請寫一段至少 10 個字的專案簡介。")
    if len(body.story) < 30:
        raise HTTPException(
            status_code=400, detail="請寫一段至少 30 個字的發行說明，揭露資金用途與主要風險。"
        )
    if not body.creatorName:
        raise HTTPException(status_code=400, detail="請填寫發起人或團隊名稱。")
    if not body.location:
        raise HTTPException(status_code=400, detail="請填寫執行地點。")
    if not (7 <= body.durationDays <= 90):
        raise HTTPException(status_code=400, detail="認購期間請設定在 7 到 90 天之間。")
    if not body.rewardTiers:
        raise HTTPException(status_code=400, detail="請至少新增一個 RWA Token 債權認購級距。")
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
        raise HTTPException(status_code=404, detail="找不到這個投資標的。")
