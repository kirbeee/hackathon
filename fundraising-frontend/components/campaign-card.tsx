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

export function CampaignCard({
  campaign,
  featured = false,
}: {
  campaign: Campaign;
  featured?: boolean;
}) {
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
      className={`group flex overflow-hidden rounded-lg border border-border bg-surface transition hover:border-brand/40 hover:shadow-sm ${
        featured ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${campaign.coverGradient} ${
          featured ? "h-48 sm:h-auto sm:w-2/5" : "h-32"
        }`}
      >
        {campaign.coverImage && (
          <Image
            src={campaign.coverImage}
            alt=""
            fill
            sizes={
              featured
                ? "(min-width: 640px) 40vw, 100vw"
                : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-brand-strong">
            認購率最高
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col gap-3 p-5 ${featured ? "sm:p-6" : ""}`}>
        <div className="flex items-center justify-between">
          <CategoryPill category={campaign.category} />
          <span className="text-xs font-medium text-foreground/40">
            {isInvestment
              ? "RWA 債權投資標的"
              : `${campaign.rewardTiers.length} 種債權認購方案`}
          </span>
        </div>
        <h3
          className={`font-display font-semibold leading-snug text-foreground group-hover:text-brand-strong ${
            featured ? "text-xl" : "text-base"
          }`}
        >
          {campaign.title}
        </h3>
        <p
          className={`text-foreground/60 ${
            featured ? "text-sm sm:line-clamp-3" : "line-clamp-2 text-sm"
          }`}
        >
          {featured ? campaign.story : campaign.summary}
        </p>
        <p className="text-xs text-foreground/50">
          {isInvestment
            ? `每份 ${formatTWDT(campaign.investment!.sharePrice)}`
            : `每單位 ${formatCurrency(startingPrice!)}`}
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
              {funded}% 已認購
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-foreground/50">
            <span>{campaign.backerCount} 位投資人</span>
            <span>{daysLeft > 0 ? `認購剩 ${daysLeft} 天` : "認購已截止"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
