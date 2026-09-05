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
        <h1 className="font-display text-3xl font-bold tracking-tight">探索 RWA 債權標的</h1>
        <p className="mt-2 text-sm text-foreground/60">
          目前共有 {allCampaigns.length} 個可查看標的，依產業、資金用途與風險選擇投資機會。
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/campaigns">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋標的名稱、產業或資金用途"
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
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">目前沒有符合條件的投資標的</p>
          <p className="mt-1 text-sm text-foreground/50">
            可調整關鍵字或產業分類，查看其他債權發行機會。
          </p>
        </div>
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
