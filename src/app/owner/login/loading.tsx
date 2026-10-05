import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card rounded-none p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-none" />
          <Skeleton className="h-4 w-40 rounded-none" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20 rounded-none" />
          <Skeleton className="h-12 w-full rounded-none" />
        </div>
        <Skeleton className="h-12 w-full rounded-none" />
      </div>
    </div>
  );
}
