import Link from "next/link";
import { AnimatedCounter } from "@/components/animated-counter";
import { CampaignCard } from "@/components/campaign-card";
import { JourneyRing } from "@/components/journey-ring";
import { Reveal } from "@/components/reveal";
import { CATEGORY_LABELS, getFeaturedCampaigns, listCampaigns } from "@/lib/campaigns";
import type { CampaignCategory } from "@/lib/types";

const CATEGORY_ORDER: CampaignCategory[] = [
  "agriculture",
  "startup",
  "lifestyle",
  "tech",
  "food",
  "design",
];

const TRUST_LOGOS = ["工商時報", "數位時代", "創業小聚", "台灣新創競技場", "資策會"];

const AI_AGENT_FEATURES = [
  {
    title: "自動監控結算與買回時機",
    description: "AI Agent 持續追蹤每個投資型 RWA 專案的年度結算與農夫買回進度，第一時間掌握狀態變化。",
  },
  {
    title: "自動執行分紅與交割",
    description: "分紅可領時自動幫你領取，買回啟動時自動完成交割，不用手動盯著每個專案頁面。",
  },
  {
    title: "智慧再投資建議",
    description: "根據歷史殖利率、投資人分潤與風險狀況，建議下一個值得關注的 RWA 專案。",
  },
];

const TESTIMONIALS = [
  {
    quote: "終於有一個管道，讓我們不用跑遍創投就能啟動研發。RWA Token 讓早期用戶變成真正的合作夥伴。",
    name: "陳致遠",
    role: "迴響科技 共同創辦人",
  },
  {
    quote: "支持者收到的不只是商品，還能看到每一筆資金怎麼被使用，這種透明度是我們一直想要的。",
    name: "林美惠",
    role: "崙背果農合作社 理事長",
  },
  {
    quote: "介面清楚、方案透明，選一個 Token 方案就像線上購物一樣直覺，完全沒有負擔。",
    name: "王思婷",
    role: "平台支持者",
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
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span
            style={heroFadeStyle(0)}
            className={`inline-flex items-center rounded-full border border-border px-4 py-1 text-sm font-medium text-foreground/70 ${HERO_FADE_CLASS}`}
          >
            RWA 群眾募資平台原型
          </span>

          <h1
            style={heroFadeStyle(80)}
            className={`max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl ${HERO_FADE_CLASS}`}
          >
            讓好提案，<span className="text-brand">找得到資金</span>
          </h1>

          <p style={heroFadeStyle(160)} className={`max-w-xl text-base text-foreground/60 ${HERO_FADE_CLASS}`}>
            拾光募資用 RWA Token 讓小農地轉型、新創研發到獨立品牌新品，
            都能找到快速、可驗證的資金來源——同時也是你熟悉的那種眼鏡、月餅禮盒、咖啡機預購募資。
          </p>

          <div
            style={heroFadeStyle(240)}
            className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${HERO_FADE_CLASS}`}
          >
            <Link
              href="/campaigns"
              className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-brand-strong"
            >
              開始探索
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-full border border-foreground/20 px-7 py-3 text-sm font-semibold text-foreground transition hover:scale-105 hover:border-foreground/50"
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
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:border-brand/50 hover:text-brand"
              >
                {CATEGORY_LABELS[value]}
              </Link>
            ))}
          </div>

          <dl
            style={heroFadeStyle(400)}
            className={`mt-6 grid max-w-2xl grid-cols-3 gap-6 text-left ${HERO_FADE_CLASS}`}
          >
            <div>
              <dt className="text-xs text-foreground/50">累積募得金額</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalRaised} suffix=" 元" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-foreground/50">支持人次</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalBackers} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-foreground/50">進行中專案</dt>
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
            <span key={name} className="text-sm font-semibold tracking-wide text-foreground/35">
              {name}
            </span>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">熱門進行中專案</h2>
            <p className="mt-1 text-sm text-foreground/60">達成率最高的三個專案</p>
          </div>
          <Link href="/campaigns" className="text-sm font-medium text-brand hover:underline">
            查看全部 →
          </Link>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="text-2xl font-semibold">什麼是 RWA 募資？</h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              從一個缺乏管道的好提案，到支持者拿到看得到的成果——五個階段，一目了然。
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
              <h2 className="text-2xl font-semibold">AI Agent 自動化交易</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/50">
                展示功能・即將推出
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              投資型 RWA 專案的結算與買回都有明確規則可循，AI Agent 可以代替你盯盤，
              在對的時機自動領取分紅、完成買回交割。
            </p>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {AI_AGENT_FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 100}>
                <div className="h-full rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-foreground/60">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold">支持者怎麼說</h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="flex h-full flex-col rounded-2xl border border-border p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/80">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                      {t.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-foreground/50">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
