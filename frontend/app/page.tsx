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
import { formatUSD } from "@/lib/format";
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

const TECH_VALUE_STATS = [
  {
    label: "最低參與門檻",
    before: "傳統私募依規僅限專業投資人，門檻常在新台幣 300 萬元以上",
    after: "RWA Token 化後最低 3,000 元即可參與，降低超過 99%",
  },
  {
    label: "撥款與結算速度",
    before: "傳統私募配息／贖回需經銀行匯款與人工對帳，通常 3–5 個工作天",
    after: "鏈上分潤與買回撥付在數秒內完成，交易即時可查證",
  },
  {
    label: "跨境參與成本",
    before: "傳統跨境電匯手續費通常 3–5%，另計中間行費用",
    after: "Solana 鏈上單筆手續費低於 NT$0.01（Devnet 示範，主網同樣是次分錢等級）",
  },
  {
    label: "資金流向透明度",
    before: "傳統私募的資金運用與撥款紀錄通常僅發行方與受託銀行掌握",
    after: "每筆認購、分潤、買回皆有鏈上交易紀錄，任何人可在 Explorer 公開查證",
  },
];

const TRUST_CARDS = [
  {
    title: "平台費率與國泰角色",
    points: [
      "每筆認購收取 2% 服務費，投資型專案年度收益另收 10% 管理費（示範費率，正式上線前將依主管機關規範調整）。",
      "串接國泰的 KYC 身份驗證框架與資產信評模型，標的須通過資產文件驗證與信用評分才會開放公開認購（本平台為概念demo，尚未正式串接國泰內部系統）。",
    ],
  },
  {
    title: "跟其他募資平台的差異",
    points: [
      "嘖嘖、Kickstarter 這類回饋型募資：贊助沒有可轉讓憑證，也無法追蹤資金實際運用，贊助後只能等待出貨。",
      "拾光 RWA 把每一份參與都鑄造成鏈上 RWA Token，具備可驗證的歸屬紀錄與資金流向，並保留未來次級市場轉讓的可能性。",
    ],
  },
  {
    title: "防詐騙與資產驗證機制",
    points: [
      "三重把關：發起人身份驗證（KYC）、標的資產文件與權利證明審核、國泰信評模型風險評分，三者皆通過才能上架。",
      "資金採信託專戶或鏈上合約託管（依專案類型），避免發起人任意挪用；所有交易鏈上留痕，可作為未來爭議稽核依據。",
    ],
  },
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
            RWA 私募債權投資平台
          </span>

          <h1
            style={heroFadeStyle(80)}
            className={`max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl ${HERO_FADE_CLASS}`}
          >
            讓大型債權，成為可負擔的小額投資
          </h1>

          <p
            style={heroFadeStyle(160)}
            className={`max-w-xl text-base text-white/60 ${HERO_FADE_CLASS}`}
          >
            從農業轉型、新創研發到品牌量產，平台將可驗證的資金需求拆分為
            RWA Token，讓投資人以小額單位參與原本門檻較高的私募債權市場。
          </p>

          <div
            style={heroFadeStyle(240)}
            className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${HERO_FADE_CLASS}`}
          >
            <Link
              href="/campaigns"
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-accent-strong active:scale-95"
            >
              瀏覽投資標的
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
              <dt className="text-xs text-white/70">累積認購金額</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalRaised} suffix=" 元" />
              </dd>
              <dd className="text-xs text-white/40">≈ {formatUSD(totalRaised)}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <dt className="text-xs text-white/70">投資人次</dt>
              <dd className="text-2xl font-bold text-brand">
                <AnimatedCounter value={totalBackers} />
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <dt className="text-xs text-white/70">存續中標的</dt>
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
            <h2 className="font-display text-2xl font-semibold">熱門債權標的</h2>
            <p className="mt-1 text-sm text-foreground/60">
              認購進度最高的三個發行專案
            </p>
          </div>
          <Link
            href="/campaigns"
            className="text-sm font-medium text-brand hover:underline"
          >
              查看全部標的
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
            <h2 className="font-display text-2xl font-semibold">什麼是 RWA 債權投資？</h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              從資金需求、資產驗證、小額發行到收益分配與到期償付，五個階段一目了然。
            </p>
          </Reveal>
          <Reveal delay={150} className="mt-8">
            <JourneyRing />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold">RWA Token 化，實際差在哪裡？</h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              跟傳統私募發行相比，四個可驗證的具體效益。
            </p>
          </Reveal>
          <Reveal
            delay={100}
            className="mt-8 grid gap-4 sm:grid-cols-2"
          >
            {TECH_VALUE_STATS.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border p-5">
                <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="mt-3 text-xs text-foreground/50">
                  <span className="font-medium text-foreground/70">傳統模式：</span>
                  {stat.before}
                </p>
                <p className="mt-2 text-xs text-brand-strong">
                  <span className="font-medium">RWA Token 化：</span>
                  {stat.after}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold">信任與透明機制</h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              費率如何計算、跟其他募資平台有什麼不同、怎麼防止過去 RWA／募資詐騙案重演。
            </p>
          </Reveal>
          <Reveal
            delay={100}
            className="mt-8 grid gap-6 sm:grid-cols-3"
          >
            {TRUST_CARDS.map((card) => (
              <div key={card.title} className="rounded-lg border border-border bg-surface p-5">
                <h3 className="font-display font-semibold text-foreground">{card.title}</h3>
                <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-foreground/60">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-semibold">AI Agent 自動化交易</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/50">
                Devnet 示範
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">
              RWA 債權的結算、收益分配與買回皆有明確規則，AI Agent
              可協助追蹤標的狀態，在授權範圍內執行領取與交割。
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
              瀏覽可認購的債權標的，掌握每一筆資金流向與收益分配進度。
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/campaigns"
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-accent-strong active:scale-95"
              >
                瀏覽投資標的
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
