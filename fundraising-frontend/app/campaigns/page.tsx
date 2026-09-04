import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { CATEGORY_LABELS, listCampaigns } from "@/lib/campaigns";
import type { CampaignCategory } from "@/lib/types";

const CATEGORY_ORDER: CampaignCategory[] = [
  "agriculture",
  "startup",
  "lifestyle",
  "tech",
  "food",
  "design",
];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const allCampaigns = await listCampaigns();
  const campaigns = allCampaigns.filter((campaign) => {
    const matchesCategory = !category || campaign.category === category;
    const matchesQuery =
      !query ||
      campaign.title.toLowerCase().includes(query) ||
      campaign.summary.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">探索募資專案</h1>
        <p className="mt-2 text-sm text-foreground/60">
          目前共有 {allCampaigns.length} 個進行中的專案，找一個你想支持的計畫吧。
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/campaigns">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋專案名稱或簡介"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-brand/50"
        >
          搜尋
        </button>
      </form>

      <div className="mb-10 flex flex-wrap gap-2">
        <FilterLink label="全部" active={!category} query={q} />
        {CATEGORY_ORDER.map((value) => (
          <FilterLink
            key={value}
            label={CATEGORY_LABELS[value]}
            active={category === value}
            category={value}
            query={q}
          />
        ))}
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-foreground/50">
          找不到符合條件的專案，換個關鍵字或分類看看。
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  label,
  active,
  category,
  query,
}: {
  label: string;
  active: boolean;
  category?: CampaignCategory;
  query?: string;
}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  const href = params.toString() ? `/campaigns?${params.toString()}` : "/campaigns";

  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-brand bg-brand-soft text-brand-strong"
          : "border-border text-foreground/70 hover:border-brand/50"
      }`}
    >
      {label}
    </Link>
  );
}
