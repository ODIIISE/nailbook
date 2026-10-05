import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Calendar skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="shrink-0 w-[64px] h-[80px] rounded-none" />
        ))}
      </div>
      {/* Action buttons skeleton */}
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-11 rounded-none" />
        <Skeleton className="flex-1 h-11 rounded-none" />
      </div>
      {/* Stats skeleton */}
      <div className="p-4 bg-muted/30 rounded-none">
        <Skeleton className="h-4 w-24 rounded-none mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-3 w-12 rounded-none mx-auto" />
              <Skeleton className="h-5 w-16 rounded-none mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Timeline skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-none" />
        ))}
      </div>
    </div>
  );
}
