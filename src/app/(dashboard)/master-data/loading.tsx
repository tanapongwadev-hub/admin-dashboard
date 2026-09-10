import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="@container flex flex-col gap-5">
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-2 @min-[56rem]:grid-cols-3 @min-[72rem]:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
