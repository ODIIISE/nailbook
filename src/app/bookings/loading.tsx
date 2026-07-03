export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center">
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 pt-6 pb-24">
        <div className="mx-auto max-w-lg space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="glass rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
