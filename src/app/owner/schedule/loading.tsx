import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
