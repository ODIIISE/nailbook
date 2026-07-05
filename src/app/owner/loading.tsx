export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Calendar skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="shrink-0 w-[64px] h-[80px] bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
      {/* Action buttons skeleton */}
      <div className="flex gap-2">
        <div className="flex-1 h-11 bg-muted rounded-xl animate-pulse" />
        <div className="flex-1 h-11 bg-muted rounded-xl animate-pulse" />
      </div>
      {/* Stats skeleton */}
      <div className="p-4 bg-muted/30 rounded-2xl">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <div className="h-3 w-12 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Timeline skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
