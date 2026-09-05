import { CATEGORY_LABELS } from "./campaigns";
import { daysRemaining, formatCurrency, formatTWDT, progressPercent } from "./format";
import type { Campaign, CampaignCategory } from "./types";

export type RiskLevel = "low" | "medium" | "high";

export interface UserPreferences {
  budgetSol: number;
  riskLevel: RiskLevel;
  categories: CampaignCategory[];
}

export interface CampaignRecommendation {
  campaign: Campaign;
  riskScore: number;
  riskLabel: string;
  allocationSol: number;
  reasons: string[];
}

export interface AgentProposal {
  preferences: UserPreferences;
  recommendations: CampaignRecommendation[];
  summary: string;
}

const CATEGORY_KEYWORDS: Record<CampaignCategory, string[]> = {
  agriculture: ["農", "永續", "果", "食農"],
  startup: ["新創", "研發", "創業"],
  lifestyle: ["生活", "選物", "托特", "皮革"],
  tech: ["科技", "3c", "咖啡", "家電"],
  food: ["飲食", "月餅", "禮盒", "食品"],
  design: ["設計", "工藝", "手作"],
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "低風險",
  medium: "中等風險",
  high: "高風險",
};

export function parseUserPreferences(input: string): UserPreferences {
  const text = input.toLowerCase();
  const solMatch = input.match(/(\d+(?:\.\d+)?)\s*sol/i);
  const budgetSol = solMatch ? Number(solMatch[1]) : 0.1;

  let riskLevel: RiskLevel = "medium";
  if (/低風險|保守|穩健|新手/.test(input)) riskLevel = "low";
  else if (/高風險|積極|冒險/.test(input)) riskLevel = "high";

  const categories = (Object.keys(CATEGORY_KEYWORDS) as CampaignCategory[]).filter(
    (category) =>
      CATEGORY_KEYWORDS[category].some((keyword) => text.includes(keyword.toLowerCase())) ||
      text.includes(CATEGORY_LABELS[category])
  );

  return { budgetSol: Math.max(0.01, budgetSol), riskLevel, categories };
}

function baseRiskScore(campaign: Campaign): number {
  let score = 55;
  const funded = progressPercent(campaign.raisedAmount, campaign.goalAmount);
  const daysLeft = daysRemaining(campaign.deadline);

  if (funded >= 100) score -= 18;
  else if (funded >= 70) score -= 12;
  else if (funded >= 40) score -= 6;
  else score += 8;

  if (daysLeft <= 7) score += 10;
  else if (daysLeft >= 21) score -= 4;

  if (campaign.fundingModel === "investment") score += 6;

  return Math.max(15, Math.min(90, score));
}

function riskLabel(score: number): string {
  if (score <= 35) return "低";
  if (score <= 60) return "中";
  return "高";
}

function matchesRisk(score: number, level: RiskLevel): boolean {
  if (level === "low") return score <= 45;
  if (level === "high") return score >= 50;
  return score >= 30 && score <= 65;
}

export function analyzeCampaigns(
  campaigns: Campaign[],
  preferences: UserPreferences
): AgentProposal {
  const active = campaigns.filter((campaign) => daysRemaining(campaign.deadline) > 0);

  const scored = active
    .map((campaign) => {
      let score = baseRiskScore(campaign);
      const reasons: string[] = [];

      const funded = progressPercent(campaign.raisedAmount, campaign.goalAmount);
      reasons.push(`募資進度 ${funded}%`);
      reasons.push(`${campaign.backerCount} 人響應`);
      reasons.push(`剩 ${daysRemaining(campaign.deadline)} 天`);

      if (preferences.categories.length > 0 && preferences.categories.includes(campaign.category)) {
        score -= 12;
        reasons.push(`符合偏好：${CATEGORY_LABELS[campaign.category]}`);
      }

      if (campaign.fundingModel === "investment" && campaign.investment) {
        reasons.push(`投資人分潤 ${campaign.investment.investorSharePercent}%`);
      } else {
        const tier = campaign.rewardTiers[0];
        if (tier) reasons.push(`回饋方案 ${tier.title}`);
      }

      return {
        campaign,
        riskScore: score,
        riskLabel: riskLabel(score),
        allocationSol: 0,
        reasons,
      };
    })
    .filter((item) => matchesRisk(item.riskScore, preferences.riskLevel))
    .sort((a, b) => {
      const categoryBoost =
        (preferences.categories.includes(a.campaign.category) ? -20 : 0) -
        (preferences.categories.includes(b.campaign.category) ? -20 : 0);
      return a.riskScore + categoryBoost - (b.riskScore + categoryBoost);
    })
    .slice(0, 3);

  const picks =
    scored.length > 0
      ? scored
      : active
          .map((campaign) => ({
            campaign,
            riskScore: baseRiskScore(campaign),
            riskLabel: riskLabel(baseRiskScore(campaign)),
            allocationSol: 0,
            reasons: [`募資進度 ${progressPercent(campaign.raisedAmount, campaign.goalAmount)}%`],
          }))
          .sort((a, b) => a.riskScore - b.riskScore)
          .slice(0, 2);

  const count = picks.length || 1;
  const perProject = Number((preferences.budgetSol / count).toFixed(4));
  const recommendations = picks.map((item) => ({
    ...item,
    allocationSol: perProject,
  }));

  const categoryText =
    preferences.categories.length > 0
      ? preferences.categories.map((c) => CATEGORY_LABELS[c]).join("、")
      : "不限類別";

  const summary = [
    `已讀取 ${active.length} 個進行中專案。`,
    `依你的偏好（預算 ${preferences.budgetSol} SOL、${RISK_LABELS[preferences.riskLevel]}、${categoryText}），`,
    `建議配置 ${recommendations.length} 個專案，各分配約 ${perProject} SOL。`,
  ].join("");

  return { preferences, recommendations, summary };
}

export function formatProposalMessage(proposal: AgentProposal): string {
  if (proposal.recommendations.length === 0) {
    return `${proposal.summary}\n\n目前沒有符合條件的專案，請調整預算或風險偏好後再試。`;
  }

  const lines = proposal.recommendations.map((item, index) => {
    const amount =
      item.campaign.fundingModel === "investment"
        ? formatTWDT(item.campaign.investment?.sharePrice ?? 0)
        : formatCurrency(item.campaign.rewardTiers[0]?.price ?? 0);
    return [
      `${index + 1}. ${item.campaign.title}`,
      `   風險分數 ${item.riskScore}（${item.riskLabel}）・分配 ${item.allocationSol} SOL`,
      `   ${CATEGORY_LABELS[item.campaign.category]}・${amount} 起`,
      `   ${item.reasons.slice(0, 3).join(" · ")}`,
    ].join("\n");
  });

  return `${proposal.summary}\n\n${lines.join("\n\n")}\n\n若同意此配置，請回覆「確認下單」或點下方按鈕。`;
}

export const SUGGESTED_PROMPTS = [
  "我有 0.5 SOL，偏好低風險農業專案",
  "預算 1 SOL，可以承受中等風險",
  "推薦適合新手的投資型專案",
];
