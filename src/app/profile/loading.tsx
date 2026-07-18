import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center">
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <div className="glass rounded-2xl p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
