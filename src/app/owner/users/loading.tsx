import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28 rounded-none" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-none" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-none">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-none" />
              <Skeleton className="h-3 w-24 rounded-none" />
            </div>
            <Skeleton className="h-8 w-8 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
