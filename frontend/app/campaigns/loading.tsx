import { CampaignCardSkeleton, Skeleton } from "@/components/skeleton";

export default function CampaignsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="mb-6 h-10 w-full max-w-md" />

      <div className="mb-10 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
