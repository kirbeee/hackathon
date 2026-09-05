import { CATEGORY_LABELS } from "@/lib/campaigns";
import type { CampaignCategory } from "@/lib/types";

export function CategoryPill({ category }: { category: CampaignCategory }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
      {CATEGORY_LABELS[category]}
    </span>
  );
}
