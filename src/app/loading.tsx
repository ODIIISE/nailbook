import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen" role="status" aria-label="در حال بارگذاری">
      {/* Header skeleton */}
      <div className="h-14 px-4 flex items-center justify-between">
        <Skeleton className="h-6 w-6 rounded-lg" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-6 rounded-lg" />
      </div>

      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        {/* Highlights skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-full shrink-0" />
          ))}
        </div>

        {/* Hero skeleton */}
        <div className="text-center space-y-3 py-4">
          <Skeleton className="w-[72px] h-[72px] rounded-[22px] mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-20 w-full rounded-[20px]" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>

        {/* Services skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl border border-border/50">
              <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
