"""In-memory data store — a direct port of fundraising-frontend/lib/campaigns.ts.

Resets whenever the process restarts. This mirrors the shape of
contractTest/contracts/SafeHarvestNFT.sol for investment-model campaigns,
but does not call that contract or any chain/wallet — it's a mock.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models import (
    Campaign,
    Donation,
    InvestmentTerms,
    InvestorPosition,
    OnChainDeposit,
    OnChainRedemption,
    OnChainTransaction,
    RewardTier,
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
# Shared demo denomination: 1 USDC = 30 TWD = 1 RWA token.
DEMO_RWA_PRICE_TWD = 30

onchain_transactions: list[OnChainTransaction] = []
redemptions: list[OnChainRedemption] = []
deposits: list[OnChainDeposit] = []
# Custodial ledger: cash a wallet has deposited into the AI agent's pooled
# wallet but not yet spent -- see the "custodial ledger" section below.
wallet_ledger_balances: dict[str, int] = {}
# A verified txSignature can only ever back one buy/donate/deposit record --
# without this, the same real payment could be replayed into unlimited
# recorded purchases/deposits. See claim_tx_signature() and
# app/chain_verify.py.
_used_tx_signatures: set[str] = set()
_next_tx_seq = 1
_next_redemption_seq = 1
_next_deposit_seq = 1


def _days(n: float) -> str:
    return (_now + timedelta(days=n)).isoformat()


def _past(n: float) -> str:
    return (_now - timedelta(days=n)).isoformat()


class CampaignNotFoundError(Exception):
    pass


class ActionError(Exception):
    """A user-facing validation/state error (mirrors the TS Error(message) pattern)."""


def claim_tx_signature(tx_signature: str) -> None:
    """Marks a verified txSignature as spent so it can't back more than one
    buy/donate/deposit record. Call this only after app.chain_verify has
    confirmed the signature is a real, sufficient on-chain payment -- this
    function itself only guards against replaying the same real payment."""
    if tx_signature in _used_tx_signatures:
        raise ActionError("這筆交易簽章已經被使用過，無法重複認列。")
    _used_tx_signatures.add(tx_signature)


campaigns: list[Campaign] = []
donations: list[Donation] = []
investor_positions: list[InvestorPosition] = []

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
    riskTier: str,
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
        scale = DEMO_RWA_PRICE_TWD / investment.sharePrice
        investment.sharePrice = DEMO_RWA_PRICE_TWD
        investment.buildCost *= scale
        investment.annualIncome *= scale
        investment.cumulativePrincipal *= scale
        investment.remainingPrincipal *= scale
        raised = investment.mintedShares * investment.sharePrice
        backers = investment.holderCount
        goal = investment.totalShares * investment.sharePrice
    else:
        for tier in tiers:
            tier.price = DEMO_RWA_PRICE_TWD
        raised = _sum_tiers(tiers)
        backers = _sum_backers(tiers)
        goal = sum(t.price * t.totalSupply for t in tiers)

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
            riskTier=riskTier,
        )
    )


def _seed() -> None:
    _seed_campaign(
        id="c1",
        slug="friendly-citrus-orchard-transition",
        title="老欉柑橘園轉型友善耕作 RWA 資金募集",
        summary="本案募集資金將用於柑橘園友善耕作轉型與生產設備升級，並將專案債權拆分為小額 RWA Token；本金與收益依發行條件，由果園營運收入辦理償付。",
        story=(
            "本案因果園由慣行耕作轉型為友善農法，需提前投入有機資材、蟲害防治設備及轉型期間的人力成本，因此產生中期營運資金需求。"
            "平台將該筆資金需求拆分為 300 份 RWA Token，每份代表本案約定債權的一部分經濟權益。投資人可查看持有單位、年度結算、待分配收益與剩餘本金；營運方亦可依合約條件辦理買回。"
            "本案主要償付來源為柑橘銷售及果園營運收入。投資人仍須留意產量、農產品價格、天然災害、轉型成效與營運管理等風險；Tokenization 不代表本金或收益受到保證。"
        ),
        category="agriculture",
        riskTier="supporter",
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
            holderCount=178,
            tokenSymbol="RWA-CITRUS",
        ),
    )

    _seed_campaign(
        id="c2",
        slug="ai-support-copilot-rd-fund",
        title="AI 客服協作引擎：新創新業務研發資金",
        summary="本案以 AI 客服模組研發所需資金為基礎，發行小額 RWA Token；募集資金投入工程團隊與運算資源，並由後續 SaaS 營運收入依發行條件償付。",
        story=(
            "本案由已服務 200 多家中小企業的 B2B SaaS 團隊提出，資金將用於 AI 客服協作模組的工程開發、測試驗證及 GPU 運算成本。"
            "研發資金需求被拆分為 200 份 RWA Token，每份代表本案約定債權的一部分經濟權益。目前開放認購中，募集完成後將依發行條件進行年度結算與收益分配。"
            "本案主要償付來源為既有 SaaS 訂閱與新模組商業化收入。投資人仍須留意研發延期、技術成果、市場需求、成本超支及新創公司信用等風險。"
        ),
        category="startup",
        riskTier="degen",
        creatorName="迴響科技 Reson Labs",
        location="台北市",
        coverGradient="from-neutral-800 via-neutral-700 to-neutral-600",
        coverImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
        createdAt=_past(9),
        deadline=_days(40),
        investment=InvestmentTerms(
            farmerName="迴響科技 Reson Labs",
            totalShares=200,
            mintedShares=150,
            sharePrice=8_000,
            buildCost=1_600_000,
            annualIncome=500_000,
            investorSharePercent=60,
            interestRate=8,
            premiumRate=6,
            status=1,
            currentYear=0,
            cumulativePrincipal=0,
            remainingPrincipal=1_600_000,
            holderCount=96,
            tokenSymbol="RWA-SAAS",
        ),
    )

    _seed_campaign(
        id="c3",
        slug="recycled-leather-tote-workshop",
        title="回收皮革手工托特包：城市通勤新選擇",
        summary="本案募集資金將用於回收皮革托特包的材料採購、生產與通路周轉，並將短期營運債權拆分為小額 RWA Token；償付來源以產品銷售回款為主。",
        story=(
            "本案由三人皮革工作室提出，因首批量產需提前支付回收皮料、五金、縫線、打樣及製作工資，形成短期營運資金缺口。"
            "平台將該筆資金需求拆分為小額 RWA Token，每份代表本案約定債權的一部分經濟權益。募集資金將依揭露用途投入生產及訂單履行，平台並持續記錄資金使用與回款進度。"
            "本案主要償付來源為托特包銷售收入。投資人仍須留意訂單取消、材料成本上升、生產延誤、庫存去化及銷售不如預期等風險。"
        ),
        category="lifestyle",
        riskTier="supporter",
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
                title="皮革量產債權｜小額認購",
                price=3_200,
                description="參與首批材料採購與製作周轉，償付來源為托特包銷售回款。",
                totalSupply=200,
                claimed=87,
                estimatedDelivery="2026 年 11 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-BAG-02",
                title="皮革量產債權｜標準認購",
                price=4_200,
                description="參與材料、五金與生產工資周轉，依專案條件辦理償付。",
                totalSupply=120,
                claimed=41,
                estimatedDelivery="2027 年 1 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-BAG-03",
                title="皮革量產債權｜進階認購",
                price=5_600,
                description="參與較高額度的首批量產資金，實際償付以銷售與回款結果為準。",
                totalSupply=80,
                claimed=19,
                estimatedDelivery="2027 年 1 月",
            ),
        ],
    )

    _seed_campaign(
        id="c4",
        slug="artisan-mid-autumn-mooncake-box",
        title="職人手作中秋月餅禮盒",
        summary="本案募集資金將用於中秋檔期的原料採購、生產與物流周轉，並將短期營運債權拆分為小額 RWA Token；本金與收益依發行條件，由節慶銷售收入辦理償付。",
        story=(
            "本案由經營超過三十年的家族餅舖提出。中秋節前需提前支付原料、包裝、生產及物流費用，但主要銷售收入須待出貨後才能陸續回收，因此形成季節性營運資金缺口。"
            "平台將該筆短期債權拆分為小額 RWA Token，每份代表本案約定債權的一部分經濟權益。募集資金將依揭露用途投入月餅生產與訂單履行，而非單純銷售商品兌換憑證。"
            "本案主要償付來源為中秋檔期的月餅銷售收入。投資人仍須留意銷量不如預期、原料成本、退貨、訂單取消及回款延遲等風險；Tokenization 不代表本金或收益受到保證。"
        ),
        category="food",
        riskTier="supporter",
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
                title="中秋營運債權｜小額認購",
                price=880,
                description="參與中秋檔期原料與包裝周轉，主要償付來源為節慶銷售收入。",
                totalSupply=500,
                claimed=312,
                estimatedDelivery="2026 年 10 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-MOONCAKE-12",
                title="中秋營運債權｜標準認購",
                price=1_580,
                description="參與原料採購、生產與物流周轉，依發行條件辦理到期償付。",
                totalSupply=300,
                claimed=176,
                estimatedDelivery="2026 年 10 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-MOONCAKE-VIP",
                title="中秋營運債權｜進階認購",
                price=2_280,
                description="參與較高額度的節慶營運資金，實際償付以銷售與回款結果為準。",
                totalSupply=150,
                claimed=58,
                estimatedDelivery="2026 年 10 月",
            ),
        ],
    )

    _seed_campaign(
        id="c5",
        slug="home-espresso-machine-launch",
        title="全自動義式咖啡機：小資族的第一台咖啡機",
        summary="本案募集資金將用於全自動咖啡機的開模、零組件採購與首批量產，並以小額 RWA Token 提供認購；償付來源以產品銷售及訂單回款為主。",
        story=(
            "本案由台灣家電團隊提出。咖啡機進入量產前需提前支付開模、零組件、測試及工廠生產成本，但銷售收入須待產品交付後才能回收，因此形成明確的資金週期。"
            "平台將首批量產所需資金拆分為小額 RWA Token，每份代表本案約定債權的一部分經濟權益。募集資金將依揭露用途投入量產，並持續揭露生產、交付及回款進度。"
            "本案主要償付來源為咖啡機銷售及訂單收入。投資人仍須留意量產延誤、零組件短缺、成本上升、產品需求變化及售後服務等風險。"
        ),
        category="tech",
        riskTier="supporter",
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
                title="咖啡機量產債權｜小額認購",
                price=6_990,
                description="參與開模與首批零組件採購，償付來源為咖啡機銷售回款。",
                totalSupply=500,
                claimed=267,
                estimatedDelivery="2027 年 3 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-COFFEE-BUNDLE",
                title="咖啡機量產債權｜標準認購",
                price=8_990,
                description="參與量產、測試與供應鏈周轉，依發行條件辦理到期償付。",
                totalSupply=200,
                claimed=74,
                estimatedDelivery="2027 年 3 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-COFFEE-PRO",
                title="咖啡機量產債權｜進階認購",
                price=12_990,
                description="參與較高額度的量產資金，實際償付以產品交付與銷售結果為準。",
                totalSupply=100,
                claimed=21,
                estimatedDelivery="2027 年 4 月",
            ),
        ],
    )

    _seed_campaign(
        id="c6",
        slug="handmade-eyewear-new-frame-series",
        title="循環材質手工眼鏡：新鏡框系列上市",
        summary="本案募集資金將用於循環材質鏡框的開版、材料採購與首批生產，並將營運債權拆分為小額 RWA Token；償付來源以產品銷售及通路回款為主。",
        story=(
            "本案由獨立眼鏡品牌提出，首批五款循環材質鏡框需提前投入開版、醋酸纖維板材、手工製作及通路成本，因此產生營運資金需求。"
            "平台將該筆資金需求拆分為小額 RWA Token，每份代表本案約定債權的一部分經濟權益。募集資金將依揭露用途投入生產與訂單履行，並記錄製作、交付及回款進度。"
            "本案主要償付來源為鏡框、鏡片組合及通路銷售收入。投資人仍須留意訂單取消、生產延誤、材料成本、庫存及市場需求等風險。"
        ),
        category="design",
        riskTier="supporter",
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
                title="循環鏡框債權｜小額認購",
                price=2_980,
                description="參與循環板材、開版與首批製作周轉，償付來源為鏡框銷售回款。",
                totalSupply=250,
                claimed=96,
                estimatedDelivery="2027 年 3 月",
            ),
            RewardTier(
                id="t2",
                tokenSymbol="RWA-GLASSES-02",
                title="循環鏡框債權｜標準認購",
                price=4_980,
                description="參與鏡框與鏡片組合的生產周轉，依發行條件辦理到期償付。",
                totalSupply=150,
                claimed=43,
                estimatedDelivery="2027 年 3 月",
            ),
            RewardTier(
                id="t3",
                tokenSymbol="RWA-GLASSES-03",
                title="循環鏡框債權｜進階認購",
                price=6_980,
                description="參與較高額度的首批生產資金，實際償付以訂單與通路回款為準。",
                totalSupply=80,
                claimed=12,
                estimatedDelivery="2027 年 4 月",
            ),
        ],
    )

    _seed_campaign(
        id="c7",
        slug="cathay-xinyi-office-rental-income-rwa",
        title="國泰信義區商辦收租 RWA：小額參與精華地段穩定配息",
        summary="本案由國泰地產／資管審核把關，將信義區商辦的租金收益權拆分為小額 RWA Token；償付來源為商辦長期租約收入，屬定期配息型基礎設施資產。",
        story=(
            "本案標的為國泰地產旗下位於台北市信義區的商辦大樓，已有多家長期承租戶，租約穩定、空置率低。"
            "平台將該棟商辦的租金收益權拆分為 1,000 份 RWA Token，每份代表一部分經濟權益，讓小資族也能以小額資金參與信義區精華地段的不動產收益，而不必整棟購置。"
            "本案由國泰地產與資產管理團隊審核把關，並負責招租與物業管理；每年依實際收租結果辦理配息結算。"
            "投資人仍須留意商辦出租率、續約條件、利率環境與不動產市場景氣等風險；Tokenization 不代表本金或收益受到保證，但相較新創與消費性商品債權，此類基礎設施資產現金流更為穩定、波動較低。"
        ),
        category="real-estate",
        riskTier="diversifier",
        creatorName="國泰地產｜資產管理",
        location="台北市信義區",
        coverGradient="from-emerald-100 via-green-50 to-white",
        coverImage="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        createdAt=_past(6),
        deadline=_days(45),
        investment=InvestmentTerms(
            farmerName="國泰地產｜資產管理",
            totalShares=1_000,
            mintedShares=940,
            sharePrice=5_000,
            buildCost=5_000_000,
            annualIncome=250_000,
            investorSharePercent=90,
            interestRate=5,
            premiumRate=2,
            status=1,
            currentYear=1,
            cumulativePrincipal=225_000,
            remainingPrincipal=4_775_000,
            holderCount=356,
            tokenSymbol="RWA-CATHAY-XINYI",
        ),
    )

    donations.append(
        Donation(
            id="d3",
            campaignId="c4",
            tierId="t1",
            backerName="林先生",
            amount=880,
            message="看好節慶訂單回款能力，先以小額單位參與。",
            createdAt=_past(1),
        )
    )

    investor_positions.append(
        InvestorPosition(campaignId="c1", shareCount=2, tokenIds=[213, 214], pendingRewards=0)
    )
    investor_positions.append(
        InvestorPosition(
            campaignId="c2", shareCount=5, tokenIds=[11, 12, 13, 14, 15], pendingRewards=0
        )
    )

    global _next_donation_seq
    _next_donation_seq = len(donations) + 1


_seed()


def reset_for_tests() -> None:
    """Clear and re-seed all in-memory state. Test-only helper."""
    campaigns.clear()
    donations.clear()
    investor_positions.clear()
    onchain_transactions.clear()
    redemptions.clear()
    deposits.clear()
    wallet_ledger_balances.clear()
    _used_tx_signatures.clear()
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
    wallet_address: Optional[str] = None,
    via_ledger: bool = False,
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
        raise ActionError("此債權方案的 RWA Token 已認購完畢")

    if via_ledger:
        if not wallet_address:
            raise ActionError("透過帳本認購需要提供 walletAddress")
        debit_ledger(wallet_address, LAMPORTS_PER_SHARE_UNIT)

    # Only a wallet+signature pair that's already been verified on-chain (by
    # the caller, in app/main.py, before reaching here) can ever be redeemed
    # later -- see preview_redeem_donation's `redeemable` filter. Claiming it
    # here (rather than in the caller) keeps the check-and-record atomic:
    # nothing else awaits between this and the donation being appended below.
    if tx_signature and wallet_address:
        claim_tx_signature(tx_signature)

    donation = Donation(
        id=f"d{_next_donation_seq}",
        campaignId=campaign_id,
        tierId=tier_id,
        backerName=backer_name.strip() or "匿名投資人",
        amount=tier.price,
        message=message.strip() or None,
        createdAt=datetime.now(timezone.utc).isoformat(),
        txSignature=tx_signature,
        walletAddress=wallet_address,
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
    wallet_address: Optional[str] = None,
    via_ledger: bool = False,
) -> None:
    global _next_tx_seq
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    if terms.status != 1:
        raise ActionError("專案目前非正常運作狀態，無法購買")
    if terms.mintedShares + amount > terms.totalShares:
        raise ActionError("超過剩餘可售股份數量")

    if via_ledger:
        if not wallet_address:
            raise ActionError("透過帳本購買需要提供 walletAddress")
        debit_ledger(wallet_address, amount_lamports or amount * LAMPORTS_PER_SHARE_UNIT)

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
        # Only a signature the caller has already verified on-chain (see
        # app/main.py) may back a record that get_wallet_shares_held (and
        # therefore a later sell payout) will ever count -- claiming it here
        # keeps that check-and-record atomic, same reasoning as add_donation.
        if wallet_address:
            claim_tx_signature(tx_signature)
        onchain_transactions.append(
            OnChainTransaction(
                id=f"tx{_next_tx_seq}",
                campaignId=campaign_id,
                amountLamports=amount_lamports or amount * LAMPORTS_PER_SHARE_UNIT,
                shares=amount,
                txSignature=tx_signature,
                createdAt=datetime.now(timezone.utc).isoformat(),
                walletAddress=wallet_address,
            )
        )
        _next_tx_seq += 1


# ---- custodial ledger --------------------------------------------------------
#
# The AI agent trades out of its own devnet wallet on behalf of whoever it's
# acting for, instead of each user signing their own on-chain payment -- so
# there has to be an off-chain record of how much of that pooled wallet's SOL
# actually belongs to which user. A wallet deposits real devnet SOL into the
# agent's wallet (record_deposit), the agent can only spend up to that
# wallet's balance on its behalf (debit_ledger, called from buy_shares/
# add_donation when via_ledger=True), and a viaLedger sell/redeem credits the
# refund straight back to the ledger (credit_ledger) instead of sending a
# real on-chain payment, since the cash never left the pool to begin with.
# There is no withdrawal endpoint yet -- ledger cash can only become a real
# payment again by buying something you can later sell.


def get_ledger_balance(wallet_address: str) -> int:
    return wallet_ledger_balances.get(wallet_address, 0)


def record_deposit(wallet_address: str, amount_lamports: int, tx_signature: str) -> int:
    """Credits wallet_address's ledger balance, returning the new total. The
    caller (app/main.py) must have already verified tx_signature on-chain --
    claiming it here (rather than there) keeps the check-and-credit atomic."""
    global _next_deposit_seq
    claim_tx_signature(tx_signature)
    wallet_ledger_balances[wallet_address] = (
        wallet_ledger_balances.get(wallet_address, 0) + amount_lamports
    )
    deposits.append(
        OnChainDeposit(
            id=f"dep{_next_deposit_seq}",
            walletAddress=wallet_address,
            amountLamports=amount_lamports,
            txSignature=tx_signature,
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
    )
    _next_deposit_seq += 1
    return wallet_ledger_balances[wallet_address]


def debit_ledger(wallet_address: str, amount_lamports: int) -> None:
    balance = wallet_ledger_balances.get(wallet_address, 0)
    if balance < amount_lamports:
        raise ActionError(
            f"這個錢包的可投資餘額只有 {balance} lamports，不足支付 {amount_lamports} lamports，請先儲值。"
        )
    wallet_ledger_balances[wallet_address] = balance - amount_lamports


def credit_ledger(wallet_address: str, amount_lamports: int) -> None:
    wallet_ledger_balances[wallet_address] = (
        wallet_ledger_balances.get(wallet_address, 0) + amount_lamports
    )


# ---- sell / redeem -----------------------------------------------------------
#
# There's no secondary market here (no live price feed) -- "selling" means
# redeeming back to the issuer at the same demo unit price it was bought at,
# refunded as a real devnet SOL payment from the treasury wallet. Each is
# split into a read-only `preview_*` (validate + compute the refund, safe to
# call before the on-chain payment is attempted) and an `apply_*` (mutate
# state, only called once that payment has actually gone through) so a
# failed treasury payment never leaves campaign state out of sync with what
# was actually paid out.


def preview_sell_shares(campaign_id: str, amount: int, wallet_address: str) -> int:
    """Validate a shares sell and return the lamports it should refund."""
    _get_investment_campaign(campaign_id)
    if amount <= 0:
        raise ActionError("賣出份數需大於 0")

    held = get_wallet_shares_held(campaign_id, wallet_address)
    if amount > held:
        raise ActionError(f"這個錢包在此專案僅持有 {held} 份，無法賣出 {amount} 份")

    # get_wallet_shares_held is a per-wallet ledger; the shared demo position
    # apply_sell_shares actually mutates is not wallet-scoped (see buy_shares)
    # and could in principle hold fewer shares than any one wallet's slice of
    # it. Validate against it here too, so a shortfall is a rejected sell
    # (nothing paid out, nothing mutated) rather than apply_sell_shares
    # silently paying out more than it actually removes from campaign state.
    position = _ensure_position(campaign_id)
    if amount > position.shareCount:
        raise ActionError(f"專案目前部位僅剩 {position.shareCount} 份，無法賣出 {amount} 份")

    return amount * LAMPORTS_PER_SHARE_UNIT


def apply_sell_shares(campaign_id: str, amount: int) -> None:
    """Mutate campaign/position state for a shares sell already paid out.
    Callers must go through preview_sell_shares first, which guarantees
    amount <= position.shareCount."""
    campaign = _get_investment_campaign(campaign_id)
    terms = campaign.investment
    assert terms is not None

    position = _ensure_position(campaign_id)
    assert amount <= position.shareCount, "preview_sell_shares should have rejected this already"

    for _ in range(amount):
        if position.tokenIds:
            position.tokenIds.pop()
    position.shareCount -= amount
    terms.mintedShares = max(terms.mintedShares - amount, 0)
    campaign.raisedAmount -= amount * terms.sharePrice

    if position.shareCount == 0 and terms.holderCount > 0:
        terms.holderCount -= 1
        campaign.backerCount = max(campaign.backerCount - 1, 0)


def preview_redeem_donation(
    campaign_id: str, tier_id: str, wallet_address: str
) -> tuple[Donation, int]:
    """Validate a reward-tier redemption and return (the donation to redeem,
    lamports it should refund)."""
    campaign = next((c for c in campaigns if c.id == campaign_id), None)
    if not campaign:
        raise CampaignNotFoundError(campaign_id)
    if campaign.fundingModel != "reward":
        raise ActionError("這個專案是投資型，請用份數賣出而不是方案 tierId")

    tier = next((t for t in campaign.rewardTiers if t.id == tier_id), None)
    if not tier:
        raise ActionError("找不到這個方案")

    donation = next(
        (
            d
            for d in donations
            if d.campaignId == campaign_id
            and d.tierId == tier_id
            and d.walletAddress == wallet_address
            and not d.redeemed
            # Only a donation whose txSignature was verified on-chain (see
            # add_donation/app/chain_verify.py) can be redeemed for a real
            # refund -- otherwise anyone could donate with no signature at
            # all and redeem it for free money.
            and d.txSignature is not None
        ),
        None,
    )
    if not donation:
        raise ActionError("這個錢包在此方案沒有可退回的認購紀錄")

    return donation, LAMPORTS_PER_SHARE_UNIT


def apply_redeem_donation(donation: Donation, campaign_id: str, tier_id: str) -> None:
    """Mutate donation/tier/campaign state for a redemption already paid out."""
    donation.redeemed = True
    campaign = next(c for c in campaigns if c.id == campaign_id)
    tier = next(t for t in campaign.rewardTiers if t.id == tier_id)

    tier.claimed = max(tier.claimed - 1, 0)
    campaign.raisedAmount -= tier.price
    campaign.backerCount = max(campaign.backerCount - 1, 0)


def record_redemption(
    campaign_id: str,
    amount_lamports: int,
    shares: int,
    tier_id: Optional[str],
    tx_signature: Optional[str],
    wallet_address: str,
) -> None:
    global _next_redemption_seq
    redemptions.append(
        OnChainRedemption(
            id=f"rd{_next_redemption_seq}",
            campaignId=campaign_id,
            amountLamports=amount_lamports,
            shares=shares,
            tierId=tier_id,
            txSignature=tx_signature,
            createdAt=datetime.now(timezone.utc).isoformat(),
            walletAddress=wallet_address,
        )
    )
    _next_redemption_seq += 1


def get_wallet_history(
    wallet_address: str,
) -> tuple[list[Donation], list[OnChainTransaction], list[OnChainRedemption], list[OnChainDeposit]]:
    """All donations/investment purchases/redemptions/deposits a wallet address
    paid for, was refunded to, or topped up, newest first."""
    matched_donations = sorted(
        (d for d in donations if d.walletAddress == wallet_address),
        key=lambda d: d.createdAt,
        reverse=True,
    )
    matched_transactions = sorted(
        (t for t in onchain_transactions if t.walletAddress == wallet_address),
        key=lambda t: t.createdAt,
        reverse=True,
    )
    matched_redemptions = sorted(
        (r for r in redemptions if r.walletAddress == wallet_address),
        key=lambda r: r.createdAt,
        reverse=True,
    )
    matched_deposits = sorted(
        (d for d in deposits if d.walletAddress == wallet_address),
        key=lambda d: d.createdAt,
        reverse=True,
    )
    return matched_donations, matched_transactions, matched_redemptions, matched_deposits


def get_wallet_shares_held(campaign_id: str, wallet_address: str) -> int:
    """Net investment shares this wallet has actually paid for on-chain minus
    whatever it has already sold back -- independent of the shared demo
    `investor_positions` entry, which isn't wallet-scoped (see buy_shares)."""
    bought = sum(
        t.shares
        for t in onchain_transactions
        if t.campaignId == campaign_id and t.walletAddress == wallet_address
    )
    sold = sum(
        r.shares
        for r in redemptions
        if r.campaignId == campaign_id and r.walletAddress == wallet_address
    )
    return bought - sold


def get_onchain_transactions(campaign_id: str) -> list[OnChainTransaction]:
    return sorted(
        (t for t in onchain_transactions if t.campaignId == campaign_id),
        key=lambda t: t.createdAt,
        reverse=True,
    )


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
    return amount
