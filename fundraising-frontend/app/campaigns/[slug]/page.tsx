import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryPill } from "@/components/category-pill";
import { ProgressBar } from "@/components/progress-bar";
import { DonateForm } from "@/components/donate-form";
import { InvestmentPanel } from "@/components/investment-panel";
import {
  getCampaignBySlug,
  getDonationsForCampaign,
  getInvestorPosition,
  getOnChainTransactions,
} from "@/lib/campaigns";
import {
  daysRemaining,
  formatCurrency,
  formatDate,
  formatTWDT,
  fundedPercent,
  progressPercent,
} from "@/lib/format";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);

  if (!campaign) {
    notFound();
  }

  const donations = await getDonationsForCampaign(campaign.slug);
  const investorPosition = campaign.fundingModel === "investment"
    ? await getInvestorPosition(campaign.slug)
    : null;
  const onChainTransactions = campaign.fundingModel === "investment"
    ? await getOnChainTransactions(campaign.slug)
    : [];
  const percent = progressPercent(campaign.raisedAmount, campaign.goalAmount);
  const funded = fundedPercent(campaign.raisedAmount, campaign.goalAmount);
  const daysLeft = daysRemaining(campaign.deadline);
  const isInvestment = campaign.fundingModel === "investment" && campaign.investment;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/campaigns" className="text-sm text-foreground/50 hover:text-foreground">
        ← 返回專案列表
      </Link>

      <div
        className={`relative mt-4 h-56 overflow-hidden rounded-lg bg-gradient-to-br sm:h-72 ${campaign.coverGradient}`}
      >
        {campaign.coverImage && (
          <Image
            src={campaign.coverImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
            className="object-cover"
          />
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <CategoryPill category={campaign.category} />
            {isInvestment && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/60">
                投資型 RWA 專案
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {campaign.creatorName} ・ {campaign.location} ・ 發起於 {formatDate(campaign.createdAt)}
          </p>

          <p className="mt-6 text-base leading-relaxed text-foreground/80">{campaign.summary}</p>

          <div className="mt-8 border-t border-border pt-8">
            <h2 className="mb-3 font-display text-lg font-semibold">專案說明</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">
              {campaign.story}
            </p>
          </div>

          {!isInvestment && (
            <div className="mt-10 border-t border-border pt-8">
              <h2 className="mb-4 font-display text-lg font-semibold">RWA Token 回饋方案</h2>
              <div className="flex flex-col gap-3">
                {campaign.rewardTiers.map((t) => {
                  const remaining = t.totalSupply - t.claimed;
                  const soldOut = remaining <= 0;
                  return (
                    <div key={t.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="font-mono text-xs text-foreground/40">
                            {t.tokenSymbol}
                          </span>
                          <h3 className="font-display font-semibold text-foreground">{t.title}</h3>
                        </div>
                        <span className="whitespace-nowrap text-lg font-bold text-brand-strong">
                          {formatCurrency(t.price)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/70">{t.description}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-foreground/50">
                        <span>預計交付：{t.estimatedDelivery}</span>
                        <span className={soldOut ? "font-medium text-danger" : undefined}>
                          {soldOut
                            ? "已兌換完畢"
                            : `已兌換 ${t.claimed} / ${t.totalSupply} 個 Token`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isInvestment && (
            <>
              <div className="mt-10 rounded-lg border border-border bg-surface-muted p-4 text-xs leading-relaxed text-foreground/60">
                此專案的 RWA Token 為投資型股份，機制對齊 contractTest 的 SafeHarvestNFT
                合約：購買股份、年度結算分潤、農夫可依合約價格買回全部股份，投資人隨時可查看並領取待領分紅。
                購買股份時會透過你的 Solana 錢包發送真實的 Devnet 測試轉帳，交易可在 Explorer 上查證；
                年度結算、買回與領取分紅目前仍是後台模擬，尚未串接鏈上合約邏輯。
              </div>

              <div className="mt-10 border-t border-border pt-8">
                <h2 className="mb-4 font-display text-lg font-semibold">
                  鏈上交易紀錄（{onChainTransactions.length}）
                </h2>
                {onChainTransactions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm font-medium text-foreground">目前還沒有鏈上交易紀錄</p>
                    <p className="mt-1 text-sm text-foreground/50">
                      連接錢包購買第一份 RWA Token，交易會即時記錄在這裡。
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {onChainTransactions.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            購買 {tx.shares} 份・{(tx.amountLamports / 1_000_000_000).toFixed(6)} SOL
                          </p>
                          <p className="mt-0.5 text-xs text-foreground/50">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                        <a
                          href={`https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="whitespace-nowrap font-mono text-xs text-brand-strong hover:underline"
                        >
                          {tx.txSignature.slice(0, 6)}…{tx.txSignature.slice(-6)} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="mt-10 border-t border-border pt-8">
            <h2 className="mb-4 font-display text-lg font-semibold">支持者留言（{donations.length}）</h2>
            {donations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm font-medium text-foreground">目前尚無支持者留言</p>
                <p className="mt-1 text-sm text-foreground/50">
                  成為第一位支持者，留下一句話陪這個提案走下去吧！
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {donations.map((donation) => {
                  const donationTier = campaign.rewardTiers.find((t) => t.id === donation.tierId);
                  return (
                    <li key={donation.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{donation.backerName}</span>
                        <span className="text-foreground/50">
                          取得 {donationTier?.title ?? "方案"}・{formatCurrency(donation.amount)}
                        </span>
                      </div>
                      {donation.message && (
                        <p className="mt-2 text-sm text-foreground/70">{donation.message}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-col gap-2">
            <span className="text-2xl font-bold text-brand-strong">
              {isInvestment ? formatTWDT(campaign.raisedAmount) : formatCurrency(campaign.raisedAmount)}
            </span>
            <span className="text-sm text-foreground/60">
              目標{" "}
              {isInvestment ? formatTWDT(campaign.goalAmount) : formatCurrency(campaign.goalAmount)}{" "}
              ・{" "}
              <span className={funded >= 100 ? "font-medium text-brand-strong" : undefined}>
                {funded}% 達成
              </span>
            </span>
            <ProgressBar percent={percent} />
            <div className="flex items-center justify-between text-sm text-foreground/60">
              <span>{campaign.backerCount} 人響應</span>
              <span>{daysLeft > 0 ? `剩 ${daysLeft} 天` : "已截止"}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            {isInvestment && investorPosition ? (
              <InvestmentPanel
                slug={campaign.slug}
                investment={campaign.investment!}
                position={investorPosition}
              />
            ) : (
              <DonateForm slug={campaign.slug} rewardTiers={campaign.rewardTiers} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
