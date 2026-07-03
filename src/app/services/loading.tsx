export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-3">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-60 bg-muted rounded animate-pulse" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
