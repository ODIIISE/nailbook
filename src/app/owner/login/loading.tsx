import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
