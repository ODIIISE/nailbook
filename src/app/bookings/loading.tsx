import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center">
          <Skeleton className="h-5 w-28 rounded" />
        </div>
      </div>
      <div className="px-4 pt-6 pb-24">
        <div className="mx-auto max-w-lg space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24 rounded mb-2" />
              <div className="glass rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20 rounded" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
