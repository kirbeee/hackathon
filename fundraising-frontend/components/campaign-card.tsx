import Image from "next/image";
import Link from "next/link";
import { ProgressBar } from "./progress-bar";
import { CategoryPill } from "./category-pill";
import {
  daysRemaining,
  formatCompactNumber,
  formatCurrency,
  formatTWDT,
  fundedPercent,
  progressPercent,
} from "@/lib/format";
import type { Campaign } from "@/lib/types";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const percent = progressPercent(campaign.raisedAmount, campaign.goalAmount);
  const funded = fundedPercent(campaign.raisedAmount, campaign.goalAmount);
  const daysLeft = daysRemaining(campaign.deadline);
  const isInvestment = campaign.fundingModel === "investment" && campaign.investment;
  const startingPrice = isInvestment
    ? undefined
    : Math.min(...campaign.rewardTiers.map((t) => t.price));

  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${campaign.coverGradient}`}>
        {campaign.coverImage && (
          <Image
            src={campaign.coverImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <CategoryPill category={campaign.category} />
          <span className="text-xs font-medium text-foreground/40">
            {isInvestment
              ? "投資型 RWA 專案"
              : `${campaign.rewardTiers.length} 種 RWA Token 方案`}
          </span>
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-brand-strong">
          {campaign.title}
        </h3>
        <p className="line-clamp-2 text-sm text-foreground/60">{campaign.summary}</p>
        <p className="text-xs text-foreground/50">
          {isInvestment
            ? `每份 ${formatTWDT(campaign.investment!.sharePrice)}`
            : `${formatCurrency(startingPrice!)} 起`}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <ProgressBar percent={percent} />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-brand-strong">
              {isInvestment
                ? `${formatCompactNumber(campaign.raisedAmount)} TWDT`
                : `${formatCompactNumber(campaign.raisedAmount)} 元`}
            </span>
            <span className={funded >= 100 ? "font-medium text-brand-strong" : "text-foreground/50"}>
              {funded}% 達成
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-foreground/50">
            <span>{campaign.backerCount} 人響應</span>
            <span>{daysLeft > 0 ? `剩 ${daysLeft} 天` : "已截止"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
