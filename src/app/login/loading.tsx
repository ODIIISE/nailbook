import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
