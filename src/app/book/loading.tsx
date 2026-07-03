export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center gap-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Calendar skeleton */}
        <div className="flex gap-2.5 overflow-hidden px-5">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="shrink-0 w-[72px] h-[90px] bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
        {/* Time slots skeleton */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
