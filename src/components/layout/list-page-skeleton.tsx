import { Skeleton } from "@/components/ui/skeleton";

// Shared route-level loading state for list pages (heading → toolbar →
// table rows) so navigation never sits on the previous page with no feedback.
export function ListPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
