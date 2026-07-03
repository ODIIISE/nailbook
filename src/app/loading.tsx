export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 py-6 space-y-6">
        <div className="mx-auto max-w-lg">
          {/* Highlights skeleton */}
          <div className="flex gap-4 justify-center mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-[68px] h-[68px] rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Hero skeleton */}
          <div className="text-center space-y-4 mb-6">
            <div className="mx-auto h-16 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-7 w-48 bg-muted rounded mx-auto animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
            <div className="h-12 w-full bg-muted rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
