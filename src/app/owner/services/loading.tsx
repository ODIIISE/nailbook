import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-none" />
        <Skeleton className="h-9 w-24 rounded-none" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-muted/30 rounded-none space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded-none" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 rounded-none" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-4 w-24 rounded-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
