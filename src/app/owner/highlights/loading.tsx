export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-9 w-20 bg-muted rounded-xl animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl">
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
