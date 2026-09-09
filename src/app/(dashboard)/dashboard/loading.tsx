import { Skeleton } from "@/components/ui/skeleton";

// Mirrors DashboardView's real layout (header → KPI row → filter rail + chart
// grid) so the fallback doesn't reflow into a different shape once data lands.
export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-xl" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[420px] rounded-xl lg:block" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[420px] rounded-xl md:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl md:col-span-2 xl:col-span-3" />
        </div>
      </div>
    </div>
  );
}
