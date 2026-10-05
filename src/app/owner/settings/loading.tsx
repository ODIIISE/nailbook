import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-6">
      <div className="p-5 bg-muted/30 rounded-none">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 rounded-none" />
            <Skeleton className="h-3 w-20 rounded-none" />
          </div>
        </div>
      </div>
      <div className="p-5 bg-muted/30 rounded-none space-y-4">
        <Skeleton className="h-5 w-28 rounded-none" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20 rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-none" />
    </div>
  );
}
