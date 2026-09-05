"""In-memory data store — a direct port of fundraising-frontend/lib/campaigns.ts.

Resets whenever the process restarts. This mirrors the shape of
contractTest/contracts/SafeHarvestNFT.sol for investment-model campaigns,
but does not call that contract or any chain/wallet — it's a mock.
"""

from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models import (
    Campaign,
    Donation,
    InvestmentTerms,
    InvestorPosition,
    OnChainTransaction,
    RewardTier,
    RewardTierInput,
)

_now = datetime.now(timezone.utc)

# Devnet-only demo treasury — see fundraising-api/.devnet-keys/treasury.json
# (gitignored; regenerate with `solana-keygen new` and override via env if needed).
SOLANA_TREASURY_ADDRESS = os.environ.get(
    "SOLANA_TREASURY_ADDRESS", "9jH94MJzG2HPmDhvra5xwD2Ens6QNtQtvJ21m4pVpQxw"
)
SOLANA_CLUSTER = os.environ.get("SOLANA_CLUSTER", "devnet")
# Demo-only fixed rate: 1 share/reward unit == 0.001 SOL, regardless of its
# TWDT-denominated price — this is a stand-in payment amount, not a real
# TWDT/SOL conversion.
LAMPORTS_PER_SHARE_UNIT = 1_000_000

onchain_transactions: list[OnChainTransaction] = []
_next_tx_seq = 1


def _days(n: float) -> str:
    return (_now + timedelta(days=n)).isoformat()


def _past(n: float) -> str:
    return (_now - timedelta(days=n)).isoformat()


class CampaignNotFoundError(Exception):
    pass


class ActionError(Exception):
    """A user-facing validation/state error (mirrors the TS Error(message) pattern)."""


campaigns: list[Campaign] = []
donations: list[Donation] = []
investor_positions: list[InvestorPosition] = []

_next_campaign_seq = 1
_next_donation_seq = 1


def _sum_tiers(tiers: list[RewardTier]) -> float:
    return sum(t.price * t.claimed for t in tiers)


def _sum_backers(tiers: list[RewardTier]) -> int:
    return sum(t.claimed for t in tiers)


def _seed_campaign(
    *,
    id: str,
    slug: str,
    title: str,
    summary: str,
    story: str,
    category: str,
    creatorName: str,
    location: str,
    coverGradient: str,
    coverImage: Optional[str],
    createdAt: str,
    deadline: str,
    rewardTiers: Optional[list[RewardTier]] = None,
    goalAmount: Optional[float] = None,
    investment: Optional[InvestmentTerms] = None,
) -> None:
    tiers = rewardTiers or []
    funding_model = "investment" if investment else "reward"

    if investment:
        raised = investment.mintedShares * investment.sharePrice
        backers = investment.holderCount
        goal = investment.totalShares * investment.sharePrice
    else:
        raised = _sum_tiers(tiers)
        backers = _sum_backers(tiers)
        goal = goalAmount or 0

    campaigns.append(
        Campaign(
            id=id,
            slug=slug,
            title=title,
            summary=summary,
            story=story,
            category=category,
            creatorName=creatorName,
            location=location,
            coverGradient=coverGradient,
            coverImage=coverImage,
            createdAt=createdAt,
            deadline=deadline,
            fundingModel=funding_model,
            rewardTiers=tiers,
            investment=investment,
            raisedAmount=raised,
            backerCount=backers,
            goalAmount=goal,
        )
    )


def _seed() -> None:
    _seed_campaign(
        id="c1",
        slug="friendly-citrus-orchard-transition",
        title="老欉柑橘園轉型友善耕作 RWA 資金募集",
        summary="雲林三代柑橘園希望轉型無農藥友善耕作，透過 RWA Token 讓支持者直接持有產出分潤股份，取代看天吃飯的慣行貸款。",
        story=(
            "這片柑橘園已經慣行耕作三十年，這一季我們決定全面轉型友善農法，但轉型期間產量會下降、也還沒有機構願意用合理利率貸款給我們。"
            "我們仿照 SafeHarvestNFT 合約的機制，把果園發行成 300 份 RWA Token：每份代表一股未來三年的產出分潤權益，"
            "年度結算後依投資人分潤比例發放分紅；若日後我們現金充裕，也可以依合約價格買回全部股份。"
            "資金將用於有機資材、蟲害防治設備與轉型期間的人力成本，每年結算報告會公開在專案頁面。"
        ),
        category="agriculture",
        creatorName="崙背果農合作社",
        location="雲林縣",
        coverGradient="from-stone-300 via-orange-100 to-white",
        coverImage="https://images.unsplash.com/photo-1713313998828-bf3c164e43aa?auto=format&fit=crop&w=1200&q=80",
        createdAt=_past(18),
        deadline=_days(24),
        investment=InvestmentTerms(
            farmerName="崙背果農合作社",
            totalShares=300,
            mintedShares=214,
            sharePrice=3_000,
            buildCost=900_000,
            annualIncome=220_000,
            investorSharePercent=50,
            interestRate=10,
            premiumRate=5,
            status=1,
            currentYear=0,
            cumulativePrincipal=0,
            remainingPrincipal=900_000,
            buybackActive=False,
            buybackPrice=0,
            holderCount=178,
            tokenSymbol="RWA-CITRUS",
        ),
    )

    _seed_campaign(
        id="c2",
        slug="ai-support-copilot-rd-fund",
        title="AI 客服協作引擎：新創新業務研發資金",
        summary="B2B SaaS 團隊要開發 AI 客服協作新模組，透過 RWA Token 讓早期用戶與天使夥伴取得年度分潤股份，取代單靠創投的融資路徑。",
        story=(
            "我們現有的客服 SaaS 已服務 200 多家中小企業，這次要開發的 AI 協作模組能讓客服團隊與 AI 一起處理工單。"
            "與其只靠創投決定我們的命運，我們仿照 SafeHarvestNFT 合約機制發行 200 份 RWA Token，"
            "對應研發投入的股份與年度營收分潤權益；股份已經全數售出，第一次年度結算已經完成，早期支持者現在可以查看並領取分紅。"
            "資金 100% 投入工程團隊與 GPU 訓練成本。"
        ),
        category="startup",
        creatorName="迴響科技 Reson Labs",
        location="台北市",
        coverGradient="from-neutral-800 via-neutral-700 to-neutral-600",
        coverImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
        createdAt=_past(9),
        deadline=_days(40),
        investment=InvestmentTerms(
            farmerName="迴響科技 Reson Labs",
            totalShares=200,
            mintedShares=200,
            sharePrice=8_000,
            buildCost=1_600_000,
            annualIncome=500_000,
            investorSharePercent=60,
            interestRate=8,
            premiumRate=6,
            status=1,
            currentYear=1,
            cumulativePrincipal=300_000,
            remainingPrincipal=1_300_000,
            buybackActive=False,
            buybackPrice=1_696_000,
            holderCount=96,
            tokenSymbol="RWA-SAAS",
        ),
    )

    _seed_campaign(
        id="c3",
        slug="recycled-leather-tote-workshop",
        title="回收皮革手工托特包：城市通勤新選擇",
        summary="小型皮革工作室用回收皮料製作耐用托特包，量產前先用 RWA Token 驗證市場需求。",
        story=(
            "我們是一間三人皮革工作室，這款托特包用製鞋業剩料回收再製，耐用度經過一年反覆測試。"
            "量產需要一次採購整批五金與縫線，這次募資會用來支付材料、打樣與第一批量產工錢，達標後依方案交付對應的托特包或組合。"
        ),
        category="lifestyle",
        creatorName="皮寓工作室",
        location="台北市",
        coverGradient="from-stone-400 via-stone-300 to-stone-200",
        coverImage="https://images.unsplash.com/photo-1624687943971-e86af76d57de?auto=format&fit=crop&w=1200&q=80",
        goalAmount=420_000,
        createdAt=_past(5),
        deadline=_days(35),
        rewardTiers=[
            RewardTier(
                id="t1",
                tokenSymbol="RWA-BAG-01",
                title="手工托特包（單件）",
                price=3_200,
                description="回收皮革製，附贈防塵袋，共 3 色可選。",
                totalSupply=200,
                claimed=87,
                estimatedDelivery="2026 年 11 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-BAG-02",
                title="托特包 + 皮革保養組",
                price=4_200,
                description="托特包一件，加贈皮革保養油與拋光布。",
                totalSupply=120,
                claimed=41,
                estimatedDelivery="2026 年 11 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-BAG-03",
                title="托特包 + 小皮夾雙件組",
                price=5_600,
                description="托特包與同系列小皮夾各一件，色系可自由搭配。",
                totalSupply=80,
                claimed=19,
                estimatedDelivery="2026 年 12 月",
            ),
        ],
    )

    _seed_campaign(
        id="c4",
        slug="artisan-mid-autumn-mooncake-box",
        title="職人手作中秋月餅禮盒",
        summary="老字號餅舖推出低糖手作月餅禮盒，提前預購鎖定最新鮮的中秋好禮。",
        story=(
            "我們是開業超過三十年的家族餅舖，今年推出低糖版經典月餅禮盒，內餡使用天然食材、無額外防腐劑。"
            "募資所得將用於預先採購當季食材與包裝設計，並依人數提前規劃產能，確保中秋節前準時到貨。"
        ),
        category="food",
        creatorName="順興餅舖",
        location="台中市",
        coverGradient="from-amber-100 via-orange-50 to-white",
        coverImage="https://images.unsplash.com/photo-1512101638365-72010d90a610?auto=format&fit=crop&w=1200&q=80",
        goalAmount=300_000,
        createdAt=_past(3),
        deadline=_days(20),
        rewardTiers=[
            RewardTier(
                id="t1",
                tokenSymbol="RWA-MOONCAKE-6",
                title="經典 6 入禮盒",
                price=880,
                description="蛋黃酥、鳳梨酥、綠豆椪各二，低糖配方。",
                totalSupply=500,
                claimed=312,
                estimatedDelivery="中秋節前一週寄出",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-MOONCAKE-12",
                title="雙享 12 入禮盒",
                price=1_580,
                description="6 款口味各二入，適合送禮或家庭分享。",
                totalSupply=300,
                claimed=176,
                estimatedDelivery="中秋節前一週寄出",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-MOONCAKE-VIP",
                title="VIP 禮盒（12 入 + 手沖掛耳咖啡組）",
                price=2_280,
                description="12 入月餅禮盒，加贈本地烘豆掛耳咖啡 6 包。",
                totalSupply=150,
                claimed=58,
                estimatedDelivery="中秋節前一週寄出",
            ),
        ],
    )

    _seed_campaign(
        id="c5",
        slug="home-espresso-machine-launch",
        title="全自動義式咖啡機：小資族的第一台咖啡機",
        summary="台灣家電團隊研發平價全自動義式咖啡機，透過預購 RWA Token 決定首批量產規模。",
        story=(
            "市面上的全自動義式咖啡機大多要價上萬，我們的團隊用模組化設計把成本壓到三分之一，"
            "但仍保留研磨、萃取與奶泡一鍵完成的體驗。首批量產需要確認訂單數量才能跟工廠下單，"
            "募資所得將用於開模與首批生產，達標即依方案出貨。"
        ),
        category="tech",
        creatorName="沐豆家電",
        location="新竹市",
        coverGradient="from-neutral-300 via-neutral-200 to-neutral-100",
        coverImage="https://images.unsplash.com/photo-1583165278997-0250ea5d72e2?auto=format&fit=crop&w=1200&q=80",
        goalAmount=2_000_000,
        createdAt=_past(11),
        deadline=_days(28),
        rewardTiers=[
            RewardTier(
                id="t1",
                tokenSymbol="RWA-COFFEE-EARLY",
                title="早鳥全自動咖啡機",
                price=6_990,
                description="比預計上市售價省 3,000 元，含一年保固。",
                totalSupply=500,
                claimed=267,
                estimatedDelivery="2027 年 1 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-COFFEE-BUNDLE",
                title="咖啡機 + 精品豆一年份",
                price=8_990,
                description="咖啡機一台，加贈本地烘豆一年配送方案。",
                totalSupply=200,
                claimed=74,
                estimatedDelivery="2027 年 1 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-COFFEE-PRO",
                title="專業組（咖啡機 + 磨豆機）",
                price=12_990,
                description="咖啡機與專用磨豆機組合，適合小型店家或重度使用者。",
                totalSupply=100,
                claimed=21,
                estimatedDelivery="2027 年 2 月",
            ),
        ],
    )

    _seed_campaign(
        id="c6",
        slug="handmade-eyewear-new-frame-series",
        title="循環材質手工眼鏡：新鏡框系列上市",
        summary="獨立眼鏡品牌用回收醋酸纖維推出新鏡框系列，募資決定首批生產款式與數量。",
        story=(
            "這一季我們設計了 5 款新鏡框，材質使用可回收的醋酸纖維板材，並與在地眼鏡工廠合作手工製作。"
            "募資所得將用於開版與首批生產，你可以在方案中選擇單純鏡框或加購鏡片方案，達標後依訂單交付。"
        ),
        category="design",
        creatorName="見物眼鏡工作室",
        location="台南市",
        coverGradient="from-emerald-700 via-emerald-600 to-teal-500",
        coverImage="https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80",
        goalAmount=500_000,
        createdAt=_past(2),
        deadline=_days(32),
        rewardTiers=[
            RewardTier(
                id="t1",
                tokenSymbol="RWA-GLASSES-01",
                title="一副手工鏡框（不含鏡片）",
                price=2_980,
                description="5 款新品任選一款，可另至配鏡所裝配鏡片。",
                totalSupply=250,
                claimed=96,
                estimatedDelivery="2027 年 1 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-GLASSES-02",
                title="鏡框 + 抗藍光鏡片組",
                price=4_980,
                description="鏡框一副，加贈抗藍光平光鏡片與到府配鏡服務。",
                totalSupply=150,
                claimed=43,
                estimatedDelivery="2027 年 1 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-GLASSES-03",
                title="鏡框 + 鏡片 + 專屬鏡盒禮盒組",
                price=6_980,
                description="鏡框、抗藍光鏡片與限定款皮革鏡盒禮盒組。",
                totalSupply=80,
                claimed=12,
                estimatedDelivery="2027 年 2 月",
            ),
        ],
    )

    donations.append(
        Donation(
            id="d3",
            campaignId="c4",
            tierId="t1",
            backerName="林先生",
            amount=880,
            message="去年吃過真的很推薦，今年續訂！",
            createdAt=_past(1),
        )
    )

    investor_positions.append(
        InvestorPosition(campaignId="c1", shareCount=2, tokenIds=[213, 214], pendingRewards=0)
    )
    investor_positions.append(
        InvestorPosition(
            campaignId="c2", shareCount=5, tokenIds=[11, 12, 13, 14, 15], pendingRewards=7_500
        )
    )

    global _next_campaign_seq, _next_donation_seq
    _next_campaign_seq = len(campaigns) + 1
    _next_donation_seq = len(donations) + 1


_seed()


def reset_for_tests() -> None:
    """Clear and re-seed all in-memory state. Test-only helper."""
    campaigns.clear()
    donations.clear()
    investor_positions.clear()
    onchain_transactions.clear()
    _seed()


# ---- reads -----------------------------------------------------------------


def list_campaigns() -> list[Campaign]:
    return sorted(campaigns, key=lambda c: c.createdAt, reverse=True)


def get_campaign_by_slug(slug: str) -> Campaign:
    for c in campaigns:
        if c.slug == slug:
            return c
    raise CampaignNotFoundError(slug)


def get_donations_for_campaign(campaign_id: str) -> list[Donation]:
    return sorted(
        (d for d in donations if d.campaignId == campaign_id),
        key=lambda d: d.createdAt,
        reverse=True,
    )


def get_investor_position(campaign_id: str) -> InvestorPosition:
    for p in investor_positions:
        if p.campaignId == campaign_id:
            return p
    return InvestorPosition(campaignId=campaign_id, shareCount=0, tokenIds=[], pendingRewards=0)


def _ensure_position(campaign_id: str) -> InvestorPosition:
    for p in investor_positions:
        if p.campaignId == campaign_id:
            return p
    position = InvestorPosition(campaignId=campaign_id, shareCount=0, tokenIds=[], pendingRewards=0)
    investor_positions.append(position)
    return position


def _get_investment_campaign(campaign_id: str) -> Campaign:
    for c in campaigns:
        if c.id == campaign_id and c.investment:
            return c
    raise CampaignNotFoundError(campaign_id)


# ---- reward-tier mutations --------------------------------------------------


def add_donation(
    campaign_id: str,
    tier_id: str,
    backer_name: str,
    message: str,
    tx_signature: Optional[str] = None,
) -> Donation:
    global _next_donation_seq
    campaign = next((c for c in campaigns if c.id == campaign_id), None)
    if not campaign:
        raise CampaignNotFoundError(campaign_id)
    if campaign.fundingModel != "reward":
        raise ActionError("This campaign uses the investment model, not reward tiers")

    tier = next((t for t in campaign.rewardTiers if t.id == tier_id), None)
    if not tier:
        raise ActionError("Reward tier not found")
    if tier.claimed >= tier.totalSupply:
        raise ActionError("此方案的 RWA Token 已兌換完畢")

    donation = Donation(
        id=f"d{_next_donation_seq}",
        campaignId=campaign_id,
        tierId=tier_id,
        backerName=backer_name.strip() or "匿名贊助者",
        amount=tier.price,
        message=message.strip() or None,
        createdAt=datetime.now(timezone.utc).isoformat(),
        txSignature=tx_signature,
    )
    _next_donation_seq += 1

    donations.append(donation)
    tier.claimed += 1
    campaign.raisedAmount += tier.price
    campaign.backerCount += 1

    return donation


# ---- investment mutations ---------------------------------------------------


def buy_shares(
    campaign_id: str,
    amount: int,
    tx_signature: Optional[str] = None,
    amount_lamports: Optional[int] = None,
) -> None:
    global _next_tx_seq
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    if terms.status != 1:
        raise ActionError("專案目前非正常運作狀態，無法購買")
    if terms.mintedShares + amount > terms.totalShares:
        raise ActionError("超過剩餘可售股份數量")

    position = _ensure_position(campaign_id)
    was_new_holder = position.shareCount == 0

    for _ in range(amount):
        terms.mintedShares += 1
        position.tokenIds.append(terms.mintedShares)
    position.shareCount += amount
    campaign.raisedAmount += amount * terms.sharePrice

    if was_new_holder:
        terms.holderCount += 1
        campaign.backerCount += 1

    if tx_signature:
        onchain_transactions.append(
            OnChainTransaction(
                id=f"tx{_next_tx_seq}",
                campaignId=campaign_id,
                amountLamports=amount_lamports or amount * LAMPORTS_PER_SHARE_UNIT,
                shares=amount,
                txSignature=tx_signature,
                createdAt=datetime.now(timezone.utc).isoformat(),
            )
        )
        _next_tx_seq += 1


def get_onchain_transactions(campaign_id: str) -> list[OnChainTransaction]:
    return sorted(
        (t for t in onchain_transactions if t.campaignId == campaign_id),
        key=lambda t: t.createdAt,
        reverse=True,
    )


def run_annual_settlement(campaign_id: str) -> None:
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    if terms.status != 1:
        raise ActionError("專案目前非正常運作狀態，無法結算")
    if terms.mintedShares != terms.totalShares:
        raise ActionError("尚未售罄，無法執行年度結算")

    terms.currentYear += 1
    investor_income = (terms.annualIncome * terms.investorSharePercent) / 100
    terms.cumulativePrincipal = min(terms.cumulativePrincipal + investor_income, terms.buildCost)
    terms.remainingPrincipal = terms.buildCost - terms.cumulativePrincipal
    terms.buybackPrice = (terms.buildCost * (100 + terms.premiumRate)) / 100

    reward_per_share = investor_income / terms.totalShares
    position = _ensure_position(campaign_id)
    position.pendingRewards += reward_per_share * position.shareCount


def farmer_buy_back_all(campaign_id: str) -> None:
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    if terms.mintedShares != terms.totalShares:
        raise ActionError("尚未售罄，無法執行買回")
    if terms.status != 1:
        raise ActionError("專案狀態不允許買回")
    if terms.buybackPrice <= 0:
        raise ActionError("尚未計算買回價格，請先執行年度結算")

    per_share = terms.buybackPrice / terms.totalShares
    position = _ensure_position(campaign_id)
    position.pendingRewards += per_share * position.shareCount

    terms.buybackActive = True
    terms.status = 2


def claim_investment_reward(campaign_id: str) -> float:
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    if terms.status == 3:
        raise ActionError("專案已全面停止，無法提領")

    position = _ensure_position(campaign_id)
    amount = position.pendingRewards
    if amount <= 0:
        raise ActionError("目前沒有可領取的分紅")

    position.pendingRewards = 0
    if terms.buybackActive:
        position.shareCount = 0
        position.tokenIds = []

    return amount


def set_investment_status(campaign_id: str, status: int) -> None:
    campaign = _get_investment_campaign(campaign_id)
    assert campaign.investment is not None
    campaign.investment.status = status  # type: ignore[assignment]


# ---- campaign creation -------------------------------------------------------

_GRADIENTS = [
    "from-emerald-700 via-emerald-600 to-teal-500",
    "from-neutral-800 via-neutral-700 to-neutral-600",
    "from-stone-300 via-orange-100 to-white",
    "from-emerald-100 via-green-50 to-white",
    "from-neutral-300 via-neutral-200 to-neutral-100",
    "from-stone-400 via-stone-300 to-stone-200",
]


def _slugify(title: str, existing: list[str]) -> str:
    normalized = unicodedata.normalize("NFKD", title.strip().lower())
    base = re.sub(r"[^\w]+", "-", normalized, flags=re.UNICODE).strip("-") or "campaign"

    candidate = base
    suffix = 1
    while candidate in existing:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def create_campaign(
    *,
    title: str,
    summary: str,
    story: str,
    category: str,
    creatorName: str,
    location: str,
    durationDays: int,
    rewardTiers: list[RewardTierInput],
) -> Campaign:
    global _next_campaign_seq

    slug = _slugify(title, [c.slug for c in campaigns])
    tiers: list[RewardTier] = []
    for index, t in enumerate(rewardTiers):
        symbol_seed = re.sub(r"[^A-Za-z0-9]", "X", title[:3].upper()) or "RWA"
        tiers.append(
            RewardTier(
                id=f"t{index + 1}",
                tokenSymbol=f"RWA-{symbol_seed}-{index + 1}",
                title=t.title,
                price=t.price,
                description=t.description,
                totalSupply=t.totalSupply,
                claimed=0,
                estimatedDelivery="上架方公告後通知",
            )
        )

    campaign = Campaign(
        id=f"c{_next_campaign_seq}",
        slug=slug,
        title=title,
        summary=summary,
        story=story,
        category=category,
        creatorName=creatorName,
        location=location,
        coverGradient=_GRADIENTS[len(campaigns) % len(_GRADIENTS)],
        coverImage=None,
        goalAmount=sum(t.price * t.totalSupply for t in tiers),
        raisedAmount=0,
        backerCount=0,
        createdAt=datetime.now(timezone.utc).isoformat(),
        deadline=_days(durationDays),
        fundingModel="reward",
        rewardTiers=tiers,
        investment=None,
    )
    _next_campaign_seq += 1

    campaigns.append(campaign)
    return campaign
