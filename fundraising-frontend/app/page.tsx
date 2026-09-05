import Link from "next/link";
import { AnimatedCounter } from "@/components/animated-counter";
import { CampaignCard } from "@/components/campaign-card";
import { JourneyRing } from "@/components/journey-ring";
import { Reveal } from "@/components/reveal";
import {
  CATEGORY_LABELS,
  getFeaturedCampaigns,
  listCampaigns,
} from "@/lib/campaigns";
import type { CampaignCategory } from "@/lib/types";

const CATEGORY_ORDER: CampaignCategory[] = [
  "agriculture",
  "startup",
  "lifestyle",
  "tech",
  "food",
  "design",
];

const TRUST_LOGOS = [
  "工商時報",
  "數位時代",
  "創業小聚",
  "台灣新創競技場",
  "資策會",
];

const AI_AGENT_FEATURES = [
  {
    title: "自動監控結算與買回時機",
    description:
      "AI Agent 持續追蹤每個投資型 RWA 專案的年度結算與農夫買回進度，第一時間掌握狀態變化。",
  },
  {
    title: "自動執行分紅與交割",
    description:
      "分紅可領時自動幫你領取，買回啟動時自動完成交割，不用手動盯著每個專案頁面。",
  },
  {
    title: "智慧再投資建議",
    description:
      "根據歷史殖利率、投資人分潤與風險狀況，建議下一個值得關注的 RWA 專案。",
  },
];

const HERO_FADE_CLASS = "opacity-0";

function heroFadeStyle(delayMs: number): React.CSSProperties {
  return {
    animation: "fade-in-up 0.7s ease-out forwards",
    animationDelay: `${delayMs}ms`,
  };
}

export default async function HomePage() {
  const campaigns = await listCampaigns();
  const featured = await getFeaturedCampaigns(3);
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalBackers = campaigns.reduce((sum, c) => sum + c.backerCount, 0);

  return (
    <div>
      <section className="relative overflow-hidden bg-[#0a120e]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span
            style={heroFadeStyle(0)}
            className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm font-medium text-white/70 ${HERO_FADE_CLASS}`}
          >
            RWA 群眾募資平台原型
          </span>

          <h1
            style={heroFadeStyle(80)}
            className={`max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl ${HERO_FADE_CLASS}`}
          >
            讓好提案，找得到資金
          </h1>

          <p
            style={heroFadeStyle(160)}
            className={`max-w-xl text-base text-white/60 ${HERO_FADE_CLASS}`}
          >
            拾光募資用 RWA Token 讓小農地轉型、新創研發到獨立品牌新品，
            都能找到快速、可驗證的資金來源。同時，它也是你熟悉的那種眼鏡、月餅禮盒、咖啡機預購募資。
          </p>

          <div
            style={heroFadeStyle(240)}
            className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${HERO_FADE_CLASS}`}
          >
            <Link
              href="/campaigns"
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-accent-strong active:scale-95"
            >
              開始探索
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:border-white/60 active:scale-95"
            >
              發起我的專案
            </Link>
          </div>

          <div
            style={heroFadeStyle(320)}
            className={`flex flex-wrap justify-center gap-2 pt-2 ${HERO_FADE_CLASS}`}
          >
            {CATEGORY_ORDER.map((value) => (
              <Link
                key={value}
                href={`/campaigns?category=${value}`}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-white/70 transition hover:border-brand hover:text-brand"
              >
                {CATEGORY_LABELS[value]}
              </Link>
            ))}
          </div>

          <dl
            style={heroFadeStyle(400)}
            className={`mt-6 grid max-w-2xl grid-cols-3 gap-6 text-left ${HERO_FADE_CLASS}`}
          >
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <dt className="text-xs text-white/70">累積募得金額</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalRaised} suffix=" 元" />
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <dt className="text-xs text-white/70">支持人次</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalBackers} />
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <dt className="text-xs text-white/70">進行中專案</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={campaigns.length} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-border py-8">
        <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6">
          {TRUST_LOGOS.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-foreground/35"
            >
              {name}
            </span>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">熱門進行中專案</h2>
            <p className="mt-1 text-sm text-foreground/60">
              達成率最高的三個專案
            </p>
          </div>
          <Link
            href="/campaigns"
            className="text-sm font-medium text-brand hover:underline"
          >
            查看全部
          </Link>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-3">
          {featured.map((campaign, i) => (
            <Reveal key={campaign.id} delay={i * 100}>
              <CampaignCard campaign={campaign} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold">什麼是 RWA 募資？</h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              從一個缺乏管道的好提案，到支持者拿到看得到的成果，五個階段一目了然。
            </p>
          </Reveal>
          <Reveal delay={150} className="mt-8">
            <JourneyRing />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-semibold">AI Agent 自動化交易</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/50">
                展示功能・即將推出
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              投資型 RWA 專案的結算與買回都有明確規則可循，AI Agent
              可以代替你盯盤， 在對的時機自動領取分紅、完成買回交割。
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-8 divide-y divide-border border-t border-border sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:border-t-0">
            {AI_AGENT_FEATURES.map((feature, i) => (
              <div key={feature.title} className="py-5 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <span className="text-xs font-medium text-foreground/40">0{i + 1}</span>
                <h3 className="mt-1 font-display font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-foreground/60">{feature.description}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={150}>
            <Link
              href="/agent"
              className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
            >
              深入了解 AI Agent 理財助理
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-16 text-center">
          <Reveal className="flex flex-col items-center gap-5">
            <h2 className="font-display text-2xl font-semibold">準備好開始了嗎？</h2>
            <p className="max-w-md text-sm text-foreground/60">
              瀏覽正在募資的專案，或是把你的提案拆成 RWA Token，讓資金找上門。
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/campaigns"
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-accent-strong active:scale-95"
              >
                開始探索
              </Link>
              <Link
                href="/campaigns/new"
                className="rounded-full border border-foreground/20 px-7 py-3 text-sm font-semibold text-foreground transition hover:scale-105 hover:border-foreground/50 active:scale-95"
              >
                發起我的專案
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
