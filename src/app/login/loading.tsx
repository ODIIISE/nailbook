export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center gap-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="h-14 w-14 bg-muted rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
